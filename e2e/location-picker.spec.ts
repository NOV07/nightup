/**
 * Spot location: link -> pin on the map, at 390px (iPhone 13, touch).
 * /api/maps/resolve is intercepted with canned answers, except the one live
 * smoke test (Link 3). Needs a running dev server and .env.local.
 *
 *   npx playwright test e2e/location-picker.spec.ts
 *   SCREENSHOT_DIR=<dir> npx playwright test ...      # where screenshots go
 *
 * Seeds throwaway "+deltest-" accounts and spots with the service role key
 * and does NOT delete them: they are printed and saved to TEST_CREDS_FILE
 * (default: OS temp dir) so reruns reuse them. Real accounts are never used.
 */
import { test, expect, type Page, type BrowserContext } from '@playwright/test'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { randomBytes } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

const env: Record<string, string> = {
  ...Object.fromEntries(readFileSync(resolve(__dirname, '..', '.env.local'), 'utf8').split(/\r?\n/).flatMap(l => {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    return m ? [[m[1], m[2].replace(/^["']|["']$/g, '')]] : []
  })),
  ...(process.env as Record<string, string>),
}
const SB_URL = env.NEXT_PUBLIC_SUPABASE_URL, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const sb = createClient(SB_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const CREDS_FILE = env.TEST_CREDS_FILE || join(tmpdir(), 'location-picker-test-accounts.json')
const SHOTS = env.SCREENSHOT_DIR || 'test-results/screens'
mkdirSync(SHOTS, { recursive: true })

const LINK1 = 'https://maps.app.goo.gl/1wk9aEsShzbEcEfb7'
const LINK3 = 'https://maps.app.goo.gl/5uB215aGnKZxH6eZ6'
const CONTROL = 'https://maps.app.goo.gl/4A1zptjKzYvK26Nk7'
const EGALEO = { lat: 37.9851034, lng: 23.6707159 }
const CANNED: Record<string, { status: number; body: object }> = {
  [LINK1]: { status: 422, body: { error: 'no_coords' } },
  [LINK3]: { status: 200, body: {
    ...EGALEO, source: 'nominatim', placeText: 'Veaki 25, Egaleo 122 44', precision: 'street',
    finalUrl: 'https://www.google.com/maps/place/Veaki+25,+Egaleo+122+44/data=!4m2!3m1!1s0x14a1bca1ba2f45ef:0x355dce829e87d3db',
  } },
  [CONTROL]: { status: 200, body: {
    lat: 37.9834959, lng: 23.6699333, source: 'url',
    finalUrl: 'https://www.google.com/maps/place/37.983496,23.669933/data=!3d37.9834959!4d23.6699333',
  } },
}
const COVER = 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800'

// ── Throwaway accounts ────────────────────────────────────────────────────
interface Acct { id: string; email: string; password: string; spotId?: string }
type SpotKind = 'none' | 'with-coords' | 'no-coords'

async function account(role: string, kind: SpotKind): Promise<Acct> {
  const saved = existsSync(CREDS_FILE) ? JSON.parse(readFileSync(CREDS_FILE, 'utf8')) : {}
  if (saved[role]) return saved[role]
  const ts = Date.now()
  const email = `dkantanoleon+deltest-map-${role}-${ts}@gmail.com`
  const password = `Dt-${randomBytes(9).toString('base64url')}!9`
  const { data, error } = await sb.auth.admin.createUser({ email, password, email_confirm: true })
  if (error) throw new Error(`createUser: ${error.message}`)
  const { error: pe } = await sb.from('profiles').upsert({
    id: data.user.id, username: `deltest_map_${role}_${ts}`, display_name: `Deltest map ${role}`, profile_type: 'spot',
  })
  if (pe) throw new Error(`profile: ${pe.message}`)
  const acct: Acct = { id: data.user.id, email, password }
  if (kind !== 'none') {
    const { data: spot, error: se } = await sb.from('spots').insert({
      name: `deltest map ${role} ${ts}`, slug: `deltest-map-${role}-${ts}`, category: 'drink', city: 'Athens',
      address: 'Βεάκη 25, Αιγάλεω', description: 'deltest', cover_image: COVER, owner_id: data.user.id,
      is_published: false, ...(kind === 'with-coords' ? EGALEO : { lat: null, lng: null }),
    }).select('id').single()
    if (se) throw new Error(`spot: ${se.message}`)
    acct.spotId = spot.id
  }
  writeFileSync(CREDS_FILE, JSON.stringify({ ...saved, [role]: acct }, null, 2))
  return acct
}

async function signIn(context: BrowserContext, acct: Acct, baseURL: string) {
  const jar = new Map<string, string>()
  const client = createServerClient(SB_URL, ANON, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: list => list.forEach(({ name, value }) => (value ? jar.set(name, value) : jar.delete(name))),
    },
  })
  const { error } = await client.auth.signInWithPassword({ email: acct.email, password: acct.password })
  if (error) throw new Error(`sign-in: ${error.message}`)
  await context.addCookies([...jar].map(([name, value]) => ({ name, value, url: baseURL })))
}

/** EWKB hex (little endian, SRID flag) -> lat/lng. */
function decodeGeo(hex: string | null) {
  if (!hex) return null
  const b = Buffer.from(hex, 'hex')
  const off = 5 + ((b.readUInt32LE(1) & 0x20000000) !== 0 ? 4 : 0)
  return { lng: b.readDoubleLE(off), lat: b.readDoubleLE(off + 8) }
}

async function spotRow(id: string) {
  const { data, error } = await sb.from('spots').select('lat, lng, geo, description').eq('id', id).single()
  if (error) throw new Error(error.message)
  return { ...data, geo: decodeGeo(data.geo as string | null) }
}

// ── Page helpers ──────────────────────────────────────────────────────────
const nextBtn = (p: Page) => p.getByTestId('wizard-next')
const picker = (p: Page) => p.getByTestId('location-picker')
const marker = (p: Page) => p.locator('.leaflet-marker-icon')

async function mockResolve(page: Page) {
  const calls: string[] = []
  await page.route('**/api/maps/resolve', async route => {
    const url = JSON.parse(route.request().postData() || '{}').url as string
    calls.push(url)
    const canned = CANNED[url] ?? { status: 422, body: { error: 'no_coords' } }
    await route.fulfill({ status: canned.status, json: canned.body })
  })
  return calls
}

async function toLocationStep(page: Page) {
  await page.goto('/dashboard/spots/new')
  await page.getByRole('button', { name: /Ποτό/ }).click()
  await page.getByPlaceholder('π.χ. Κήπος Rooftop').fill('Deltest map bar')
  await nextBtn(page).click()
  await expect(picker(page)).toBeVisible()
  await page.locator('select').first().selectOption('Athens')
  await page.getByPlaceholder('π.χ. Φαλήρου 22, Αθήνα 117 42').fill('Βεάκη 25, Αιγάλεω')
}

const linkInput = (p: Page) => p.getByPlaceholder(/maps\.app\.goo\.gl/)
async function coordsText(page: Page) {
  const s = (await page.getByTestId('map-coords').textContent()) ?? ''
  const m = s.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/)
  if (!m) throw new Error(`no coords in "${s}"`)
  return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) }
}

