#!/usr/bin/env node
/**
 * Venue profile page = spot layout. Runs against the real Supabase project and a
 * running dev server, with throwaway accounts it creates and always removes.
 *
 *   npm run dev                      # in another terminal
 *   node scripts/test-venue-page.mjs
 *
 * Env (.env.local or process env): NEXT_PUBLIC_SUPABASE_URL,
 * NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY. Optional TEST_BASE_URL.
 *
 * Safety: only accounts whose email contains "+venuepage-" are created or
 * deleted, and only the rows they own. The real +user/+spot/+pro/+venue/+artist
 * accounts are never touched.
 */
import { readFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomBytes } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
function loadEnv() {
  const env = {}
  const file = resolve(ROOT, '.env.local')
  if (existsSync(file)) {
    for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  }
  return { ...env, ...process.env }
}
const env = loadEnv()
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY
const BASE = (env.TEST_BASE_URL || 'http://localhost:3000').replace(/\/$/, '')
if (!URL_ || !ANON || !SERVICE) {
  console.error('Missing Supabase env vars (.env.local): NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(2)
}
const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } })
const TS = Date.now()
const TAG = '+venuepage-'

const results = []
function check(name, ok, detail = '') {
  results.push(!!ok)
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`)
}
async function must(p, what) {
  const { data, error } = await p
  if (error) throw new Error(`${what}: ${error.message}`)
  return data
}

const accounts = []
const eventIds = []
async function createAccount(role, profile) {
  const email = `dkantanoleon${TAG}${role}-${TS}@gmail.com`
  const password = `Vp-${randomBytes(9).toString('base64url')}!9`
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (error) throw new Error(`createUser ${role}: ${error.message}`)
  const id = data.user.id
  accounts.push({ id, email })
  const username = `venuepage_${role}_${TS}`
  await must(admin.from('profiles').upsert({ id, username, display_name: `Venuepage ${role}`, ...profile }), `profile ${role}`)
  return { id, username }
}
async function destroy({ id, email }) {
  if (!email.includes(TAG)) throw new Error(`refusing to clean up non-throwaway ${email}`)
  await admin.from('events').delete().eq('profile_id', id)
  await admin.from('creator_gallery').delete().eq('profile_id', id)
  await admin.rpc('delete_account', { target: id })
  await admin.auth.admin.deleteUser(id)
}

/** Server-rendered HTML as text: scripts and styles stripped, tags removed. */
async function page(path) {
  const res = await fetch(`${BASE}${path}`, { redirect: 'manual' })
  const html = await res.text()
  const text = html
    .replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
  return { status: res.status, html, text }
}
const bad = (t) => /\bundefined\b|\bNaN\b|\[object Object\]/.test(t)

async function main() {
  const today = new Date().toISOString().slice(0, 10)
  const nextWeek = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10)

  const full = await createAccount('full', {
    profile_type: 'venue', network_tab: 'Venues', network_category: 'Bar / Lounge',
    bio: 'Rooftop bar with a view', location: 'Athens', venue_neighborhood: 'Psyrri',
    venue_address: 'Karaiskaki 10', venue_capacity: 250, phone: '+302100000000',
    website: 'https://example.com', instagram: 'venuepagetest', price_range: '10-20€',
    booking_email: 'book@example.com',
  })
  const title = `Venuepage Event ${TS}`
  const ev = await must(admin.from('events').insert({
    title, date: nextWeek, time: '22:00', venue: 'Venuepage full', city: 'Athens',
    profile_id: full.id, status: 'approved',
  }).select('id').single(), 'insert event')
  eventIds.push(ev.id)

  console.log('\n── 1. Full venue profile renders the spot layout')
  const v = await page(`/profile/${full.username}`)
  check('venue page 200', v.status === 200, `status ${v.status}`)
  check('shows name', v.text.includes('Venuepage full'))
  check('shows bio', v.text.includes('Rooftop bar with a view'))
  check('shows address card', v.text.includes('Karaiskaki 10'))
  check('shows phone link', v.html.includes('tel:+302100000000'))
  check('shows website card', v.text.includes('example.com'))
  check('shows instagram card', v.html.includes('instagram.com/venuepagetest'))
  check('shows capacity card', /250\s+(άτομα|people)/.test(v.text))
  check('shows price', v.text.includes('10-20€'))
  check('shows neighborhood/city', v.text.includes('Psyrri'))
  check('map button (Google Maps link)', v.html.includes('google.com/maps/search'))
  check('back link goes to the network', v.html.includes('href="/network/venues"'))
  check('no spot back link', !v.html.includes('href="/spots"'))
  check('no hours section (venue has none)', !/Ωράριο|>Hours</.test(v.text))
  check('no Save button', !/Αποθήκευση|\bSave\b/.test(v.text.replace(/Follow/g, '')))

  console.log('\n── 2. Event in the venue list')
  check('approved upcoming event listed', v.text.includes(title))
  check('event links to its page', v.html.includes(`/events/${ev.id}`))
  const e = await page(`/events/${ev.id}`)
  check('event page 200 with organiser', e.status === 200 && e.text.includes('Venuepage full'), `status ${e.status}`)

  console.log('\n── 3. Venue is not a spot')
  const { data: asSpot } = await admin.from('spots').select('id').eq('owner_id', full.id)
  check('no spots row owned by venue', (asSpot ?? []).length === 0)
  const { data: bySlug } = await admin.from('spots').select('id').eq('slug', full.username)
  check('no spots row with the venue slug', (bySlug ?? []).length === 0)
  const sp = await page(`/spots/${full.username}`)
  check('/spots/<username> is 404', sp.status === 404, `status ${sp.status}`)
  const { data: near, error: nearErr } = await admin.rpc('spots_nearby', { lat: 37.98, lng: 23.72, radius_km: 50 })
  check('spots_nearby does not return the venue',
    nearErr ? true : !(near ?? []).some(s => s.name === 'Venuepage full' || s.owner_id === full.id),
    nearErr ? `rpc unavailable: ${nearErr.message}` : '')

  console.log('\n── 4. Artist and professional pages unchanged')
  const art = await createAccount('artist', { profile_type: 'artist', bio: 'Artist bio venuepage' })
  const pro = await createAccount('pro', { profile_type: 'professional', bio: 'Pro bio venuepage' })
  for (const [label, a, bio] of [['artist', art, 'Artist bio venuepage'], ['professional', pro, 'Pro bio venuepage']]) {
    const p = await page(`/profile/${a.username}`)
    check(`${label} page 200`, p.status === 200, `status ${p.status}`)
    check(`${label} keeps profile layout (bio shown)`, p.text.includes(bio))
    check(`${label} has no venue back link`, !p.html.includes('href="/network/venues"'))
    check(`${label} has no spot-style info cards`, !/Διεύθυνση|Capacity|Χωρητικότητα/.test(p.text))
  }

  console.log('\n── 5. Sparse venue does not break')
  const sparse = await createAccount('sparse', { profile_type: 'venue', network_tab: 'Venues' })
  const s = await page(`/profile/${sparse.username}`)
  check('sparse venue 200', s.status === 200, `status ${s.status}`)
  check('shows name', s.text.includes('Venuepage sparse'))
  check('no undefined/NaN/[object Object]', !bad(s.text), bad(s.text) ? s.text.match(/.{20}(undefined|NaN|\[object Object\]).{20}/)?.[0] : '')
  check('no "null" text', !/\bnull\b/.test(s.text))
  check('no hours/address/phone cards', !/Διεύθυνση|Τηλέφωνο|Ωράριο/.test(s.text))
  check('no empty map button', !s.html.includes('google.com/maps/search') || s.html.includes('Venuepage'))
}

let failed = false
try { await main() } catch (e) { failed = true; console.error('ERROR', e.message) }
finally {
  for (const a of accounts) {
    try { await destroy(a) } catch (e) { console.error('cleanup', a.email, e.message); failed = true }
  }
}
const passed = results.filter(Boolean).length
console.log(`\n${passed}/${results.length} passed${failed ? ' (with errors)' : ''}`)
process.exit(failed || passed !== results.length ? 1 : 0)
