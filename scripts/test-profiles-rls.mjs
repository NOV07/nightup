#!/usr/bin/env node
/**
 * Tests that plain 'user' rows of public.profiles are hidden from other
 * sessions (20261101010000_profiles_hide_user_rows.sql), and that nothing else
 * regresses. Runs against the real Supabase project with throwaway accounts it
 * creates and always removes.
 *
 *   node scripts/test-profiles-rls.mjs before   # run BEFORE the policy migration
 *   node scripts/test-profiles-rls.mjs after    # run AFTER it
 *
 * `before` and `after` only change what a check EXPECTS (today's exposure vs
 * the hidden state); every check is reported PASS/FAIL against that mode. The
 * `before` run also writes a snapshot of the public counts that `after`
 * compares against. Needs 20261101000000_username_taken_function.sql applied.
 *
 * App checks need `npm run dev` (TEST_BASE_URL, default http://localhost:3000);
 * without a server they are reported as SKIP.
 *
 * Env (.env.local): NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
 * SUPABASE_SERVICE_ROLE_KEY.
 *
 * Safety: only accounts whose email contains "+deltest-" are created or
 * deleted. Real accounts are never modified or removed. Everything created
 * here is deleted in `finally`.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomBytes } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

const MODE = process.argv[2]
if (MODE !== 'before' && MODE !== 'after') {
  console.error('Usage: node scripts/test-profiles-rls.mjs before|after')
  process.exit(2)
}
const AFTER = MODE === 'after'

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
const THROWAWAY = '+deltest-'
const UNAME = `deltest_`            // username prefix of every throwaway profile
const SNAPSHOT = join(tmpdir(), 'test-profiles-rls-snapshot.json')

// ── reporting ────────────────────────────────────────────────────────────────
const results = []
function check(name, ok, detail = '') {
  results.push({ name, ok: !!ok })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`)
}
const notTested = []
function skip(name, why) { notTested.push(`${name} (${why})`); console.log(`SKIP  ${name}  (${why})`) }
const step = (s) => console.log(`\n── ${s}`)
const info = (s) => console.log(`INFO  ${s}`)

async function must(promise, what) {
  const { data, error } = await promise
  if (error) throw new Error(`${what}: ${error.message}`)
  return data
}

// ── accounts and fixtures ────────────────────────────────────────────────────
const created = []
const ids = { events: [], mixes: [], listings: [] }

async function createAccount(role, profileType, extra = {}) {
  const email = `dkantanoleon${THROWAWAY}${role}-${TS}@gmail.com`
  const password = `Dt-${randomBytes(9).toString('base64url')}!9`
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (error) throw new Error(`createUser ${role}: ${error.message}`)
  created.push({ id: data.user.id, email })
  const username = `${UNAME}${role}_${TS}`
  await must(admin.from('profiles').upsert({
    id: data.user.id, username, display_name: `Deltest ${role} ${TS}`, profile_type: profileType, ...extra,
  }), `profile ${role}`)
  return { id: data.user.id, email, password, role, username, display_name: `Deltest ${role} ${TS}` }
}

async function destroy({ id, email }) {
  if (!email.includes(THROWAWAY)) throw new Error(`refusing to clean up non-throwaway ${email}`)
  const { data: au } = await admin.auth.admin.getUserById(id)
  if (au?.user && au.user.email !== email) throw new Error(`id/email mismatch for ${email}`)
  await admin.rpc('delete_account', { target: id })
  if (au?.user) await admin.auth.admin.deleteUser(id)
}

/** Signed-in REST client (the user's own JWT) and a cookie-bearing app caller. */
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
        method, redirect: 'manual', headers: { cookie, 'content-type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      })
      let json = null
      const text = await res.text()
      try { json = JSON.parse(text) } catch {}
      return { status: res.status, body: json, text }
    },
  }
}

