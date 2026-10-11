/**
 * Admin "Add Spot": whitelisted insert, explicit is_published, unique slug,
 * errors shown in the form. Runs at 390px (config default) and on desktop.
 * Needs a running dev server and .env.local.
 *
 *   npx playwright test e2e/admin-add-spot.spec.ts
 *   SCREENSHOT_DIR=<dir> npx playwright test ...      # where screenshots go
 *
 * Every spot it creates is named "deltest-admin-add-<ts>…" and is deleted in
 * afterAll (a published one right after its /spots check). The shared DB is
 * live, so nothing is left behind, published or not.
 */
import { test, expect, type Page } from '@playwright/test'
import { readFileSync, mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const env: Record<string, string> = {
  ...Object.fromEntries(readFileSync(resolve(__dirname, '..', '.env.local'), 'utf8').split(/\r?\n/).flatMap(l => {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    return m ? [[m[1], m[2].replace(/^["']|["']$/g, '')]] : []
  })),
  ...(process.env as Record<string, string>),
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const SHOTS = env.SCREENSHOT_DIR || 'test-results/screens'
mkdirSync(SHOTS, { recursive: true })

const PREFIX = 'deltest-admin-add-'
const TS = Date.now()
const created: { name: string; slug: string; is_published: boolean }[] = []

/** EWKB hex (little endian, SRID flag) -> lat/lng. */
function decodeGeo(hex: string | null) {
  if (!hex) return null
  const b = Buffer.from(hex, 'hex')
  const off = 5 + ((b.readUInt32LE(1) & 0x20000000) !== 0 ? 4 : 0)
  return { lng: b.readDoubleLE(off), lat: b.readDoubleLE(off + 8) }
}

async function rowsNamed(name: string) {
  const { data, error } = await sb.from('spots')
    .select('id, name, slug, lat, lng, geo, is_published, owner_id, claimed_by_profile_id, category, subcategory')
    .eq('name', name)
  if (error) throw new Error(error.message)
  return data ?? []
}

async function deleteNamed(name: string) {
  const { error } = await sb.from('spots').delete().eq('name', name)
  if (error) throw new Error(`cleanup ${name}: ${error.message}`)
}

async function openAddForm(page: Page) {
  await page.goto('/admin?tab=spots')
  await page.getByRole('button', { name: '+ Add New' }).click()
  await expect(page.getByTestId('admin-add-spot-map')).toBeVisible()
}

async function fillSpot(page: Page, name: string, { pin = true, publish = false } = {}) {
  await page.locator('form input[required]').first().fill(name)
  await page.getByTestId('admin-spot-category').selectOption('drink')
  await page.getByTestId('admin-spot-subcategory').selectOption('cocktail bar')
  if (pin) {
    const map = page.getByTestId('admin-add-spot-map').getByTestId('location-picker')
    await map.scrollIntoViewIfNeeded()
    await map.click({ position: { x: 160, y: 110 } })
  }
  if (publish) await page.getByTestId('admin-spot-publish-now').check()
}

/** The coordinates printed under the map once a pin is placed. */
async function pinCoords(page: Page) {
  const text = await page.getByTestId('admin-add-spot-map').locator('p').last().innerText()
  const m = text.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/)
  if (!m) throw new Error(`no coordinates in "${text}"`)
  return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) }
}

async function submit(page: Page) {
  const [res] = await Promise.all([
    page.waitForResponse(r => r.url().includes('/api/admin/add')),
    page.getByRole('button', { name: 'Add Spot' }).click(),
  ])
  return res
}

function suite(label: string) {
  // One login per viewport: /api/admin/login allows 5 attempts per 15 minutes.
  test(`${label}: add spot (pending + published), duplicate slug, errors`, async ({ page }) => {
    test.setTimeout(180_000)
    const login = await page.request.post('/api/admin/login', { data: { password: env.ADMIN_PASSWORD } })
    expect(login.status(), 'admin login (429/401 usually means the 5-per-15-min limit)').toBe(200)

    const base = `${PREFIX}${TS}-${label}`

    // 1. Unticked "publish now": lands unpublished, no owner, pin stored.
    await openAddForm(page)
    await expect(page.getByTestId('admin-spot-publish-now')).not.toBeChecked()
    await expect(page.getByText('★ Nightup Editorial')).toHaveCount(0)
    await fillSpot(page, base)
    const coords = await pinCoords(page)
    await page.screenshot({ path: join(SHOTS, `${label}-1-form-filled.png`), fullPage: true })
    let res = await submit(page)
    expect(res.status(), await res.text()).toBe(200)
    created.push({ name: base, slug: base, is_published: false })
    await expect(page.getByText('Spot added to the pending queue.')).toBeVisible()

    let rows = await rowsNamed(base)
    expect(rows).toHaveLength(1)
    const r1 = rows[0]
    expect(r1.slug).toBe(base)
    expect(r1.is_published).toBe(false)
    expect(r1.owner_id).toBeNull()
    expect(r1.claimed_by_profile_id).toBeNull()
    expect(r1.category).toBe('drink')
    expect(r1.subcategory).toBe('cocktail bar')
    expect(Math.abs(r1.lat - coords.lat)).toBeLessThan(1e-5)
    expect(Math.abs(r1.lng - coords.lng)).toBeLessThan(1e-5)
    const geo = decodeGeo(r1.geo as string | null)
    expect(geo).not.toBeNull()
    expect(Math.abs(geo!.lat - r1.lat)).toBeLessThan(1e-9)
    expect(Math.abs(geo!.lng - r1.lng)).toBeLessThan(1e-9)
    // Not public: the local /spots must not list it.
    await page.goto('/spots')
    await expect(page.getByText(base, { exact: true })).toHaveCount(0)

    // 2. Same name again: the slug gets a suffix instead of a 500.
    await openAddForm(page)
    await fillSpot(page, base)
    res = await submit(page)
    expect(res.status(), await res.text()).toBe(200)
    rows = await rowsNamed(base)
    expect(rows.map(r => r.slug).sort()).toEqual([base, `${base}-2`])

    // 3. A server-side rejection reaches the form, and nothing is written.
    const bad = `${base}-badurl`
    await openAddForm(page)
    await fillSpot(page, bad)
    await page.getByPlaceholder('https://…').fill('not-a-url')
    res = await submit(page)
    expect(res.status()).toBe(400)
    await expect(page.getByTestId('admin-add-error')).toHaveText('cover_image must be an http(s) URL')
    await page.screenshot({ path: join(SHOTS, `${label}-2-server-error.png`), fullPage: true })
    expect(await rowsNamed(bad)).toHaveLength(0)

    // 4. No pin: refused in the form before any request.
    const nopin = `${base}-nopin`
    const adds: string[] = []
    page.on('request', r => { if (r.url().includes('/api/admin/add')) adds.push(r.url()) })
    await openAddForm(page)
    await fillSpot(page, nopin, { pin: false })
    await page.getByRole('button', { name: 'Add Spot' }).click()
    await expect(page.getByTestId('admin-add-error')).toBeVisible()
    await page.screenshot({ path: join(SHOTS, `${label}-3-no-pin.png`), fullPage: true })
    expect(adds).toEqual([])

    // 5. The API refuses the rest outright, with a clean message, no row.
    const valid = { name: `${base}-api`, category: 'drink', city: 'Athens', lat: 37.97, lng: 23.73, is_published: false }
    const cases: [string, Record<string, unknown>, RegExp][] = [
      ['no name', { ...valid, name: '' }, /Name is required/],
      ['no pin', { ...valid, lat: null, lng: null }, /Missing coordinates/],
      ['bad category', { ...valid, category: 'casino' }, /Category must be one of/],
      ['bad subcategory', { ...valid, subcategory: 'karaoke' }, /not in the list/],
      ['owner_id', { ...valid, owner_id: '00000000-0000-0000-0000-000000000000' }, /Unknown field.*owner_id/],
      ['status', { ...valid, status: 'approved' }, /Unknown field.*status/],
    ]
    for (const [what, data, msg] of cases) {
      const r = await page.request.post('/api/admin/add', { data: { table: 'spots', data } })
      expect(r.status(), what).toBe(400)
      const body = await r.json()
      expect(body.error, what).toMatch(msg)
    }
    expect(await rowsNamed(valid.name)).toHaveLength(0)
    expect(await rowsNamed('')).toHaveLength(0)

    // 6. Ticked "publish now": public on the local /spots, then deleted at once.
    const pub = `${base}-pub`
    await openAddForm(page)
    await fillSpot(page, pub, { publish: true })
    res = await submit(page)
    expect(res.status(), await res.text()).toBe(200)
    created.push({ name: pub, slug: pub, is_published: true })
    try {
      await expect(page.getByText('Spot added and published.')).toBeVisible()
      rows = await rowsNamed(pub)
      expect(rows).toHaveLength(1)
      expect(rows[0].is_published).toBe(true)
      expect(rows[0].owner_id).toBeNull()
      await page.goto('/spots')
      await expect(page.getByText(pub, { exact: true }).first()).toBeAttached()
      await page.goto(`/spots/${rows[0].slug}`)
      await expect(page.getByRole('heading', { name: pub })).toBeVisible()
    } finally {
      await deleteNamed(pub)
    }
    expect(await rowsNamed(pub)).toHaveLength(0)
  })
}

test.describe('mobile 390', () => {
  suite('m390')
})

test.describe('desktop', () => {
  test.use({ viewport: { width: 1366, height: 900 }, isMobile: false, hasTouch: false })
  suite('desk')
})

test.afterAll(async () => {
  const { data } = await sb.from('spots').select('name, slug, is_published').like('name', `${PREFIX}${TS}%`)
  console.log('test spots before cleanup:', JSON.stringify(data))
  const { error } = await sb.from('spots').delete().like('name', `${PREFIX}${TS}%`)
  if (error) throw new Error(`cleanup: ${error.message}`)
  const { data: left } = await sb.from('spots').select('id').like('name', `${PREFIX}${TS}%`)
  console.log(`test spots left after cleanup: ${left?.length ?? 'unknown'}`)
  console.log('created during run:', JSON.stringify(created))
})
