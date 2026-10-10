#!/usr/bin/env node
/**
 * Live checks for the Nominatim fallback: real Google short links and real
 * Nominatim, through app/lib/mapsResolve.ts + app/lib/mapsGeocode.ts (no
 * dev server, no auth). Every Nominatim request is timestamped to show the
 * global 1 req/s queue. Reads NOMINATIM_USER_AGENT from .env.local and
 * never prints it.
 *
 *   node scripts/test-maps-geocode-live.mjs
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveMapsUrl, MapsResolveError } from '../app/lib/mapsResolve.ts'
import { extractPlaceText, geocodeNominatim, resetNominatimState, NOMINATIM_MIN_INTERVAL_MS } from '../app/lib/mapsGeocode.ts'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
for (const l of readFileSync(resolve(ROOT, '.env.local'), 'utf8').split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
  if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}
if (!process.env.NOMINATIM_USER_AGENT) { console.error('NOMINATIM_USER_AGENT missing in .env.local'); process.exit(1) }

const NEA_IONIA = '14231', EGALEO = '12244', VOLOS = { lat: 39.365806, lng: 22.928561 }
const requests = []
const timedFetch = async (url, init) => {
  requests.push({ at: Date.now(), url })
  return fetch(url, init)
}

let passed = 0, failed = 0
async function test(name, fn) {
  try { await fn(); passed++; console.log(`  ok   ${name}`) }
  catch (e) { failed++; console.log(`  FAIL ${name}\n       ${e.message}`) }
}

/** Same steps as POST /api/maps/resolve, minus auth. */
async function resolveLink(link) {
  try {
    const r = await resolveMapsUrl(link)
    return { source: 'url', lat: r.lat, lng: r.lng, finalUrl: r.finalUrl }
  } catch (e) {
    if (!(e instanceof MapsResolveError) || e.code !== 'no_coords' || !e.finalUrl) return { error: e.code ?? String(e) }
    const place = extractPlaceText(e.finalUrl)
    const hit = place ? await geocodeNominatim(place, { fetchImpl: timedFetch }) : null
    if (!place || !hit) return { error: 'no_coords', placeText: place?.text }
    return { source: 'nominatim', lat: hit.lat, lng: hit.lng, placeText: place.text, precision: hit.precision, unverified: hit.unverified }
  }
}

/** Reverse lookup of the returned point (1 extra request, through the same queue rules). */
async function areaOf(lat, lng) {
  const wait = (requests.at(-1)?.at ?? 0) + NOMINATIM_MIN_INTERVAL_MS - Date.now()
  if (wait > 0) await new Promise(r => setTimeout(r, wait))
  requests.push({ at: Date.now(), url: 'reverse' })
  const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=jsonv2&accept-language=el&zoom=18`,
    { headers: { 'user-agent': process.env.NOMINATIM_USER_AGENT } })
  const j = await res.json()
  return { postcode: (j.address?.postcode ?? '').replace(/\s/g, ''), display: j.display_name }
}

const show = r => JSON.stringify(r)

console.log('real links')
resetNominatimState()
await test('Link 1 (Latin address): Nea Ionia 142 31 or no_coords, never Volos', async () => {
  const r = await resolveLink('https://maps.app.goo.gl/1wk9aEsShzbEcEfb7')
  console.log(`       ${show(r)}`)
  if (r.error) { assert.equal(r.error, 'no_coords'); return }
  assert.equal(r.source, 'nominatim')
  assert.ok(Math.abs(r.lat - VOLOS.lat) > 0.5, 'returned Volos')
  const a = await areaOf(r.lat, r.lng)
  console.log(`       reverse: ${a.display}`)
  assert.equal(a.postcode, NEA_IONIA)
})
await test('Link 3: Egaleo 122 44', async () => {
  const r = await resolveLink('https://maps.app.goo.gl/5uB215aGnKZxH6eZ6')
  console.log(`       ${show(r)}`)
  assert.equal(r.source, 'nominatim')
  const a = await areaOf(r.lat, r.lng)
  console.log(`       reverse: ${a.display}`)
  assert.equal(a.postcode, EGALEO)
})
await test('Control: coordinates straight from the URL, no Nominatim', async () => {
  const before = requests.length
  const r = await resolveLink('https://maps.app.goo.gl/4A1zptjKzYvK26Nk7')
  console.log(`       ${show(r)}`)
  assert.equal(r.source, 'url')
  assert.equal(requests.length, before)
})

console.log('synthetic place URLs (Nominatim only)')
await test('Link 1 in Greek: Nea Ionia 142 31', async () => {
  const place = extractPlaceText('https://www.google.com/maps/place/Τσιπουράδικο+«Tam+Tiririm»,+Αγίων+Αναργύρων+6,+Νέα+Ιωνία+142+31/data=x')
  const hit = await geocodeNominatim(place, { fetchImpl: timedFetch })
  console.log(`       ${show(hit)}`)
  assert.ok(hit)
  assert.equal((await areaOf(hit.lat, hit.lng)).postcode, NEA_IONIA)
})
await test('no postcode in link: unverified: true', async () => {
  const place = extractPlaceText('https://www.google.com/maps/place/Βεάκη+25,+Αιγάλεω/data=x')
  const hit = await geocodeNominatim(place, { fetchImpl: timedFetch })
  console.log(`       ${show(hit)}`)
  assert.ok(hit)
  assert.equal(hit.unverified, true)
})

console.log('global queue')
await test('3 parallel lookups: at most 1 request per second to Nominatim', async () => {
  resetNominatimState()
  const start = requests.length
  const texts = ['Ερμού+10,+Αθήνα+105+63', 'Πατησίων+50,+Αθήνα+104+34', 'Τσιμισκή+20,+Θεσσαλονίκη+546+24']
  const out = await Promise.all(texts.map(t => geocodeNominatim(extractPlaceText(`https://www.google.com/maps/place/${t}/data=x`), { fetchImpl: timedFetch })))
  const mine = requests.slice(start)
  const gaps = mine.slice(1).map((r, i) => r.at - mine[i].at)
  console.log(`       ${mine.length} requests, gaps ${gaps.join(', ')} ms, results ${out.map(h => (h ? `${h.lat.toFixed(4)},${h.lng.toFixed(4)}` : 'null')).join(' | ')}`)
  assert.ok(mine.length >= 3 && mine.length <= 6)
  assert.ok(gaps.every(g => g >= 1000), `gaps ${gaps.join(', ')}`)
})

console.log(`\n${passed} passed, ${failed} failed (${requests.length} Nominatim requests in total)`)
process.exit(failed ? 1 : 0)