/** Saves the edit wizard and fails with the API's own message if the PATCH is refused. */
async function submitEdit(page: Page) {
  const [res] = await Promise.all([
    page.waitForResponse(r => /^\/api\/spots\/[^/]+$/.test(new URL(r.url()).pathname) && r.request().method() === 'PATCH'),
    page.getByTestId('wizard-submit').click(),
  ])
  expect(res.status(), await res.text()).toBe(200)
  await page.waitForURL(/\/dashboard\?saved=spot/)
}

async function dragMarker(page: Page, dx: number, dy: number) {
  const box = await marker(page).boundingBox()
  if (!box) throw new Error('no marker')
  const x = box.x + box.width / 2, y = box.y + box.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + dx / 2, y + dy / 2, { steps: 5 })
  await page.mouse.move(x + dx, y + dy, { steps: 5 })
  await page.mouse.up()
}

// ── Tests ─────────────────────────────────────────────────────────────────
let NEW: Acct, EDIT: Acct, OLD: Acct
test.beforeAll(async () => {
  NEW = await account('new', 'none')
  EDIT = await account('edit', 'with-coords')
  OLD = await account('old', 'no-coords')
})
test.afterAll(() => {
  console.log(`\nThrowaway accounts (not deleted), creds file: ${CREDS_FILE}`)
  for (const [role, a] of Object.entries(JSON.parse(readFileSync(CREDS_FILE, 'utf8')) as Record<string, Acct>)) {
    console.log(`  ${role}: ${a.email}${a.spotId ? `  spot ${a.spotId}` : ''}`)
  }
})

