#!/usr/bin/env node
/**
 * Tests the column guards from 20261026000000_guard_protected_columns.sql.
 * Runs against the real Supabase project, using throwaway accounts it creates
 * and always removes. The migration must already be applied.
 *
 *   node scripts/test-rls-guards.mjs                # database checks only
 *   npm run dev  +  node scripts/test-rls-guards.mjs  # plus the app-route checks
 *
 * Env (from .env.local): NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
 * SUPABASE_SERVICE_ROLE_KEY. Optional: TEST_BASE_URL (default
 * http://localhost:3000). Route checks are skipped, and reported as skipped,
 * when no dev server answers there.
 *
 * Bypass attempts go straight to Supabase REST with the throwaway user's own
 * JWT (what a malicious creator could do). Legit flows go through the real app
 * routes where there is one, otherwise the same REST write the app makes.
 *
 * Safety: only accounts whose email contains "+rlsguardtest-" are ever created
 * or deleted. The real accounts and the profiles ravar and motiva are never
 * touched.
 */

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomBytes } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function loadEnv() {
  const env = {}
  try {
    for (const line of readFileSync(resolve(ROOT, '.env.local'), 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  } catch { /* fall back to process.env */ }
  return { ...env, ...process.env }
}

const env = loadEnv()
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY
const BASE = (env.TEST_BASE_URL || 'http://localhost:3000').replace(/\/$/, '')

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) {
  console.error('Missing Supabase env vars (.env.local or environment)')
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
const TS = Date.now()
const THROWAWAY = '+rlsguardtest-'

// ── reporting ────────────────────────────────────────────────────────────────
const results = []
function check(name, ok, detail = '') {
  results.push({ name, ok: !!ok })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`)
}
const skip = (name, why) => console.log(`SKIP  ${name}  (${why})`)
const step = (s) => console.log(`\n── ${s}`)

async function must(promise, what) {
  const { data, error } = await promise
  if (error) throw new Error(`${what}: ${error.message}`)
  return data
}

/** A guarded write must fail with 42501 specifically, not just fail. */
const blocked = (res) => res.error?.code === '42501'
const code = (res) => res.error ? `${res.error.code}: ${res.error.message}` : 'no error'

// ── accounts ─────────────────────────────────────────────────────────────────
const created = [] // { id, email }
const ids = { events: [], releases: [], listings: [], spots: [], requests: [], claims: [] }

async function createAuthUser(role) {
  const email = `dkantanoleon${THROWAWAY}${TS}-${role}@gmail.com`
  const password = `Rg-${randomBytes(9).toString('base64url')}!9`
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (error) throw new Error(`createUser ${role}: ${error.message}`)
  created.push({ id: data.user.id, email })
  return { id: data.user.id, email, password, role, username: `rlsguardtest_${role}_${TS}` }
}

/** Auth user plus a profile written with the service role (exempt from the guards). */
async function createAccount(role, profileType) {
  const a = await createAuthUser(role)
  await must(admin.from('profiles').upsert({
    id: a.id, username: a.username, display_name: `Rlsguardtest ${role}`, profile_type: profileType,
  }), `profile ${role}`)
  return a
}

async function destroy({ id, email }) {
  if (!email.includes(THROWAWAY)) throw new Error(`refusing to clean up non-throwaway ${email}`)
  const { data: authUser } = await admin.auth.admin.getUserById(id)
  if (authUser?.user && authUser.user.email !== email) throw new Error(`id/email mismatch for ${email}`)
  await admin.rpc('delete_account', { target: id })
  if (authUser?.user) await admin.auth.admin.deleteUser(id)
}

/** The user's own JWT against REST (bypass attempts), and, for route checks,
 *  the same session as cookies against the app. */
async function session(acct) {
  const rest = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } })
  const { error: e1 } = await rest.auth.signInWithPassword({ email: acct.email, password: acct.password })
  if (e1) throw new Error(`REST sign-in ${acct.email}: ${e1.message}`)

  const jar = new Map()
  const ssr = createServerClient(SUPABASE_URL, ANON_KEY, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (list) => list.forEach(({ name, value }) => (value ? jar.set(name, value) : jar.delete(name))),
    },
  })
  const { error: e2 } = await ssr.auth.signInWithPassword({ email: acct.email, password: acct.password })
  if (e2) throw new Error(`cookie sign-in ${acct.email}: ${e2.message}`)
  const cookie = [...jar].map(([n, v]) => `${n}=${v}`).join('; ')
  return {
    rest,
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

const row = async (table, id, cols = '*') =>
  must(admin.from(table).select(cols).eq('id', id).single(), `reread ${table}`)

/** Tries each protected column on its own; every one must be refused with 42501. */
async function expectAllBlocked(label, client, table, id, attempts) {
  for (const [col, value] of Object.entries(attempts)) {
    const res = await client.from(table).update({ [col]: value }).eq('id', id).select()
    check(`${label}: cannot change ${col}`, blocked(res), code(res))
  }
}

// ── main ─────────────────────────────────────────────────────────────────────
async function main() {
  let serverUp = false
  try { serverUp = (await fetch(BASE, { cache: 'no-store' })).ok } catch { /* skipped below */ }
  if (!serverUp) console.log(`No dev server at ${BASE}: app-route checks will be skipped.`)

  step('1. Create throwaway accounts')
  const plain = await createAccount('user', 'user')
  const artist = await createAccount('artist', 'artist')
  const spotOwner = await createAccount('spot', 'spot')
  const fan = await createAccount('fan', 'user')
  const newbieRest = await createAuthUser('newbie')   // no profile yet: REST insert
  const newbieRoute = await createAuthUser('newbier') // no profile yet: /api/profiles

  const sPlain = await session(plain)
  const sArtist = await session(artist)
  const sSpot = await session(spotOwner)
  const sFan = await session(fan)
  const sNewbieRest = await session(newbieRest)
  const sNewbieRoute = await session(newbieRoute)

  const future = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10)

  // ── profiles ──
  step('2. profiles')
  await expectAllBlocked('profile update', sPlain.rest, 'profiles', plain.id, {
    profile_type: 'venue', plan_tier: 'creator', is_verified: true, is_featured: true,
    professional_status: null, view_count: 999999,
  })
  const pAfter = await row('profiles', plain.id, 'profile_type, plan_tier, is_verified, is_featured, view_count')
  check('profile row unchanged after the attempts',
    pAfter.profile_type === 'user' && pAfter.is_verified === false && pAfter.is_featured === false && pAfter.view_count === 0,
    JSON.stringify(pAfter))

  const save = await sPlain.rest.from('profiles').update({
    display_name: 'Rlsguardtest renamed', bio: 'bio', location: 'Αθήνα', instagram: 'rlsguardtest',
    section_visibility: { upcoming_events: false }, network_tab: null, genres: ['House'],
    profile_type: 'user', // writing the same value back must not trip the guard
  }).eq('id', plain.id).select()
  check('legit: save profile (dashboard payload shape)', !save.error && save.data?.length === 1, code(save))

  const ins = await sNewbieRest.rest.from('profiles').insert({
    id: newbieRest.id, username: newbieRest.username, display_name: 'Newbie',
    profile_type: 'venue', plan_tier: 'creator', is_verified: true, is_featured: true, view_count: 50,
  }).select()
  const insRow = await row('profiles', newbieRest.id, 'profile_type, plan_tier, is_verified, is_featured, view_count, professional_status')
  check('REST insert of a profile is forced to defaults',
    insRow.profile_type === 'user' && insRow.plan_tier === 'free' && insRow.is_verified === false &&
    insRow.is_featured === false && insRow.view_count === 0 && insRow.professional_status === 'approved',
    ins.error ? code(ins) : JSON.stringify(insRow))

  if (serverUp) {
    const r = await sNewbieRoute.call('POST', '/api/profiles', {
      username: newbieRoute.username, display_name: 'Newbie route', profile_type: 'artist',
    })
    check('POST /api/profiles ignores profile_type from the body', r.status === 200 && r.body?.profile_type === 'user',
      `status ${r.status} type ${r.body?.profile_type}`)
  } else skip('POST /api/profiles ignores profile_type', 'no dev server')

  // ── events ──
  step('3. events')
  const evIns = await sArtist.rest.from('events').insert({
    title: `Rlsguardtest bypass ${TS}`, date: future, time: '23:00', venue: 'Rlsguardtest', city: 'Αθήνα',
    profile_id: artist.id, status: 'approved', nightup_pick: true, is_radar_pick: true,
    featured_until: new Date(Date.now() + 864e5).toISOString(), view_count: 500, going_count: 500,
    interested_count: 500, has_copyright_restriction: true,
  }).select('id').single()
  if (evIns.error) throw new Error(`event insert failed: ${code(evIns)}`)
  const evId = evIns.data.id
  ids.events.push(evId)
  const ev = await row('events', evId)
  check('REST insert of an event is forced to defaults',
    ev.status === 'pending' && ev.nightup_pick === false && ev.is_radar_pick === false && ev.featured_until === null &&
    ev.view_count === 0 && ev.going_count === 0 && ev.interested_count === 0 && ev.has_copyright_restriction === false,
    JSON.stringify({ s: ev.status, n: ev.nightup_pick, r: ev.is_radar_pick, f: ev.featured_until, v: ev.view_count }))

  await expectAllBlocked('event update', sArtist.rest, 'events', evId, {
    status: 'approved', nightup_pick: true, is_radar_pick: true,
    featured_until: new Date(Date.now() + 864e5).toISOString(), view_count: 9, going_count: 9,
    interested_count: 9, has_copyright_restriction: true, profile_id: plain.id,
  })
  check('event is still pending after the attempts', (await row('events', evId, 'status')).status === 'pending')

  const evLegit = await sArtist.rest.from('events').update({ title: `Rlsguardtest edited ${TS}`, website: 'https://example.com' }).eq('id', evId).select()
  check('legit: edit event content over REST (incl. legacy website)', !evLegit.error && evLegit.data?.length === 1, code(evLegit))
  if (serverUp) {
    const r = await sArtist.call('PATCH', `/api/events/${evId}`, { title: `Rlsguardtest route edit ${TS}` })
    check('legit: PATCH /api/events/[id]', r.status === 200, `status ${r.status} ${r.body?.error ?? ''}`)
  } else skip('PATCH /api/events/[id]', 'no dev server')

  // Admin approval (service role) must keep working, then reactions and views.
  await must(admin.from('events').update({ status: 'approved' }).eq('id', evId), 'service-role approve')
  check('service role can approve', (await row('events', evId, 'status')).status === 'approved')

  if (serverUp) {
    const r = await sFan.call('POST', '/api/events/react', { eventId: evId, reactionType: 'going' })
    const after = await row('events', evId, 'going_count')
    check('legit: reaction increments going_count through the definer trigger', r.status < 300 && after.going_count === 1,
      `status ${r.status} going_count ${after.going_count}`)
  } else skip('reactions', 'no dev server')
  const anon = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } })
  const v0 = (await row('events', evId, 'view_count')).view_count
  const rpc = await anon.rpc('increment_event_views', { event_id: evId })
  const v1 = (await row('events', evId, 'view_count')).view_count
  check('legit: increment_event_views still works for anon', !rpc.error && v1 === v0 + 1, `${v0} -> ${v1} ${rpc.error?.message ?? ''}`)

  // ── music_releases ──
  step('4. music_releases')
  const relIns = await sArtist.rest.from('music_releases').insert({
    title: `Rlsguardtest release ${TS}`, artist: 'Rlsguardtest', type: 'Single', profile_id: artist.id,
    status: 'approved', is_promoted: true,
  }).select('id').single()
  if (relIns.error) throw new Error(`release insert failed: ${code(relIns)}`)
  const relId = relIns.data.id
  ids.releases.push(relId)
  const rel = await row('music_releases', relId, 'status, is_promoted')
  check('REST insert of a release is forced to pending / not promoted', rel.status === 'pending' && rel.is_promoted === false, JSON.stringify(rel))
  await expectAllBlocked('release update', sArtist.rest, 'music_releases', relId, { status: 'approved', is_promoted: true, profile_id: plain.id })
  if (serverUp) {
    const r = await sArtist.call('PATCH', `/api/releases/${relId}`, { title: `Rlsguardtest release edited ${TS}`, status: 'approved', is_promoted: true })
    const after = await row('music_releases', relId, 'status, is_promoted, title')
    check('legit: PATCH /api/releases/[id] edits content, ignores status', r.status === 200 && after.status === 'pending' && after.is_promoted === false && after.title.includes('edited'),
      `status ${r.status} ${JSON.stringify(after)}`)
    const post = await sArtist.call('POST', '/api/releases', {
      title: `Rlsguardtest route release ${TS}`, artist: 'Rlsguardtest', type: 'Single', primary_genre: 'House',
      is_promoted: true, status: 'approved',
    })
    if (post.body?.id) ids.releases.push(post.body.id)
    check('POST /api/releases ignores is_promoted/status from the body',
      post.status === 200 && post.body?.is_promoted === false && post.body?.status === 'pending',
      `status ${post.status} ${JSON.stringify({ s: post.body?.status, p: post.body?.is_promoted })}`)
  } else skip('release routes', 'no dev server')

  // ── listings ──
  step('5. listings')
  const lsIns = await sArtist.rest.from('listings').insert({
    profile_id: artist.id, type: 'seeking', role: 'DJ', title: `Rlsguardtest listing ${TS}`, is_sponsored: true,
  }).select('id').single()
  if (lsIns.error) throw new Error(`listing insert failed: ${code(lsIns)}`)
  const lsId = lsIns.data.id
  ids.listings.push(lsId)
  check('REST insert of a listing is forced to is_sponsored=false', (await row('listings', lsId, 'is_sponsored')).is_sponsored === false)
  await expectAllBlocked('listing update', sArtist.rest, 'listings', lsId, { is_sponsored: true, profile_id: plain.id })
  const off = await sArtist.rest.from('listings').update({ is_active: false, title: 'Rlsguardtest listing edited' }).eq('id', lsId).select()
  const on = await sArtist.rest.from('listings').update({ is_active: true }).eq('id', lsId).select()
  check('legit: owner can edit and toggle is_active (unchanged behaviour)', !off.error && !on.error, `${code(off)} / ${code(on)}`)

  // ── spots ──
  step('6. spots')
  const slug = `rlsguardtest-${TS}`
  const spIns = await sSpot.rest.from('spots').insert({
    name: `Rlsguardtest Spot ${TS}`, slug, category: 'nightlife', city: 'Αθήνα', lat: 37.98, lng: 23.72,
    owner_id: spotOwner.id, is_published: false, is_sponsored: true, featured: true, rating: 5,
    claimed_by_profile_id: plain.id,
  }).select('id').single()
  if (spIns.error) throw new Error(`spot insert failed: ${code(spIns)}`)
  const spId = spIns.data.id
  ids.spots.push(spId)
  const sp = await row('spots', spId, 'is_published, is_sponsored, featured, rating, claimed_by_profile_id, owner_id')
  check('REST insert of a spot is forced to defaults (published stays true)',
    sp.is_published === true && sp.is_sponsored === false && sp.featured === false && sp.rating === null &&
    sp.claimed_by_profile_id === null && sp.owner_id === spotOwner.id, JSON.stringify(sp))
  await expectAllBlocked('spot update', sSpot.rest, 'spots', spId, {
    is_published: false, is_sponsored: true, featured: true, rating: 5, slug: `${slug}-x`,
    owner_id: plain.id, claimed_by_profile_id: plain.id,
  })
  const spLegit = await sSpot.rest.from('spots').update({ description: 'edited', phone: '123' }).eq('id', spId).select()
  check('legit: owner edits spot content over REST', !spLegit.error && spLegit.data?.length === 1, code(spLegit))
  if (serverUp) {
    const r = await sSpot.call('PATCH', `/api/spots/${spId}`, { description: 'edited via route' })
    check('legit: PATCH /api/spots/[id]', r.status === 200, `status ${r.status} ${r.body?.error ?? ''}`)
  } else skip('PATCH /api/spots/[id]', 'no dev server')

  // ── featured_event_requests / spot_claims ──
  step('7. featured_event_requests and spot_claims')
  const fr = await sArtist.rest.from('featured_event_requests').insert({ event_id: evId, profile_id: artist.id, status: 'approved' }).select('id').single()
  if (fr.error) throw new Error(`featured request insert failed: ${code(fr)}`)
  ids.requests.push(fr.data.id)
  check('featured request insert is forced to pending', (await row('featured_event_requests', fr.data.id, 'status')).status === 'pending')
  await sArtist.rest.from('featured_event_requests').update({ status: 'approved' }).eq('id', fr.data.id)
  check('featured request status cannot be flipped by its owner', (await row('featured_event_requests', fr.data.id, 'status')).status === 'pending')

  const sc = await sPlain.rest.from('spot_claims').insert({ spot_id: spId, profile_id: plain.id, status: 'approved' }).select('id').single()
  if (sc.error) throw new Error(`spot claim insert failed: ${code(sc)}`)
  ids.claims.push(sc.data.id)
  check('spot claim insert is forced to pending', (await row('spot_claims', sc.data.id, 'status')).status === 'pending')
  await sPlain.rest.from('spot_claims').update({ status: 'approved' }).eq('id', sc.data.id)
  check('spot claim status cannot be flipped by its owner', (await row('spot_claims', sc.data.id, 'status')).status === 'pending')

  // ── service role stays exempt ──
  step('8. service role (admin routes) is not guarded')
  await must(admin.from('profiles').update({ plan_tier: 'creator', profile_type: 'artist', is_verified: true, is_featured: true }).eq('id', plain.id), 'approve-upgrade equivalent')
  const up = await row('profiles', plain.id, 'plan_tier, profile_type, is_verified, is_featured')
  check('approve-upgrade / verify / feature updates still work', up.plan_tier === 'creator' && up.profile_type === 'artist' && up.is_verified && up.is_featured, JSON.stringify(up))
  await must(admin.from('events').update({ nightup_pick: true, is_radar_pick: true, featured_until: new Date(Date.now() + 864e5).toISOString() }).eq('id', evId), 'admin picks')
  await must(admin.from('spots').update({ is_published: false, is_sponsored: true, featured: true, rating: 4 }).eq('id', spId), 'admin spot flags')
  await must(admin.from('music_releases').update({ status: 'approved', is_promoted: true }).eq('id', relId), 'admin release flags')
  await must(admin.from('listings').update({ is_sponsored: true }).eq('id', lsId), 'admin listing flag')
  check('admin picks, spot flags, release flags and listing sponsorship still work', true)
}

let failed = false
try {
  await main()
} catch (e) {
  failed = true
  console.error(`\nERROR: ${e.message}`)
} finally {
  step('Cleanup')
  const del = async (table, list) => {
    if (!list.length) return
    const { error } = await admin.from(table).delete().in('id', list)
    if (error) console.error(`cleanup ${table}: ${error.message}`)
  }
  try {
    await del('featured_event_requests', ids.requests)
    await del('spot_claims', ids.claims)
    await del('listings', ids.listings)
    await del('music_releases', ids.releases)
    if (ids.events.length) await admin.from('event_reactions').delete().in('event_id', ids.events)
    await del('events', ids.events)
    await del('spots', ids.spots)
  } catch (e) { console.error(`content cleanup: ${e.message}`) }
  for (const acct of created) {
    try { await destroy(acct) } catch (e) { failed = true; console.error(`cleanup ${acct.email}: ${e.message}`) }
  }
  const bad = results.filter(r => !r.ok)
  console.log(`\n${results.length - bad.length}/${results.length} checks passed`)
  if (bad.length || failed) process.exit(1)
}
