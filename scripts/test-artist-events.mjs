#!/usr/bin/env node
/**
 * End-to-end test for artists uploading events. Runs against the real Supabase
 * project and a running dev server, using throwaway accounts it creates and
 * always removes.
 *
 *   npm run dev                                   # in another terminal
 *   node scripts/test-artist-events.mjs
 *
 * Env (from .env.local): NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
 * SUPABASE_SERVICE_ROLE_KEY. Optional: TEST_BASE_URL (default
 * http://localhost:3000).
 *
 * Needs migration 20261002000000_private_follows_and_owner_counts.sql
 * (my_event_saved_counts) on the project.
 *
 * Safety: only accounts whose email contains "+arteventtest-" are ever created
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
const THROWAWAY = '+arteventtest-'

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
const createdEventIds = []

async function createAccount(role, profileType) {
  const email = `dkantanoleon${THROWAWAY}${TS}-${role}@gmail.com`
  const password = `At-${randomBytes(9).toString('base64url')}!9`
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (error) throw new Error(`createUser ${role}: ${error.message}`)
  const id = data.user.id
  created.push({ id, email })
  const username = `arteventtest_${role}_${TS}`
  await must(admin.from('profiles').upsert({
    id, username, display_name: `Arteventtest ${role} ${TS}`, profile_type: profileType,
  }), `profile ${role}`)
  return { id, email, password, username, displayName: `Arteventtest ${role} ${TS}` }
}

/** Removes a throwaway account however far the test got. */
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

const page = async (path) => {
  const res = await fetch(`${BASE}${path}`, { cache: 'no-store' })
  return { status: res.status, html: res.status === 200 ? await res.text() : '' }
}

// ── main ─────────────────────────────────────────────────────────────────────
async function main() {
  try {
    const r = await fetch(BASE, { cache: 'no-store' })
    if (!r.ok) throw new Error(String(r.status))
  } catch (e) {
    throw new Error(`Dev server not reachable at ${BASE} (${e.message}). Start it with npm run dev.`)
  }

  step('1. Create throwaway accounts')
  const artist = await createAccount('artist', 'artist')
  const other = await createAccount('otherartist', 'artist')
  const plain = await createAccount('user', 'user')
  const fan = await createAccount('fan', 'user')

  const sArtist = await cookieSession(artist)
  const sOther = await cookieSession(other)
  const sPlain = await cookieSession(plain)
  const sFan = await cookieSession(fan)

  const future = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10)
  const organizerText = `Free Text Collective ${TS}`
  const title = `Arteventtest Night ${TS}`
  const eventBody = {
    title, genres: [], short_description: 'artist event test', date: future, time: '23:00',
    venue: 'Arteventtest Venue', city: 'Αθήνα', contact_email: 'dkantanoleon@gmail.com',
    editorial_owner_name: organizerText,
  }

  step('2. Artist uploads an event')
  const noOrganizer = await sArtist.call('POST', '/api/events', { ...eventBody, editorial_owner_name: '   ' })
  check('organiser is required for artists', noOrganizer.status === 400, `status ${noOrganizer.status}`)

  const create = await sArtist.call('POST', '/api/events', eventBody)
  check('artist can upload an event', create.status === 200 && create.body?.id, `status ${create.status} ${create.body?.error ?? ''}`)
  if (!create.body?.id) throw new Error('event was not created, cannot continue')
  const eventId = create.body.id
  createdEventIds.push(eventId)
  check('event is pending', create.body.status === 'pending')
  check('event is owned by the artist', create.body.profile_id === artist.id)
  check('organiser stored as free text', create.body.editorial_owner_name === organizerText)

  step('3. Pending event is not public')
  check('/events/[id] is 404 while pending', (await page(`/events/${eventId}`)).status === 404)
  check('/events does not list it', !(await page('/events')).html.includes(title))
  check('/events/all does not list it', !(await page('/events/all')).html.includes(title))
  check('artist profile does not list it', !(await page(`/profile/${artist.username}`)).html.includes(title))

  step('4. Admin approves (service role, same update as /api/admin/action)')
  await must(admin.from('events').update({ status: 'approved' }).eq('id', eventId), 'approve')

  const ev = await page(`/events/${eventId}`)
  check('/events/[id] is public after approval', ev.status === 200)
  check('/events lists it', (await page('/events')).html.includes(title))
  const prof = await page(`/profile/${artist.username}`)
  check('artist profile lists it under upcoming events', prof.html.includes(title))
  check('profile lists it once (lineup + profile_id dedupe)',
    (prof.html.match(new RegExp(`/events/${eventId}`, 'g')) ?? []).length <= 2 && prof.html.includes(title))

  step('5. Organiser is plain text, no link to a profile')
  check('event page shows the free-text organiser', ev.html.includes(organizerText))
  check('event page has no link to the artist profile', !ev.html.includes(`/profile/${artist.username}`))

  step('6. Permissions')
  const edit = await sArtist.call('PATCH', `/api/events/${eventId}`, { title: `${title} edited` })
  check('artist can edit own event', edit.status === 200, `status ${edit.status}`)
  const blank = await sArtist.call('PATCH', `/api/events/${eventId}`, { editorial_owner_name: ' ' })
  check('artist cannot blank the organiser', blank.status === 400, `status ${blank.status}`)
  const foreign = await sOther.call('PATCH', `/api/events/${eventId}`, { title: 'hijack' })
  check("artist cannot edit another artist's event", foreign.status === 403, `status ${foreign.status}`)
  const row = await must(admin.from('events').select('title').eq('id', eventId).single(), 'reread')
  check('foreign edit did not change the row', !row.title.includes('hijack'))
  const asUser = await sPlain.call('POST', '/api/events', eventBody)
  check('plain user cannot upload an event', asUser.status === 403, `status ${asUser.status}`)
  const feat = await sArtist.call('POST', '/api/featured-request', { event_id: eventId })
  check('artist cannot request featured', feat.status === 403, `status ${feat.status}`)

  step('7. Saved count on the artist dashboard excludes the artist')
  await must(admin.from('saved_events').insert({ user_id: artist.id, event_id: eventId }), 'artist self-save row')
  await must(admin.from('saved_events').insert({ user_id: fan.id, event_id: eventId }), 'fan save row')
  const { data: counts, error: countErr } = await sArtist.client.rpc('my_event_saved_counts')
  check('my_event_saved_counts callable by artist', !countErr, countErr?.message)
  const mine = (counts ?? []).find(r => String(r.event_id) === String(eventId))
  check('artist sees 1 save (fan only, not themself)', Number(mine?.saved_count) === 1, `count ${mine?.saved_count}`)
  const selfSave = await sArtist.call('POST', '/api/saved/events', { event_id: eventId })
  check('API refuses the host saving their own event', selfSave.status === 403, `status ${selfSave.status}`)
  void sFan
}

let failed = false
try {
  await main()
} catch (e) {
  failed = true
  console.error(`\nERROR: ${e.message}`)
} finally {
  step('Cleanup')
  try {
    if (createdEventIds.length) {
      await admin.from('saved_events').delete().in('event_id', createdEventIds)
      await admin.from('events').delete().in('id', createdEventIds)
    }
  } catch (e) { console.error(`event cleanup: ${e.message}`) }
  for (const acct of created) {
    try { await destroy(acct) } catch (e) { failed = true; console.error(`cleanup ${acct.email}: ${e.message}`) }
  }
  const bad = results.filter(r => !r.ok)
  console.log(`\n${results.length - bad.length}/${results.length} checks passed`)
  if (bad.length || failed) process.exit(1)
}