/** Raw anon REST read (no user JWT). */
async function anonGet(path, headers = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}`, ...headers },
  })
  let body = null
  try { body = await res.json() } catch {}
  return { status: res.status, body, range: res.headers.get('content-range') }
}
const anonCount = async (path) => {
  const r = await anonGet(`${path}${path.includes('?') ? '&' : '?'}select=id`, { Prefer: 'count=exact', Range: '0-0' })
  return Number(r.range?.split('/')[1] ?? NaN)
}
const anonApp = async (path) => {
  const res = await fetch(`${BASE}${path}`, { cache: 'no-store' })
  return { status: res.status, text: await res.text() }
}

/** Expectation helper: today's exposure in `before`, hidden in `after`. */
const exp = (visibleBefore) => (AFTER ? !visibleBefore : visibleBefore)

// ── main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`Mode: ${MODE}  base: ${BASE}`)
  let serverUp = false
  try { serverUp = (await fetch(BASE, { cache: 'no-store' })).ok } catch { /* skipped below */ }
  if (!serverUp) console.log(`No dev server at ${BASE}: app checks will be skipped.`)

  step('0. Setup (throwaway accounts)')
  const BIO_A = `bio-of-A-${TS}`
  const BIO_C = `bio-of-C-${TS}`
  const A = await createAccount('a', 'user', { bio: BIO_A, instagram: `ig_a_${TS}`, phone: '+30 6900000001', facebook: `fb_a_${TS}` })
  const B = await createAccount('b', 'user', { bio: `bio-of-B-${TS}` })
  const D = await createAccount('d', 'organizer')
  const C = await createAccount('c', 'artist', { bio: BIO_C, instagram: `ig_c_${TS}`, booking_email: `c${TS}@example.com`, phone: '+30 6900000003' })
  const sA = await session(A)
  const sB = await session(B)
  const sC = await session(C)
  info(`A=${A.username} (user) B=${B.username} (user) C=${C.username} (artist)`)

  const { count: realUsersWithTab } = await admin.from('profiles').select('id', { count: 'exact', head: true })
    .eq('profile_type', 'user').not('network_tab', 'is', null).not('username', 'like', `${UNAME}%`)
  info(`real user rows with network_tab set (their public counts will change in 'after'): ${realUsersWithTab}`)

  // ── 1. anon REST ──
  step('1. anon REST on profiles')
  const aAnon = await anonGet(`profiles?id=eq.${A.id}&select=bio,phone,instagram`)
  check(`anon reads user A's bio/phone/instagram -> ${AFTER ? '[]' : 'row'}`,
    AFTER ? (aAnon.status === 200 && aAnon.body?.length === 0)
          : (aAnon.body?.[0]?.bio === BIO_A && aAnon.body?.[0]?.phone === '+30 6900000001'),
    JSON.stringify(aAnon.body))
  const uAnon = await anonGet(`profiles?profile_type=eq.user&select=id&limit=1`)
  check(`anon GET profile_type=eq.user -> ${AFTER ? '[]' : 'rows'}`,
    AFTER ? (uAnon.status === 200 && uAnon.body?.length === 0) : (uAnon.body?.length > 0), `n=${uAnon.body?.length}`)
  const uThrow = await anonCount(`profiles?profile_type=eq.user&username=like.${UNAME}*`)
  check(`anon sees ${AFTER ? 0 : 2} throwaway user rows`, uThrow === (AFTER ? 0 : 2), `got ${uThrow}`)
  const cAnon = await anonGet(`profiles?id=eq.${C.id}&select=bio,booking_email,phone,instagram`)
  check('anon reads creator C bio/booking_email/phone (unchanged, same row in both modes)',
    cAnon.body?.length === 1 && cAnon.body[0].bio === BIO_C && cAnon.body[0].booking_email === `c${TS}@example.com`
      && cAnon.body[0].phone === '+30 6900000003', JSON.stringify(cAnon.body))

  // ── 2. signed-in REST ──
  step('2. signed-in REST on profiles')
  const read = async (s, id) => (await s.rest.from('profiles').select('id,bio').eq('id', id)).data?.length === 1
  check('session A reads A', await read(sA, A.id))
  check(`session A reads B -> ${AFTER ? 'no' : 'yes (today)'}`, (await read(sA, B.id)) === !AFTER)
  check('session A reads C', await read(sA, C.id))
  check(`session C reads A -> ${AFTER ? 'no' : 'yes (today)'}`, (await read(sC, A.id)) === !AFTER)
  check('session C reads C', await read(sC, C.id))

  const newBio = `bio-of-A-edited-${TS}`
  const upA = await sA.rest.from('profiles').update({ bio: newBio }).eq('id', A.id).select('id,bio')
  check('session A PATCH own bio (return=representation) -> 1 row', !upA.error && upA.data?.length === 1 && upA.data[0].bio === newBio,
    upA.error?.message ?? `rows=${upA.data?.length}`)
  const upB = await sA.rest.from('profiles').update({ bio: 'hacked' }).eq('id', B.id).select('id')
  check('session A PATCH on B -> 0 rows', !upB.error && (upB.data?.length ?? 0) === 0, upB.error?.message ?? `rows=${upB.data?.length}`)
  const bAfter = await must(admin.from('profiles').select('bio').eq('id', B.id).single(), 'reread B')
  check('B bio untouched', bAfter.bio === `bio-of-B-${TS}`)

  // ── 3. username_taken ──
  step('3. rpc/username_taken')
  const t1 = await sA.rest.rpc('username_taken', { p_username: B.username })
  const t2 = await sA.rest.rpc('username_taken', { p_username: B.username.toUpperCase() })
  const t3 = await sA.rest.rpc('username_taken', { p_username: B.username, p_exclude: B.id })
  const t4 = await sA.rest.rpc('username_taken', { p_username: `${UNAME}free_${TS}` })
  check('existing username -> true', t1.data === true, t1.error?.message)
  check('same name, other case -> true', t2.data === true, t2.error?.message)
  check('own id excluded -> false', t3.data === false, t3.error?.message)
  check('unused name -> false', t4.data === false, t4.error?.message)
  const tAnon = await fetch(`${SUPABASE_URL}/rest/v1/rpc/username_taken`, {
    method: 'POST', headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ p_username: B.username }),
  })
  check('anon rpc/username_taken is rejected', tAnon.status === 401 || tAnon.status === 403, `status ${tAnon.status}`)

  // ── fixtures for app checks (service role) ──
  const future = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10)
  const ev = await must(admin.from('events').insert({
    title: `Deltest event ${TS}`, date: future, time: '23:00', venue: 'Deltest', city: 'Αθήνα', profile_id: D.id, status: 'approved',
  }).select('id').single(), 'event')
  ids.events.push(ev.id)
  const mixIns = await admin.from('mixes').insert({
    title: `Deltest mix ${TS}`, artist: C.display_name, status: 'approved', profile_id: C.id,
  }).select('id').single()
  if (mixIns.data) ids.mixes.push(mixIns.data.id)
  const ls = await must(admin.from('listings').insert({
    profile_id: C.id, type: 'seeking', role: 'DJ', title: `Deltest listing ${TS}`,
  }).select('id').single(), 'listing')
  ids.listings.push(ls.id)

  // ── 4. app ──
  step('4. app behaviour')
  if (!serverUp) {
    for (const n of ['anon /profile/A', 'anon /profile/C', 'follow -> bell', 'interest -> dashboard', 'username change',
      'login + dashboard', 'sitemap/network/search counts (app part)', 'event page', 'mix page'])
      skip(n, 'no dev server')
  } else {
    const pa = await anonApp(`/profile/${encodeURIComponent(A.username)}`)
    check('anon /profile/<A> -> 404', pa.status === 404, `status ${pa.status}`)
    check("anon /profile/<A> HTML does not contain A's bio (metadata)", !pa.text.includes(BIO_A) && !pa.text.includes(newBio))
    const pc = await anonApp(`/profile/${encodeURIComponent(C.username)}`)
    check('anon /profile/<C> -> 200 with bio and social', pc.status === 200 && pc.text.includes(BIO_C) && pc.text.includes(`ig_c_${TS}`),
      `status ${pc.status}`)

    const fol = await sA.call('POST', '/api/follows', { profile_id: C.id })
    check('A follows C (POST /api/follows)', fol.status === 200, `status ${fol.status}`)
    const bell = await sC.call('GET', '/api/notifications')
    const nf = bell.body?.notifications?.find(n => n.type === 'new_follow')
    check("C's bell shows A's name", nf?.actor?.display_name === A.display_name, JSON.stringify(nf?.actor ?? null))

    const intr = await sA.call('POST', `/api/listings/${ls.id}/interest`)
    check("A (plain user) expresses interest in C's listing", intr.status === 200, `status ${intr.status} ${intr.text.slice(0, 80)}`)
    const dash = await sC.call('GET', '/dashboard')
    check("C's dashboard shows A's name", dash.status === 200 && dash.text.includes(A.display_name), `status ${dash.status}`)

    const clash = await sA.call('PATCH', '/api/profiles', { username: B.username })
    const clashCase = await sA.call('PATCH', '/api/profiles', { username: B.username.toUpperCase() })
    check('A -> existing username is rejected', clash.status === 400, `status ${clash.status} ${clash.text.slice(0, 80)}`)
    check('A -> existing username in other case is rejected', clashCase.status === 400, `status ${clashCase.status}`)
    const own = await sA.call('PATCH', '/api/profiles', { username: A.username.toUpperCase() })
    check('A may re-case their own username', own.status === 200, `status ${own.status}`)
    await admin.from('profiles').update({ username: A.username }).eq('id', A.id)

    const dA = await sA.call('GET', '/dashboard')
    check('A: dashboard loads (no redirect)', dA.status === 200, `status ${dA.status}`)
    const { error: loginErr } = await createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } })
      .auth.signInWithPassword({ email: A.email, password: A.password })
    check('A: password login works', !loginErr, loginErr?.message)

    const evp = await anonApp(`/events/${ev.id}`)
    check('event page shows the host (organizer D)', evp.status === 200 && evp.text.includes(D.display_name), `status ${evp.status}`)
    if (mixIns.data) {
      const mp = await anonApp(`/nightwaves/mix/${mixIns.data.id}`)
      check('mix page shows the linked profile', mp.status === 200 && mp.text.includes(C.display_name), `status ${mp.status}`)
    } else skip('mix page', `mix fixture insert failed: ${mixIns.error?.message}`)
  }

  // ── 5. public counts (snapshot) ──
  step('5. network / search / sitemap counts (throwaway rows excluded)')
  const ex = `username=not.like.${UNAME}*`
  const counts = {
    network_all: await anonCount(`profiles?network_tab=not.is.null&${ex}`),
    artists: await anonCount(`profiles?network_tab=eq.Artists&${ex}`),
    venues: await anonCount(`profiles?network_tab=eq.Venues&${ex}`),
    professionals: await anonCount(`profiles?network_tab=eq.Professionals&${ex}`),
    search_a: await anonCount(`profiles?network_tab=not.is.null&or=(display_name.ilike.*a*,network_subcategory.ilike.*a*)&${ex}`),
  }
  // /sitemap.xml is not checked: app/sitemap.ts selects a non-existent updated_at
  // column, so its dynamic entries are empty today. network_all above runs the
  // same filter (network_tab is not null) the sitemap would use.
  skip('sitemap.xml profile entries', 'sitemap selects updated_at, which does not exist; dynamic routes are empty (pre-existing)')
  console.log('counts:', JSON.stringify(counts))
  if (MODE === 'before') {
    writeFileSync(SNAPSHOT, JSON.stringify(counts))
    info(`snapshot written to ${SNAPSHOT}`)
  } else if (existsSync(SNAPSHOT)) {
    const before = JSON.parse(readFileSync(SNAPSHOT, 'utf8'))
    for (const k of Object.keys(counts)) {
      if (before[k] === undefined) { skip(`count ${k}`, 'not in snapshot'); continue }
      check(`count ${k} unchanged (${before[k]} -> ${counts[k]})`, before[k] === counts[k])
    }
  } else skip('count comparison', `no snapshot at ${SNAPSHOT}, run 'before' first`)
}

let failed = false
try {
  await main()
} catch (e) {
  failed = true
  console.error(`\nABORTED: ${e.message}`)
} finally {
  step('Cleanup')
  for (const id of ids.events) await admin.from('events').delete().eq('id', id)
  for (const id of ids.mixes) await admin.from('mixes').delete().eq('id', id)
  for (const id of ids.listings) await admin.from('listings').delete().eq('id', id)
  for (const acct of created) {
    try { await destroy(acct) } catch (e) { failed = true; console.error(`cleanup ${acct.email}: ${e.message}`) }
  }
  const { count } = await admin.from('profiles').select('id', { count: 'exact', head: true }).like('username', `${UNAME}%${TS}`)
  console.log(`throwaway profiles left: ${count}`)
  if (count) failed = true
}

const bad = results.filter(r => !r.ok)
console.log(`\n${results.length - bad.length}/${results.length} checks passed (${MODE})`)
if (notTested.length) console.log(`Not tested: ${notTested.join('; ')}`)
if (bad.length) console.log(`FAILED: ${bad.map(b => b.name).join(' | ')}`)
process.exit(bad.length || failed ? 1 : 0)
