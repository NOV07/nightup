#!/usr/bin/env node
/**
 * End-to-end test for the follow / save system and the public counts. Runs
 * against the real Supabase project and a running dev server, using throwaway
 * accounts it creates and always removes.
 *
 *   npm run dev                                   # in another terminal
 *   node scripts/test-follow-system.mjs
 *
 * Env (from .env.local): NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
 * SUPABASE_SERVICE_ROLE_KEY. Optional: TEST_BASE_URL (default
 * http://localhost:3000), TEST_SCREENSHOT_DIR (default ./test-screenshots).
 *
 * Needs the migration 20261004000000_public_count_functions.sql on the project.
 * The browser part (UI) runs when playwright-core can load the installed
 * Chrome; otherwise it is skipped and says so.
 *
 * Safety: only accounts whose email contains "+followtest-" are ever created or
 * deleted. The real +user/+spot/+pro/+venue/+artist accounts and the profiles
 * ravar and motiva are never read for writing, changed or deleted.
 */

import { readFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomBytes } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function loadEnv() {
  const env = {}
  for (const line of readFileSync(resolve(ROOT, '.env.local'), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  return { ...env, ...process.env }
}

const env = loadEnv()
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY
const BASE = (env.TEST_BASE_URL || 'http://localhost:3000').replace(/\/$/, '')
const SHOTS = resolve(ROOT, env.TEST_SCREENSHOT_DIR || 'test-screenshots')

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) {
  console.error('Missing Supabase env vars in .env.local')
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
const TS = Date.now()
const THROWAWAY = '+followtest-'

// ── reporting ────────────────────────────────────────────────────────────────
const results = []
function check(name, ok, detail = '') {
  results.push({ name, ok: !!ok })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`)
}
const step = (s) => console.log(`\n── ${s}`)

async function must(promise, what) {
  const { data, error } = await promise
  if (error) throw new Error(`${what}: ${error.message}`)
  return data
}

const created = [] // { id, email } of every throwaway auth user
const createdIds = { events: [], spots: [] }
let browser = null
let currentPage = null

async function createAccount(role, profileType) {
  const email = `dkantanoleon${THROWAWAY}${role}-${TS}@gmail.com`
  const password = `Ft-${randomBytes(9).toString('base64url')}!9`
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (error) throw new Error(`createUser ${role}: ${error.message}`)
  const id = data.user.id
  created.push({ id, email })
  const username = `followtest_${role}_${TS}`
  await must(admin.from('profiles').upsert({
    id, username, display_name: `Followtest ${role}`, profile_type: profileType,
  }), `profile ${role}`)
  return { id, email, password, username }
}

/** Removes a throwaway account however far the test got. Refuses anything
 *  that is not a +followtest- address. */
async function destroy({ id, email }) {
  if (!email.includes(THROWAWAY)) throw new Error(`refusing to clean up non-throwaway ${email}`)
  const { data: authUser } = await admin.auth.admin.getUserById(id)
  if (authUser?.user && authUser.user.email !== email) throw new Error(`id/email mismatch for ${email}`)
  await admin.rpc('delete_account', { target: id })
  if (authUser?.user) await admin.auth.admin.deleteUser(id)
}

/** Real route, session cookies minted with @supabase/ssr. */
async function cookieSession(acct) {
  const jar = new Map()
  const client = createServerClient(SUPABASE_URL, ANON_KEY, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (list) => list.forEach(({ name, value }) => (value ? jar.set(name, value) : jar.delete(name))),
    },
  })
  const { error } = await client.auth.signInWithPassword({ email: acct.email, password: acct.password })
  if (error) throw new Error(`cookie sign-in ${acct.email}: ${error.message}`)
  const cookie = [...jar].map(([n, v]) => `${n}=${v}`).join('; ')
  return {
    client,
    async call(method, path, body) {
      const res = await fetch(`${BASE}${path}`, {
        method, headers: { cookie, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined,
      })
      let json = null
      try { json = await res.json() } catch {}
      return { status: res.status, body: json }
    },
  }
}

async function loadPlaywright() {
  try {
    const mod = await import('playwright-core')
    return mod.chromium ?? mod.default?.chromium
  } catch {
    return null
  }
}

async function signIn(page, acct) {
  currentPage = page
  await page.goto(`${BASE}/sign-in`)
  await page.getByPlaceholder('Email', { exact: true }).fill(acct.email)
  const pw = page.getByPlaceholder('Password', { exact: true })
  await pw.fill(acct.password)
  await pw.press('Enter')
  await page.waitForURL(/\/dashboard/, { timeout: 30000 })
}

const shot = (page, name) => page.screenshot({ path: resolve(SHOTS, name), fullPage: true })

// ── main ─────────────────────────────────────────────────────────────────────
async function main() {
  try {
    const r = await fetch(BASE, { cache: 'no-store' })
    if (!r.ok) throw new Error(String(r.status))
  } catch (e) {
    throw new Error(`Dev server not reachable at ${BASE} (${e.message}). Start it with npm run dev.`)
  }
  mkdirSync(SHOTS, { recursive: true })

  // ── 1. setup ──
  step('1. Create throwaway accounts and content')
  const A = await createAccount('usera', 'user')
  const Bu = await createAccount('userb', 'user')
  const artist = await createAccount('artist', 'artist')
  const organizer = await createAccount('organizer', 'organizer')
  const spotP = await createAccount('spot', 'spot')
  const pro = await createAccount('pro', 'professional')
  const claimer = await createAccount('claimer', 'spot')

  const future = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10)
  const event = await must(admin.from('events').insert({
    title: `Followtest Event ${TS}`, date: future, time: '23:00', venue: 'Followtest', city: 'Αθήνα',
    status: 'approved', profile_id: organizer.id,
  }).select('id').single(), 'event')
  createdIds.events.push(event.id)
  const spot = await must(admin.from('spots').insert({
    name: `Followtest Spot ${TS}`, slug: `followtest-spot-${TS}`, category: 'nightlife', city: 'Αθήνα',
    lat: 37.98, lng: 23.72, owner_id: spotP.id, is_published: true,
  }).select('id, slug').single(), 'spot')
  createdIds.spots.push(spot.id)
  // A spot owned through the older claim flow (claimed_by_profile_id only).
  const claimedSpot = await must(admin.from('spots').insert({
    name: `Followtest Claimed ${TS}`, slug: `followtest-claimed-${TS}`, category: 'drink', city: 'Αθήνα',
    lat: 37.97, lng: 23.73, claimed_by_profile_id: claimer.id, is_published: true,
  }).select('id, slug').single(), 'claimed spot')
  createdIds.spots.push(claimedSpot.id)
  console.log(`event=${event.id} spot=${spot.id} claimedSpot=${claimedSpot.id}`)

  const sA = await cookieSession(A)
  const sB = await cookieSession(Bu)

  // ── 2. actions ──
  step('2. A follows artist, organizer, professional and saves event + spot; B follows the artist')
  for (const target of [artist, organizer, pro]) {
    const res = await sA.call('POST', '/api/follows', { profile_id: target.id })
    check(`A follows ${target.username}`, res.status === 200, `status ${res.status}`)
  }
  check('A saves the event', (await sA.call('POST', '/api/saved/events', { event_id: event.id })).status === 200)
  check('A saves the spot', (await sA.call('POST', '/api/saved/spots', { spot_id: String(spot.id) })).status === 200)
  check('B follows the artist', (await sB.call('POST', '/api/follows', { profile_id: artist.id })).status === 200)

  // ── 3. counts ──
  step('3. Counts read by an account that is not the follower (B), and by an anonymous visitor')
  const countOf = async (session, path) => (await session.call('GET', path)).body?.count
  const anon = { call: (m, p) => fetch(`${BASE}${p}`, { method: m }).then(async r => ({ status: r.status, body: await r.json().catch(() => null) })) }
  const want = [
    ['artist followers = 2', `/api/follows?profile_id=${artist.id}`, 2],
    ['organizer followers = 1', `/api/follows?profile_id=${organizer.id}`, 1],
    ['professional followers = 1', `/api/follows?profile_id=${pro.id}`, 1],
    ['event saved = 1', `/api/saved/events?event_id=${event.id}`, 1],
    ['spot saved = 1', `/api/saved/spots?spot_id=${spot.id}`, 1],
  ]
  for (const [name, path, n] of want) {
    check(`${name} (as B)`, (await countOf(sB, path)) === n, `got ${await countOf(sB, path)}`)
    check(`${name} (anonymous)`, (await countOf(anon, path)) === n)
  }
  const truth = async (table, col, id) => (await admin.from(table).select('*', { count: 'exact', head: true }).eq(col, id)).count
  check('artist count matches the table', (await truth('follows', 'profile_id', artist.id)) === 2)

  // ── 4. idempotency ──
  step('4. Idempotency')
  await sA.call('POST', '/api/follows', { profile_id: artist.id })
  await sA.call('POST', '/api/saved/events', { event_id: event.id })
  check('double follow does not change the count', (await countOf(sB, `/api/follows?profile_id=${artist.id}`)) === 2)
  check('double save does not change the count', (await countOf(sB, `/api/saved/events?event_id=${event.id}`)) === 1)
  await sB.call('DELETE', `/api/follows?profile_id=${artist.id}`)
  check('unfollow lowers the count', (await countOf(sA, `/api/follows?profile_id=${artist.id}`)) === 1)
  await sB.call('POST', '/api/follows', { profile_id: artist.id })

  // ── 5. self-follow, plain users ──
  step('5. Self-follow and plain-user targets')
  check('self-follow is rejected', (await sA.call('POST', '/api/follows', { profile_id: A.id })).status === 400)
  check('cannot follow a plain user', (await sA.call('POST', '/api/follows', { profile_id: Bu.id })).status === 404)
  check('host cannot save own event', (await (await cookieSession(organizer)).call('POST', '/api/saved/events', { event_id: event.id })).status === 403)

  // ── 5b. claimer does not count ──
  step('5b. The claimer of a spot is not counted in its public save count')
  check('claimer cannot save the claimed spot through the API', (await (await cookieSession(claimer)).call('POST', '/api/saved/spots', { spot_id: String(claimedSpot.id) })).status === 403)
  // Even if a row exists (older data, direct write), the public count skips it.
  await must(admin.from('saved_spots').insert({ user_id: claimer.id, spot_id: String(claimedSpot.id) }), 'claimer row')
  await sA.call('POST', '/api/saved/spots', { spot_id: String(claimedSpot.id) })
  check('claimed spot: 2 rows, public count = 1 (claimer excluded)',
    (await truth('saved_spots', 'spot_id', String(claimedSpot.id))) === 2 && (await countOf(sB, `/api/saved/spots?spot_id=${claimedSpot.id}`)) === 1)

  // ── 6. IDOR ──
  step('6. B cannot remove A\'s follow')
  await sB.call('DELETE', `/api/follows?profile_id=${organizer.id}`)
  check('A still follows the organizer', (await countOf(sB, `/api/follows?profile_id=${organizer.id}`)) === 1)
  await sB.call('DELETE', `/api/saved/events?event_id=${event.id}`)
  check('A\'s save survives B\'s delete', (await countOf(sB, `/api/saved/events?event_id=${event.id}`)) === 1)

  // ── 7. privacy ──
  step('7. The follower list is not readable by anyone else')
  const peek = await sB.client.from('follows').select('user_id, profile_id').eq('profile_id', organizer.id)
  check('B reads no follows rows of A', !peek.error && (peek.data ?? []).length === 0, `rows ${(peek.data ?? []).length}`)
  const peekSaved = await sB.client.from('saved_events').select('user_id').eq('event_id', event.id)
  check('B reads no saved_events rows of A', !peekSaved.error && (peekSaved.data ?? []).length === 0)
  const anonClient = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } })
  const peekAnon = await anonClient.from('follows').select('user_id').eq('profile_id', organizer.id)
  check('anonymous reads no follows rows', (peekAnon.data ?? []).length === 0)

  // ── 8. notification ──
  step('8. new_follow notification reached the creator')
  const notes = await must(admin.from('notifications').select('type, actor_id').eq('user_id', artist.id).eq('type', 'new_follow'), 'notifications')
  check('artist has a new_follow notification from A', notes.some(n => n.actor_id === A.id), `rows ${notes.length}`)

  // ── 9. UI ──
  const chromium = await loadPlaywright()
  if (!chromium) {
    console.log('\nSKIP  UI checks: playwright-core could not be loaded')
  } else {
    step('9. UI (Playwright, installed Chrome)')
    browser = await chromium.launch({ channel: 'chrome', headless: true })
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await signIn(page, Bu) // B: has not followed the organizer or professional

    const countText = async () => Number(await page.getByTestId('follower-count').locator('strong').innerText())

    await page.goto(`${BASE}/profile/${organizer.username}`)
    const followBtn = page.getByRole('button', { name: 'Ακολούθησε', exact: true })
    await followBtn.waitFor({ timeout: 20000 })
    const before = await countText()
    check('profile shows Follow and the follower count', before === 1, `count ${before}`)
    await followBtn.click()
    await page.getByRole('button', { name: 'Ακολουθώ', exact: true }).waitFor()
    check('count goes up after Follow', (await countText()) === 2)
    await shot(page, 'follow-1-profile.png')
    await page.reload()
    await page.getByRole('button', { name: 'Ακολουθώ', exact: true }).waitFor({ timeout: 20000 })
    check('follow and count survive a refresh', (await countText()) === 2)

    await page.goto(`${BASE}/events/${event.id}`)
    await page.getByRole('button', { name: 'Save', exact: true }).or(page.getByRole('button', { name: 'Αποθήκευση', exact: true })).first().click()
    await page.getByText(/2 (αποθηκεύσεις|saves)/).waitFor({ timeout: 15000 })
    check('event page: save raises the count to 2', true)
    await page.reload()
    await page.getByText(/2 (αποθηκεύσεις|saves)/).waitFor({ timeout: 15000 })
    check('event save and count survive a refresh', true)
    await shot(page, 'follow-2-event.png')

    await page.goto(`${BASE}/spots/${spot.slug}`)
    await page.getByRole('button', { name: /Αποθήκευση spot|Save spot/ }).click()
    await page.getByTestId('spot-save-count').filter({ hasText: '2' }).waitFor({ timeout: 15000 })
    check('spot page: save raises the count to 2', true)
    await page.reload()
    await page.getByTestId('spot-save-count').filter({ hasText: '2' }).waitFor({ timeout: 15000 })
    check('spot save and count survive a refresh', true)
    await shot(page, 'follow-3-spot.png')

    // a plain user has no public profile
    const resp = await page.goto(`${BASE}/profile/${A.username}`)
    check('plain-user profile is not found (no Follow there)', resp?.status() === 404)

    // creator dashboard shows the same number
    const ctx2 = await browser.newContext()
    const page2 = await ctx2.newPage()
    await signIn(page2, artist)
    // the creator stats live on the content tab
    await page2.getByRole('button', { name: 'Περιεχόμενο', exact: true }).click()
    const tile = page2.locator('p', { hasText: /^(Ακόλουθοι|Followers)$/ }).first()
    await tile.waitFor({ timeout: 20000 })
    const tileValue = await tile.locator('xpath=preceding-sibling::p[1]').innerText()
    check('artist dashboard followers = public count (2)', tileValue.trim() === '2', `tile ${tileValue}`)
    await shot(page2, 'follow-4-artist-dashboard.png')
    await ctx2.close()
    await ctx.close()
  }
}

// ── run + cleanup ────────────────────────────────────────────────────────────
let failed = false
try {
  await main()
} catch (e) {
  failed = true
  console.error(`\nERROR  ${e.message}`)
  try { if (currentPage) await shot(currentPage, 'follow-failure.png') } catch {}
} finally {
  step('Cleanup')
  try { await browser?.close() } catch {}
  for (const id of createdIds.events) await admin.from('events').delete().eq('id', id)
  for (const id of createdIds.spots) await admin.from('spots').delete().eq('id', id)
  for (const acct of created) {
    try { await destroy(acct) } catch (e) { console.error(`cleanup ${acct.email}: ${e.message}`); failed = true }
  }
  const left = created.length
    ? (await admin.from('profiles').select('id', { count: 'exact', head: true }).in('id', created.map(c => c.id))).count
    : 0
  check('throwaway profiles removed', left === 0, `left ${left}`)
}

const bad = results.filter(r => !r.ok)
console.log(`\n${results.length - bad.length}/${results.length} passed`)
process.exit(failed || bad.length ? 1 : 0)
