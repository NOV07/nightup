#!/usr/bin/env node
/**
 * End-to-end test for self-service account deletion (/api/account +
 * delete_account()). Runs against the real Supabase project and a running dev
 * server, using throwaway accounts it creates and always removes.
 *
 *   npm run dev                                   # in another terminal
 *   node scripts/test-account-deletion.mjs
 *
 * Env (from .env.local): NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
 * SUPABASE_SERVICE_ROLE_KEY. Optional: TEST_BASE_URL (default
 * http://localhost:3000), TEST_SCREENSHOT_DIR (default ./test-screenshots).
 *
 * The deletion runs through the browser (sign in, dashboard, settings, sheet)
 * when playwright-core can be loaded, driving the installed Chrome. Otherwise
 * it calls the route directly with session cookies from @supabase/ssr. The
 * output says which one ran.
 *
 * Safety: only accounts whose email contains "+deltest-" are ever created or
 * deleted. The real +user/+spot/+pro/+venue/+artist accounts are never touched.
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
const THROWAWAY = '+deltest-'

// ── reporting ────────────────────────────────────────────────────────────────
const results = []
function check(name, ok, detail = '') {
  results.push({ name, ok: !!ok })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`)
}
const step = (s) => console.log(`\n── ${s}`)

// ── helpers ──────────────────────────────────────────────────────────────────
async function must(promise, what) {
  const { data, error } = await promise
  if (error) throw new Error(`${what}: ${error.message}`)
  return data
}

async function count(table, filter) {
  let q = admin.from(table).select('*', { count: 'exact', head: true })
  q = filter(q)
  const { count: n, error } = await q
  if (error) throw new Error(`count ${table}: ${error.message}`)
  return n ?? 0
}

async function listAll(bucket, prefix) {
  const out = []
  const { data, error } = await admin.storage.from(bucket).list(prefix, { limit: 1000 })
  if (error) throw new Error(`list ${bucket}/${prefix}: ${error.message}`)
  for (const e of data ?? []) {
    const p = `${prefix}/${e.name}`
    if (e.id) out.push(p)
    else out.push(...await listAll(bucket, p))
  }
  return out
}

// 1x1 transparent PNG
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64')

async function upload(bucket, path) {
  await must(admin.storage.from(bucket).upload(path, PNG, { contentType: 'image/png', upsert: true }), `upload ${bucket}/${path}`)
  return admin.storage.from(bucket).getPublicUrl(path).data.publicUrl
}

async function httpStatus(path) {
  const res = await fetch(`${BASE}${path}`, { redirect: 'manual', cache: 'no-store' })
  return res.status
}

const created = [] // { id, email } of every throwaway auth user
let browser = null // closed in the final cleanup, also on failure
let currentPage = null // screenshotted if the run fails

async function createAccount(role, profileType) {
  const email = `dkantanoleon${THROWAWAY}${role}-${TS}@gmail.com`
  const password = `Dt-${randomBytes(9).toString('base64url')}!9`
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (error) throw new Error(`createUser ${role}: ${error.message}`)
  const id = data.user.id
  created.push({ id, email })
  const username = `deltest_${role}_${TS}`
  await must(admin.from('profiles').upsert({
    id, username, display_name: `Deltest ${role.toUpperCase()}`, profile_type: profileType,
  }), `profile ${role}`)
  return { id, email, password, username }
}

/** Removes a throwaway account however far the test got. Refuses anything
 *  that is not a +deltest- address. */
async function destroy({ id, email }) {
  if (!email.includes(THROWAWAY)) throw new Error(`refusing to clean up non-throwaway ${email}`)
  const { data: authUser } = await admin.auth.admin.getUserById(id)
  if (authUser?.user && authUser.user.email !== email) throw new Error(`id/email mismatch for ${email}`)
  await admin.rpc('delete_account', { target: id })
  for (const [bucket, prefix] of [['uploads', id], ['events', id], ['gallery-media', `profile/${id}`], ['gallery-media', `spot/${id}`], ['creator-gallery', id]]) {
    try {
      const files = await listAll(bucket, prefix)
      if (files.length) await admin.storage.from(bucket).remove(files)
    } catch { /* best effort */ }
  }
  if (authUser?.user) await admin.auth.admin.deleteUser(id)
}

// ── deletion drivers ─────────────────────────────────────────────────────────
async function loadPlaywright() {
  try {
    const mod = await import('playwright-core')
    return mod.chromium ?? mod.default?.chromium
  } catch {
    return null
  }
}