test.describe('new spot wizard (mocked resolve)', () => {
  test.beforeEach(async ({ context, baseURL }) => { await signIn(context, NEW, baseURL!) })

  test('(α) Link 1 -> no_coords -> manual pin unlocks Continue', async ({ page }) => {
    const calls = await mockResolve(page)
    await toLocationStep(page)
    await linkInput(page).fill(LINK1)
    await expect(page.getByTestId('map-not-found')).toBeVisible()
    await expect(page.getByTestId('map-not-found')).toContainText('Δεν βρήκαμε το σημείο')
    await expect(marker(page)).toHaveCount(0)
    await expect(nextBtn(page)).toHaveAttribute('aria-disabled', 'true')
    await page.screenshot({ path: join(SHOTS, '2-not-found.png'), fullPage: true })

    await nextBtn(page).click({ force: true }) // dimmed, but a tap still explains why
    await expect(page.getByText('Βάλε καρφίτσα στον χάρτη')).toBeVisible()
    // The failed link is not re-checked on blur/Continue (that shifted the button mid-tap).
    expect(calls).toEqual([LINK1])
    await expect(picker(page)).toBeVisible() // still on step 2

    await picker(page).click({ position: { x: 220, y: 120 } })
    await expect(marker(page)).toHaveCount(1)
    await expect(page.getByTestId('map-not-found')).toHaveCount(0)
    await expect(nextBtn(page)).toHaveAttribute('aria-disabled', 'false')
    const c = await coordsText(page)
    expect(Math.abs(c.lat - 37.9838)).toBeLessThan(0.1) // around the Athens default centre
    await nextBtn(page).click()
    await expect(picker(page)).toHaveCount(0) // moved on to step 3
  })

  test('(β) Link 3 -> nominatim/street -> Continue dimmed until the pin is touched', async ({ page }) => {
    const calls = await mockResolve(page)
    await toLocationStep(page)
    await linkInput(page).fill(LINK3)
    const card = page.getByTestId('map-nominatim-card')
    await expect(card).toBeVisible()
    await expect(card).toContainText('Από το link σου:')
    await expect(card).toContainText('Veaki 25, Egaleo 122 44')
    await expect(card).toContainText('Βρήκαμε τον δρόμο, όχι τον ακριβή αριθμό. Σύρε την καρφίτσα πάνω στο μαγαζί.')
    await expect(card).not.toContainText('Δεν μπορέσαμε να επιβεβαιώσουμε')
    await expect(marker(page)).toHaveCount(1)
    expect(await coordsText(page)).toEqual({ lat: 37.985103, lng: 23.670716 })
    await expect(nextBtn(page)).toHaveAttribute('aria-disabled', 'true')
    await page.screenshot({ path: join(SHOTS, '1-found-nominatim.png'), fullPage: true })

    await nextBtn(page).click({ force: true })
    await expect(page.getByText('Σύρε την καρφίτσα ή πάτα στον χάρτη για να επιβεβαιώσεις το σημείο.')).toBeVisible()
    await expect(picker(page)).toBeVisible()

    await dragMarker(page, 40, 25)
    await expect(nextBtn(page)).toHaveAttribute('aria-disabled', 'false')
    const moved = await coordsText(page)
    expect(moved).not.toEqual({ lat: 37.985103, lng: 23.670716 })
    // Editing other fields does not re-resolve or move the pin.
    await page.getByPlaceholder('π.χ. Κουκάκι').fill('Περιστέρι')
    expect(await coordsText(page)).toEqual(moved)
    expect(calls).toEqual([LINK3])
    await page.screenshot({ path: join(SHOTS, '1b-found-after-drag.png'), fullPage: true })
    await nextBtn(page).click()
    await expect(picker(page)).toHaveCount(0)
  })

  test('(β2) unverified result shows the area warning', async ({ page }) => {
    await page.route('**/api/maps/resolve', r => r.fulfill({ json: { ...(CANNED[LINK3].body as object), unverified: true } }))
    await toLocationStep(page)
    await linkInput(page).fill(LINK3)
    await expect(page.getByTestId('map-nominatim-card')).toContainText('Δεν μπορέσαμε να επιβεβαιώσουμε την περιοχή. Έλεγξε ότι είναι σωστή.')
  })

  test('(γ) control -> url -> Continue open at once', async ({ page }) => {
    await mockResolve(page)
    await toLocationStep(page)
    await linkInput(page).fill(CONTROL)
    await expect(marker(page)).toHaveCount(1)
    await expect(page.getByTestId('map-nominatim-card')).toHaveCount(0)
    expect(await coordsText(page)).toEqual({ lat: 37.983496, lng: 23.669933 })
    await expect(nextBtn(page)).toHaveAttribute('aria-disabled', 'false')
    await nextBtn(page).click()
    await expect(picker(page)).toHaveCount(0)
  })

  test('(v) full browser link: pin on the place (!3d!4d), not the viewport (@); no resolve call', async ({ page }) => {
    const calls = await mockResolve(page)
    await toLocationStep(page)
    await linkInput(page).fill('https://www.google.com/maps/place/%CE%9F%CF%85%CE%BB%CE%B1%CE%BB%CE%BF%CF%8D%CE%BC/@37.9232618,23.7523985,17z/data=!3m2!4b1!5s0x14a1bdf3d0d1957f:0xa114b011b6d0e23e!4m6!3m5!1s0x14a1bdcdce193e11:0x47a779e326a34809!8m2!3d37.9232576!4d23.7549734!16s%2Fg%2F11h5rrb_2j?entry=ttu')
    await expect(page.getByTestId('map-coords')).toHaveText(/37\.923258, 23\.754973/)
    await expect(page.getByTestId('map-viewport-card')).toHaveCount(0)
    await expect(nextBtn(page)).toHaveAttribute('aria-disabled', 'false') // exact: open at once
    expect(calls).toEqual([])
  })

  test('(v2) link with only @: viewport notice, Continue dimmed until the pin is touched', async ({ page }) => {
    const calls = await mockResolve(page)
    await toLocationStep(page)
    await linkInput(page).fill('https://www.google.com/maps/@37.9232618,23.7523985,17z?entry=ttu')
    await expect(page.getByTestId('map-coords')).toHaveText(/37\.923262, 23\.752399/)
    await expect(page.getByTestId('map-viewport-card')).toHaveText(
      'Το link δείχνει το κέντρο του χάρτη που είχες, όχι το ακριβές μέρος. Σύρε την καρφίτσα πάνω στο μαγαζί.')
    await expect(nextBtn(page)).toHaveAttribute('aria-disabled', 'true')
    await nextBtn(page).click({ force: true })
    await expect(page.getByText('Σύρε την καρφίτσα ή πάτα στον χάρτη για να επιβεβαιώσεις το σημείο.')).toBeVisible()
    await picker(page).click({ position: { x: 230, y: 150 } })
    await expect(nextBtn(page)).toHaveAttribute('aria-disabled', 'false')
    expect(calls).toEqual([])
  })

  test('(ζ) 390px: a one-finger swipe on the map scrolls the page', async ({ page }) => {
    await mockResolve(page)
    await toLocationStep(page)
    await linkInput(page).fill(CONTROL)
    await expect(marker(page)).toHaveCount(1)
    await expect(page.getByText('Με δύο δάχτυλα μετακινείς τον χάρτη.')).toBeVisible()
    const before = await coordsText(page)
    const cdp = await page.context().newCDPSession(page)
    // A real one-finger swipe: touchStart, a run of touchMoves upwards, touchEnd.
    const swipeUp = async (x: number, y: number) => {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
      for (let i = 1; i <= 12; i++) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - i * 20 }] })
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
      await page.waitForTimeout(500)
    }
    // Put the map in the middle of the screen, with page left to scroll below it.
    const centerMap = async () => {
      await page.evaluate(() => {
        const el = document.querySelector('[data-testid="location-picker"]')!
        const r = el.getBoundingClientRect()
        window.scrollBy(0, r.top - (window.innerHeight - r.height) / 2)
      })
      return (await picker(page).boundingBox())!
    }
    const metrics = () => page.evaluate(() => ({ y: Math.round(window.scrollY), max: document.documentElement.scrollHeight - window.innerHeight }))

    // Reference: the same swipe on the form text above the map.
    let box = await centerMap()
    const r0 = await metrics()
    await swipeUp(Math.round(box.x + box.width / 2), Math.round(box.y - 40))
    const r1 = await metrics()
    console.log(`       reference swipe off the map: scrollY ${r0.y} -> ${r1.y} (max ${r0.max})`)
    expect(r1.y, 'the synthetic swipe itself must scroll the page').toBeGreaterThan(r0.y + 100)

    box = await centerMap()
    const y0 = (await metrics()).y
    await page.screenshot({ path: join(SHOTS, '3-scroll-before.png') })
    // Start on empty map, away from the pin (centre) and the zoom buttons (top left).
    await swipeUp(Math.round(box.x + box.width * 0.8), Math.round(box.y + box.height * 0.8))
    const y1 = (await metrics()).y
    await page.screenshot({ path: join(SHOTS, '3-scroll-after.png') })
    console.log(`       swipe on the map: scrollY ${y0} -> ${y1}`)
    expect(y1).toBeGreaterThan(y0 + 100)
    expect(await coordsText(page)).toEqual(before) // the pin did not move
  })
})