/** Signs in on /sign-in and lands on the dashboard settings tab. */
async function signInAndOpenSettings(page, acct) {
  currentPage = page
  await page.goto(`${BASE}/sign-in`)
  // By placeholder: the footer newsletter form has an email input too.
  await page.getByPlaceholder('Email', { exact: true }).fill(acct.email)
  const pw = page.getByPlaceholder('Password', { exact: true })
  await pw.fill(acct.password)
  await pw.press('Enter')
  await page.waitForURL(/\/dashboard/, { timeout: 30000 })
  await page.getByRole('button', { name: 'Ρυθμίσεις', exact: true }).click()
  await page.getByRole('button', { name: 'Διαγραφή λογαριασμού', exact: true }).waitFor()
}

async function openSheet(page) {
  await page.getByRole('button', { name: 'Διαγραφή λογαριασμού', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.waitFor()
  await dialog.getByText('Φόρτωση…').waitFor({ state: 'detached', timeout: 15000 }).catch(() => {})
  return dialog
}

/** Submits the sheet and returns the /api/account DELETE response. */
async function submitSheet(page, dialog, password) {
  await dialog.locator('input[type="password"]').fill(password)
  const [res] = await Promise.all([
    page.waitForResponse(r => r.url().endsWith('/api/account') && r.request().method() === 'DELETE', { timeout: 60000 }),
    dialog.getByRole('button', { name: 'Οριστική διαγραφή' }).click(),
  ])
  let body = null
  try { body = await res.json() } catch {}
  return { status: res.status(), body }
}

/** Fallback: real route, session cookies minted with @supabase/ssr. */
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

// ── main ─────────────────────────────────────────────────────────────────────
async function main() {
  try {
    const r = await fetch(BASE, { cache: 'no-store' })
    if (!r.ok) throw new Error(String(r.status))
  } catch (e) {
    throw new Error(`Dev server not reachable at ${BASE} (${e.message}). Start it with npm run dev.`)
  }

  const chromium = await loadPlaywright()
  const mode = chromium ? 'playwright (installed Chrome)' : 'route call with @supabase/ssr session cookies'
  console.log(`Deletion driver: ${mode}`)
  mkdirSync(SHOTS, { recursive: true })

  // ── 1. setup ──
  step('1. Create throwaway accounts and content')
  const B = await createAccount('spot', 'spot')
  const A = await createAccount('user', 'user')
  const C = await createAccount('saver', 'user') // a bystander who saves B's content

  const spot1 = await must(admin.from('spots').insert({
    name: `Deltest Spot ${TS}`, slug: `deltest-spot-${TS}`, category: 'nightlife', city: 'Αθήνα',
    lat: 37.98, lng: 23.72, owner_id: B.id, is_published: true,
  }).select('id, slug').single(), 'spot owned')
  const spot2 = await must(admin.from('spots').insert({
    name: `Deltest Claimed ${TS}`, slug: `deltest-claimed-${TS}`, category: 'drink', city: 'Αθήνα',
    lat: 37.97, lng: 23.73, claimed_by_profile_id: B.id, is_published: true,
  }).select('id, slug').single(), 'spot claimed')
  await must(admin.from('spot_claims').insert({ spot_id: spot2.id, profile_id: B.id, status: 'approved' }), 'spot_claim')

  const future = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10)
  const eventRow = (n) => ({
    title: `Deltest Event ${n} ${TS}`, date: future, time: '23:00', venue: 'Deltest', city: 'Αθήνα',
    status: 'approved', profile_id: B.id,
  })
  const e1 = await must(admin.from('events').insert(eventRow(1)).select('id').single(), 'event 1')
  const e2 = await must(admin.from('events').insert(eventRow(2)).select('id').single(), 'event 2')
  await must(admin.from('featured_event_requests').insert({ event_id: e1.id, profile_id: B.id }), 'featured request')

  const galleryUrl = await upload('gallery-media', `profile/${B.id}/deltest.png`)
  const gallery = await must(admin.from('creator_gallery').insert({ profile_id: B.id, image_url: galleryUrl, display_order: 0 }).select('id').single(), 'gallery')
  const listing = await must(admin.from('listings').insert({
    profile_id: B.id, type: 'seeking', role: 'DJ', title: `Deltest listing ${TS}`, city: 'Αθήνα', is_active: true,
  }).select('id').single(), 'listing')
  await upload('uploads', `${B.id}/avatars/deltest.png`)
  await upload('events', `${B.id}/deltest.png`)
  const avatarA = await upload('uploads', `${A.id}/avatars/deltest.png`)
  await must(admin.from('profiles').update({ avatar_url: avatarA }).eq('id', A.id), 'A avatar')
  console.log(`B=${B.id} spots=${spot1.id},${spot2.id} events=${e1.id},${e2.id}`)
  console.log(`A=${A.id}  C=${C.id}`)

  // ── 2. activity ──
  step('2. Activity by A (and bystander C)')
  await must(admin.from('event_reactions').insert([
    { event_id: e1.id, user_id: A.id, reaction_type: 'going' },
    { event_id: e2.id, user_id: A.id, reaction_type: 'interested' },
  ]), 'A reactions')
  await must(admin.from('saved_events').insert({ user_id: A.id, event_id: e1.id }), 'A save event')
  await must(admin.from('saved_spots').insert({ user_id: A.id, spot_id: String(spot1.id) }), 'A save spot')
  // Follow and listing interest through the real routes, so both notifications
  // (new_follow, listing_interest) are written by the server helper with actor = A.
  const aSession = await cookieSession(A)
  const follow = await aSession.call('POST', '/api/follows', { profile_id: B.id })
  check('A follows B through /api/follows', follow.status < 300, `status ${follow.status}`)
  const interest = await aSession.call('POST', `/api/listings/${listing.id}/interest`)
  check('A interest through /api/listings/[id]/interest', interest.status < 300, `status ${interest.status}`)

  await must(admin.from('saved_events').insert({ user_id: C.id, event_id: e1.id }), 'C save event')
  await must(admin.from('saved_spots').insert({ user_id: C.id, spot_id: String(spot1.id) }), 'C save spot')
  await must(admin.from('event_reactions').insert({ event_id: e1.id, user_id: C.id, reaction_type: 'going' }), 'C reaction')

  const evCounts = async () => Object.fromEntries((await must(admin.from('events').select('id, going_count, interested_count').in('id', [e1.id, e2.id]), 'event counts')).map(r => [r.id, r]))
  const baseline = {
    ev: await evCounts(),
    followers: await count('follows', q => q.eq('profile_id', B.id)),
    savedEvent: await count('saved_events', q => q.eq('event_id', e1.id)),
    savedSpot: await count('saved_spots', q => q.eq('spot_id', String(spot1.id))),
    notifActor: await count('notifications', q => q.eq('actor_id', A.id)),
  }
  console.log('baseline', JSON.stringify(baseline))
  check('exactly 2 notifications with actor = A (follow + interest, via routes)', baseline.notifActor === 2, `${baseline.notifActor}`)

  const aSnapshot = async () => ({
    profile: await count('profiles', q => q.eq('id', A.id)),
    reactions: await count('event_reactions', q => q.eq('user_id', A.id)),
    savedEvents: await count('saved_events', q => q.eq('user_id', A.id)),
    savedSpots: await count('saved_spots', q => q.eq('user_id', A.id)),
    follows: await count('follows', q => q.eq('user_id', A.id)),
    interests: await count('listing_interests', q => q.eq('profile_id', A.id)),
    notifActor: await count('notifications', q => q.eq('actor_id', A.id)),
    files: (await listAll('uploads', A.id)).length,
  })
  const aBefore = await aSnapshot()

  // ── 3. delete A ──
  step(`3. Delete A through the real route [${mode}]`)
  let wrong, right, aAfterWrong
  if (chromium) {
    browser = await chromium.launch({ channel: 'chrome', headless: true })
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'el-GR' })
    const page = await ctx.newPage()
    await signInAndOpenSettings(page, A)
    await page.screenshot({ path: resolve(SHOTS, '1-user-settings.png'), fullPage: true })
    let dialog = await openSheet(page)
    await page.screenshot({ path: resolve(SHOTS, '2-delete-sheet.png') })
    wrong = await submitSheet(page, dialog, 'definitely-not-the-password')
    const wrongShown = await dialog.getByText('Λάθος κωδικός').isVisible().catch(() => false)
    check('wrong password: "Λάθος κωδικός" shown', wrongShown)
    await page.screenshot({ path: resolve(SHOTS, '2b-delete-sheet-wrong-password.png') })
    aAfterWrong = await aSnapshot()
    right = await submitSheet(page, dialog, A.password)
    await page.waitForURL(u => new URL(u).pathname === '/', { timeout: 30000 })
    const toast = await page.getByText('Ο λογαριασμός σου διαγράφηκε').waitFor({ timeout: 15000 }).then(() => true, () => false)
    check('redirected to / with the goodbye toast', toast)
    await page.screenshot({ path: resolve(SHOTS, '4-after-delete-toast.png') })
    // router.replace('/') runs right after the toast fires; give it time to land.
    await page.waitForURL(u => !String(u).includes('account_deleted'), { timeout: 10000 }).catch(() => {})
    check('query string cleared after toast', !page.url().includes('account_deleted'), page.url())
    await ctx.close()
  } else {
    wrong = await aSession.call('DELETE', '/api/account', { password: 'definitely-not-the-password' })
    aAfterWrong = await aSnapshot()
    right = await aSession.call('DELETE', '/api/account', { password: A.password })
  }
  check('wrong password: 403 wrong_password', wrong.status === 403 && wrong.body?.error === 'wrong_password', `status ${wrong.status}`)
  check('wrong password: all of A\'s data intact', JSON.stringify(aAfterWrong) === JSON.stringify(aBefore), JSON.stringify(aAfterWrong))
  check('correct password: 200 ok', right.status === 200 && right.body?.ok === true, `status ${right.status} ${JSON.stringify(right.body)}`)
  check('route reports authUser deleted', right.body?.authUser === 'deleted', String(right.body?.authUser))

  // ── 4. assertions for A ──
  step('4. Assertions for A')
  const { data: aAuth } = await admin.auth.admin.getUserById(A.id)
  check('A auth user gone', !aAuth?.user)
  const aAfter = await aSnapshot()
  check('A profile gone', aAfter.profile === 0)
  check('A event_reactions = 0', aAfter.reactions === 0)
  check('A saved_events = 0', aAfter.savedEvents === 0)
  check('A saved_spots = 0', aAfter.savedSpots === 0)
  check('A follows = 0', aAfter.follows === 0)
  check('A listing_interests = 0', aAfter.interests === 0)
  check('notifications with actor A = 0', aAfter.notifActor === 0)
  check('notifications for A = 0', (await count('notifications', q => q.eq('user_id', A.id))) === 0)
  check('no files in uploads/<A>/', aAfter.files === 0, `before ${aBefore.files}`)
  const ev = await evCounts()
  check('e1 going_count = baseline - 1', ev[e1.id].going_count === baseline.ev[e1.id].going_count - 1, `${baseline.ev[e1.id].going_count} -> ${ev[e1.id].going_count}`)
  check('e2 interested_count = baseline - 1', ev[e2.id].interested_count === baseline.ev[e2.id].interested_count - 1, `${baseline.ev[e2.id].interested_count} -> ${ev[e2.id].interested_count}`)
  const followersAfter = await count('follows', q => q.eq('profile_id', B.id))
  check('B follower count - 1', followersAfter === baseline.followers - 1, `${baseline.followers} -> ${followersAfter}`)
  const se = await count('saved_events', q => q.eq('event_id', e1.id))
  const ss = await count('saved_spots', q => q.eq('spot_id', String(spot1.id)))
  check('e1 saved count - 1', se === baseline.savedEvent - 1, `${baseline.savedEvent} -> ${se}`)
  check('spot1 saved count - 1', ss === baseline.savedSpot - 1, `${baseline.savedSpot} -> ${ss}`)

  // ── 5. delete B ──
  step(`5. Delete B through the real route [${mode}]`)
  const pages = { spot: `/spots/${spot1.slug}`, claimed: `/spots/${spot2.slug}`, event: `/events/${e1.id}`, profile: `/profile/${B.username}` }
  for (const [k, p] of Object.entries(pages)) console.log(`before: ${k} ${p} -> ${await httpStatus(p)}`)
  const beforeStatus = { spot: await httpStatus(pages.spot), event: await httpStatus(pages.event), profile: await httpStatus(pages.profile) }

  let bRes
  if (chromium) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'el-GR' })
    const page = await ctx.newPage()
    await signInAndOpenSettings(page, B)
    // Creator card lists the content before the sheet opens.
    await page.getByText('Μαζί με τον λογαριασμό χάνονται:').waitFor({ timeout: 15000 }).catch(() => {})
    await page.getByRole('button', { name: 'Διαγραφή λογαριασμού', exact: true }).scrollIntoViewIfNeeded()
    await page.screenshot({ path: resolve(SHOTS, '3-creator-settings.png'), fullPage: true })
    const creatorListShown = await page.getByText(`Deltest Spot ${TS}`).first().isVisible().catch(() => false)
    check('creator card shows spot name before opening the sheet', creatorListShown)
    const dialog = await openSheet(page)
    await page.screenshot({ path: resolve(SHOTS, '3b-creator-sheet.png') })
    bRes = await submitSheet(page, dialog, B.password)
    await page.waitForURL(u => new URL(u).pathname === '/', { timeout: 30000 }).catch(() => {})
    await ctx.close()
  } else {
    const bSession = await cookieSession(B)
    const preview = await bSession.call('GET', '/api/account')
    check('preview lists both spots', preview.body?.spots?.length === 2, JSON.stringify(preview.body?.spots))
    bRes = await bSession.call('DELETE', '/api/account', { password: B.password })
  }
  check('B delete: 200 ok', bRes.status === 200 && bRes.body?.ok === true, `status ${bRes.status} ${JSON.stringify(bRes.body)}`)

  step('Assertions for B')
  const { data: bAuth } = await admin.auth.admin.getUserById(B.id)
  check('B auth user gone', !bAuth?.user)
  check('B profile gone', (await count('profiles', q => q.eq('id', B.id))) === 0)
  check('owned spot deleted', (await count('spots', q => q.eq('id', spot1.id))) === 0)
  check('claimed spot deleted', (await count('spots', q => q.eq('id', spot2.id))) === 0)
  check('no spot left with owner_id/claimed_by = B', (await count('spots', q => q.or(`owner_id.eq.${B.id},claimed_by_profile_id.eq.${B.id}`))) === 0)
  check('events deleted', (await count('events', q => q.in('id', [e1.id, e2.id]))) === 0)
  check('gallery item deleted', (await count('creator_gallery', q => q.eq('id', gallery.id))) === 0)
  check('listing deleted', (await count('listings', q => q.eq('id', listing.id))) === 0)
  check('saved_spots for B spots = 0 (incl. bystander C)', (await count('saved_spots', q => q.in('spot_id', [String(spot1.id), String(spot2.id)]))) === 0)
  check('saved_events for B events = 0 (incl. bystander C)', (await count('saved_events', q => q.in('event_id', [e1.id, e2.id]))) === 0)
  check('event_reactions for B events = 0', (await count('event_reactions', q => q.in('event_id', [e1.id, e2.id]))) === 0)
  check('spot_claims for B spots = 0', (await count('spot_claims', q => q.in('spot_id', [spot1.id, spot2.id]))) === 0)
  check('featured_event_requests for B events = 0', (await count('featured_event_requests', q => q.in('event_id', [e1.id, e2.id]))) === 0)
  check('no files in uploads/<B>/', (await listAll('uploads', B.id)).length === 0)
  check('no files in events/<B>/', (await listAll('events', B.id)).length === 0)
  check('no files in gallery-media/profile/<B>/', (await listAll('gallery-media', `profile/${B.id}`)).length === 0)
  check('bystander C account untouched', (await count('profiles', q => q.eq('id', C.id))) === 1)

  const after = { spot: await httpStatus(pages.spot), event: await httpStatus(pages.event), profile: await httpStatus(pages.profile) }
  check(`/spots/<slug> 200 -> 404`, beforeStatus.spot === 200 && after.spot === 404, `${beforeStatus.spot} -> ${after.spot}`)
  check(`/events/<id> 200 -> 404`, beforeStatus.event === 200 && after.event === 404, `${beforeStatus.event} -> ${after.event}`)
  check(`/profile/<B> 200 -> 404`, beforeStatus.profile === 200 && after.profile === 404, `${beforeStatus.profile} -> ${after.profile}`)
  console.log(`(A is a plain user: /profile/${A.username} is 404 by design even before deletion -> ${await httpStatus(`/profile/${A.username}`)})`)
}

let failed = false
try {
  await main()
} catch (err) {
  failed = true
  console.error('\nERROR:', err.message)
  if (currentPage) {
    await currentPage.screenshot({ path: resolve(SHOTS, 'failure.png'), fullPage: true }).catch(() => {})
    console.error('page at failure:', currentPage.url(), '(test-screenshots/failure.png)')
  }
} finally {
  step('6. Cleanup')
  if (browser) await browser.close().catch(() => {})
  for (const acct of created) {
    try {
      await destroy(acct)
      console.log(`cleaned ${acct.email}`)
    } catch (e) {
      failed = true
      console.error(`cleanup failed for ${acct.email}: ${e.message}`)
    }
  }
  const passed = results.filter(r => r.ok).length
  console.log(`\n${passed}/${results.length} assertions passed. Screenshots: ${SHOTS}`)
  if (failed || passed !== results.length) process.exitCode = 1
}