test.describe('edit spot', () => {
  test('(δ) edit without moving the pin keeps the coordinates', async ({ page, context, baseURL }) => {
    await sb.from('spots').update({ ...EGALEO, description: 'deltest' }).eq('id', EDIT.spotId!)
    await signIn(context, EDIT, baseURL!)
    const calls = await mockResolve(page)
    await page.goto(`/dashboard/edit/spot/${EDIT.spotId}`)
    await nextBtn(page).click()
    await expect(picker(page)).toBeVisible()
    await expect(linkInput(page)).toHaveValue('') // no fake maps_url any more
    await expect(marker(page)).toHaveCount(1)
    expect(await coordsText(page)).toEqual({ lat: 37.985103, lng: 23.670716 })
    await expect(nextBtn(page)).toHaveAttribute('aria-disabled', 'false')
    await nextBtn(page).click()
    await nextBtn(page).click()
    await page.locator('textarea').fill('deltest edited (δ)')
    await submitEdit(page)
    const row = await spotRow(EDIT.spotId!)
    expect([row.lat, row.lng]).toEqual([EGALEO.lat, EGALEO.lng])
    expect(row.geo).toEqual({ lat: EGALEO.lat, lng: EGALEO.lng })
    expect(row.description).toBe('deltest edited (δ)')
    expect(calls).toEqual([])
  })

  test('(ε) edit with a dragged pin updates lat/lng and geo', async ({ page, context, baseURL }) => {
    await sb.from('spots').update(EGALEO).eq('id', EDIT.spotId!)
    await signIn(context, EDIT, baseURL!)
    await mockResolve(page)
    await page.goto(`/dashboard/edit/spot/${EDIT.spotId}`)
    await nextBtn(page).click()
    await expect(marker(page)).toHaveCount(1)
    await dragMarker(page, -50, 30)
    const moved = await coordsText(page)
    expect(moved).not.toEqual({ lat: 37.985103, lng: 23.670716 })
    await nextBtn(page).click()
    await nextBtn(page).click()
    await submitEdit(page)
    const row = await spotRow(EDIT.spotId!)
    expect([row.lat, row.lng]).toEqual([moved.lat, moved.lng])
    expect(row.geo!.lat).toBeCloseTo(moved.lat, 9)
    expect(row.geo!.lng).toBeCloseTo(moved.lng, 9)
    console.log(`       saved ${row.lat}, ${row.lng}; geo ${row.geo!.lat}, ${row.geo!.lng}`)
  })

  test('old spot without coordinates: empty map, pin required before saving', async ({ page, context, baseURL }) => {
    await sb.from('spots').update({ lat: null, lng: null }).eq('id', OLD.spotId!)
    await signIn(context, OLD, baseURL!)
    await page.goto(`/dashboard/edit/spot/${OLD.spotId}`)
    await nextBtn(page).click()
    await expect(picker(page)).toBeVisible()
    await expect(marker(page)).toHaveCount(0)
    await expect(nextBtn(page)).toHaveAttribute('aria-disabled', 'true')
    await nextBtn(page).click({ force: true })
    await expect(page.getByText('Βάλε καρφίτσα στον χάρτη')).toBeVisible()
    await picker(page).click({ position: { x: 200, y: 110 } })
    const c = await coordsText(page)
    await nextBtn(page).click()
    await nextBtn(page).click()
    await submitEdit(page)
    const row = await spotRow(OLD.spotId!)
    expect([row.lat, row.lng]).toEqual([c.lat, c.lng])
    expect(row.geo).not.toBeNull()
  })
})

test.describe('server validation', () => {
  test('PATCH /api/spots/[id] rejects null and invalid coordinates', async ({ page, context, baseURL }) => {
    await sb.from('spots').update(EGALEO).eq('id', EDIT.spotId!)
    await signIn(context, EDIT, baseURL!)
    for (const data of [
      { lat: null, lng: null }, { lat: null }, { lat: 37.9 }, { lat: '37.9', lng: 23.7 },
      { lat: 91, lng: 23.7 }, { lat: 37.9, lng: -181 }, { lat: Number.NaN, lng: 1 },
    ]) {
      const res = await page.request.patch(`/api/spots/${EDIT.spotId}`, { data })
      expect(res.status(), JSON.stringify(data)).toBe(400)
    }
    const row = await spotRow(EDIT.spotId!)
    expect([row.lat, row.lng]).toEqual([EGALEO.lat, EGALEO.lng])
    // Fields other than lat/lng still save without them.
    const ok = await page.request.patch(`/api/spots/${EDIT.spotId}`, { data: { description: 'deltest' } })
    expect(ok.status()).toBe(200)
  })

  test('POST /api/spots rejects missing and invalid coordinates', async ({ page, context, baseURL }) => {
    await signIn(context, NEW, baseURL!)
    for (const extra of [{}, { lat: null, lng: null }, { lat: '37.9', lng: '23.7' }, { lat: 37.9, lng: 200 }]) {
      const res = await page.request.post('/api/spots', { data: { name: 'deltest invalid', category: 'drink', ...extra } })
      expect(res.status(), JSON.stringify(extra)).toBe(400)
    }
    const { data } = await sb.from('spots').select('id').eq('owner_id', NEW.id)
    expect(data).toEqual([])
  })
})

// One test, one login: /api/admin/login allows 5 attempts per 15 minutes per IP.
test.describe('admin', () => {
  test('(στ) admin new spot without a pin does not go through; admin update rules', async ({ page }) => {
    const login = await page.request.post('/api/admin/login', { data: { password: env.ADMIN_PASSWORD } })
    expect(login.status(), 'admin login (429/401 here usually means the 5-per-15-min limit)').toBe(200)

    const adds: string[] = []
    page.on('request', r => { if (r.url().includes('/api/admin/add')) adds.push(r.url()) })
    await page.goto('/admin?tab=spots')
    await page.getByRole('button', { name: '+ Add New' }).click()
    await expect(page.getByTestId('admin-add-spot-map')).toBeVisible()
    await page.locator('form input[required]').first().fill('deltest admin no pin')
    await page.getByRole('button', { name: 'Add Spot' }).click()
    await expect(page.getByText('Βάλε καρφίτσα στον χάρτη')).toBeVisible()
    expect(adds).toEqual([])

    // The API refuses it too, before any insert.
    for (const extra of [{}, { lat: null, lng: null }, { lat: 'x', lng: 23.7 }]) {
      const res = await page.request.post('/api/admin/add', { data: { table: 'spots', data: { name: 'deltest admin no pin', ...extra } } })
      expect(res.status(), JSON.stringify(extra)).toBe(400)
    }
    const { data } = await sb.from('spots').select('id').eq('name', 'deltest admin no pin')
    expect(data).toEqual([])

    // Admin edit: partial or invalid coordinates are refused; both null (old
    // spot, no pin yet) is allowed so other fields can still be saved.
    await sb.from('spots').update({ lat: null, lng: null }).eq('id', OLD.spotId!)
    for (const data of [{ lat: 37.9 }, { lat: 37.9, lng: null }, { lat: 95, lng: 23 }]) {
      const res = await page.request.post('/api/admin/update', { data: { table: 'spots', id: OLD.spotId, data } })
      expect(res.status(), JSON.stringify(data)).toBe(400)
    }
    const ok = await page.request.post('/api/admin/update', { data: { table: 'spots', id: OLD.spotId, data: { lat: null, lng: null, description: 'deltest' } } })
    expect(ok.status()).toBe(200)
  })
})

test.describe('live', () => {
  test('smoke: real Link 3 through the real resolve route', async ({ page, context, baseURL }) => {
    test.setTimeout(60_000)
    await signIn(context, NEW, baseURL!)
    await toLocationStep(page)
    await linkInput(page).fill(LINK3)
    const card = page.getByTestId('map-nominatim-card')
    await expect(card).toBeVisible({ timeout: 30_000 })
    await expect(card).toContainText('Veaki 25, Egaleo 122 44')
    const c = await coordsText(page)
    expect(Math.abs(c.lat - EGALEO.lat)).toBeLessThan(0.01)
    expect(Math.abs(c.lng - EGALEO.lng)).toBeLessThan(0.01)
    await expect(nextBtn(page)).toHaveAttribute('aria-disabled', 'true')
    // Map tiles load under the CSP (img-src https://tile.openstreetmap.org).
    await expect(page.locator('.leaflet-tile-loaded').first()).toBeVisible({ timeout: 20_000 })
    await page.screenshot({ path: join(SHOTS, '4-live-link3.png'), fullPage: true })
  })
})
