#!/usr/bin/env node
/**
 * Offline tests for the Nominatim fallback in app/lib/mapsGeocode.ts and
 * validateCoords in app/lib/mapsCoords.ts. Mock fetch, no network.
 *
 *   node scripts/test-maps-geocode.mjs
 */
import assert from 'node:assert/strict'
import { validateCoords, spotCoordsError } from '../app/lib/mapsCoords.ts'
import {
  extractPlaceText, geocodeNominatim, precisionOf, resetNominatimState, stripAccents, NOMINATIM_MIN_INTERVAL_MS,
} from '../app/lib/mapsGeocode.ts'

let passed = 0, failed = 0
async function test(name, fn) {
  try { await fn(); passed++; console.log(`  ok   ${name}`) }
  catch (e) { failed++; console.log(`  FAIL ${name}\n       ${e.message}`) }
}

const LINK1 = 'https://www.google.com/maps/place/%CE%A4%CF%83%CE%B9%CF%80%CE%BF%CF%85%CF%81%CE%AC%CE%B4%CE%B9%CE%BA%CE%BF+%C2%ABTam+Tiririm%C2%BB,+Ag.+Anargiron+6,+Nea+Ionia+142+31/data=!4m2!3m1!1s0x14a1a3001818316d:0x6e7c9be51e8f3bf2!18m1!1e1'
// Mimis's share link (maps.app.goo.gl/TPSMdRmmQvXHJJtV9), after the first redirect: no @lat,lng, no !3d!4d.
const OULALOUM = 'https://www.google.com/maps/place/Oulalo%C3%BAm,+Fidiou+52,+Ilioupoli+163+41/data=!4m2!3m1!1s0x14a1bdcdce193e11:0x47a779e326a34809!18m1!1e1?coh=192189&entry=gps&g_st=ac'
const LINK3 = 'https://www.google.com/maps/place/Veaki+25,+Egaleo+122+44/data=!4m2!3m1!1s0x14a1bca1ba2f45ef:0x355dce829e87d3db!18m1!1e1'
const CONTROL = 'https://www.google.com/maps/place/37.983496,23.669933/data=!4m6!3m5!1s0!7e2!8m2!3d37.9834959!4d23.6699333!18m1!1e1'

console.log('extractPlaceText')
await test('Link 1: name, «» removed, address and postcode split', () => assert.deepEqual(extractPlaceText(LINK1), {
  text: 'Τσιπουράδικο Tam Tiririm, Ag. Anargiron 6, Nea Ionia 142 31',
  name: 'Τσιπουράδικο Tam Tiririm',
  addressParts: ['Ag. Anargiron 6', 'Nea Ionia'],
  postcode: '142 31',
}))
await test('Link 3: street with number first means no name', () => assert.deepEqual(extractPlaceText(LINK3), {
  text: 'Veaki 25, Egaleo 122 44', name: null, addressParts: ['Veaki 25', 'Egaleo'], postcode: '122 44',
}))
await test('Oulaloum: accented Latin name, address and postcode split', () => assert.deepEqual(extractPlaceText(OULALOUM), {
  text: 'Oulaloúm, Fidiou 52, Ilioupoli 163 41',
  name: 'Oulaloúm',
  addressParts: ['Fidiou 52', 'Ilioupoli'],
  postcode: '163 41',
}))
await test('control: /place/lat,lng returns null', () => assert.equal(extractPlaceText(CONTROL), null))
await test('Greek text, + as space', () => assert.deepEqual(
  extractPlaceText('https://www.google.com/maps/place/Βεάκη+25,+Αιγάλεω+122+44/data=!1s0x1:0x2'),
  { text: 'Βεάκη 25, Αιγάλεω 122 44', name: null, addressParts: ['Βεάκη 25', 'Αιγάλεω'], postcode: '122 44' }))
await test('@lat,lng segment after the place is ignored', () => assert.deepEqual(
  extractPlaceText('https://www.google.com/maps/place/Bar+Foo,+Ermou+10,+Athina+105+63/@37.97,23.72,17z/data=!3m1'),
  { text: 'Bar Foo, Ermou 10, Athina 105 63', name: 'Bar Foo', addressParts: ['Ermou 10', 'Athina'], postcode: '105 63' }))
await test('postcode without space is still found', () => assert.equal(
  extractPlaceText('https://www.google.com/maps/place/Ermou+10,+Athina+10563/data=x').postcode, '105 63'))
await test('house number with letter / range is a street', () => {
  assert.equal(extractPlaceText('https://www.google.com/maps/place/Λεωφ.+Συγγρού+120Α,+Αθήνα').name, null)
  assert.equal(extractPlaceText('https://www.google.com/maps/place/Ermou+10-12,+Athina').name, null)
})
await test('no postcode gives postcode null', () => assert.equal(
  extractPlaceText('https://www.google.com/maps/place/Bar+Foo,+Ermou+10,+Athina/data=x').postcode, null))
await test('name only: nothing to look up', () => assert.deepEqual(
  extractPlaceText('https://www.google.com/maps/place/Bar+Foo/data=x').addressParts, []))
await test('no /place/ returns null', () => {
  assert.equal(extractPlaceText('https://www.google.com/maps/@37.9,23.7,17z'), null)
  assert.equal(extractPlaceText('https://www.google.com/maps/search/Bar+Foo'), null)
  assert.equal(extractPlaceText('not a url'), null)
})
await test('malformed % escape does not throw', () => assert.ok(
  extractPlaceText('https://www.google.com/maps/place/Ermou+10,+Athina+%E0%A4%A/data=x')))

console.log('validateCoords')
await test('valid in Greece', () => assert.deepEqual(validateCoords(37.98, 23.72), { ok: true, lat: 37.98, lng: 23.72, inGreece: true }))
await test('valid outside Greece is a warning, not an error', () => assert.deepEqual(
  validateCoords(48.85, 2.35), { ok: true, lat: 48.85, lng: 2.35, inGreece: false }))
await test('edges are valid', () => {
  assert.equal(validateCoords(90, 180).ok, true)
  assert.equal(validateCoords(-90, -180).ok, true)
})
await test('out of range rejected', () => {
  assert.equal(validateCoords(90.1, 0).ok, false)
  assert.equal(validateCoords(0, -180.1).ok, false)
})
await test('non-numbers rejected (strings, null, NaN, Infinity)', () => {
  for (const [a, b] of [['37.9', 23.7], [37.9, null], [null, null], [undefined, 1], [NaN, 1], [1, Infinity]]) {
    assert.equal(validateCoords(a, b).ok, false, `${a},${b}`)
  }
})

console.log('spotCoordsError')
await test('create: both valid numbers required', () => {
  assert.equal(spotCoordsError({ lat: 37.9, lng: 23.7 }, { required: true }), null)
  for (const b of [{}, { lat: 37.9 }, { lat: null, lng: null }, { lat: '37.9', lng: 23.7 }, { lat: 91, lng: 23.7 }]) {
    assert.ok(spotCoordsError(b, { required: true }), JSON.stringify(b))
  }
})
await test('owner edit: absent is fine, null or partial is refused', () => {
  assert.equal(spotCoordsError({ name: 'x' }), null)
  assert.equal(spotCoordsError({ lat: 37.9, lng: 23.7 }), null)
  for (const b of [{ lat: null, lng: null }, { lat: 37.9 }, { lng: 23.7 }, { lat: 37.9, lng: -181 }]) {
    assert.ok(spotCoordsError(b), JSON.stringify(b))
  }
})
await test('admin edit: both null allowed, partial still refused', () => {
  assert.equal(spotCoordsError({ lat: null, lng: null }, { allowEmpty: true }), null)
  assert.equal(spotCoordsError({ lat: undefined, lng: undefined, name: 'x' }, { allowEmpty: true }), null)
  assert.ok(spotCoordsError({ lat: 37.9, lng: null }, { allowEmpty: true }))
})

console.log('precisionOf')
await test('road is street', () => assert.equal(precisionOf({ category: 'highway', type: 'residential', addresstype: 'road' }), 'street'))
await test('house / building / POI is building', () => {
  assert.equal(precisionOf({ category: 'place', type: 'house', addresstype: 'place' }), 'building')
  assert.equal(precisionOf({ category: 'building', type: 'yes', addresstype: 'building' }), 'building')
  assert.equal(precisionOf({ category: 'amenity', type: 'restaurant', addresstype: 'amenity' }), 'building')
})
await test('suburb / city / postcode area is rejected', () => {
  assert.equal(precisionOf({ category: 'place', type: 'suburb', addresstype: 'suburb' }), null)
  assert.equal(precisionOf({ category: 'boundary', type: 'administrative', addresstype: 'city' }), null)
  assert.equal(precisionOf({ category: 'place', type: 'postcode', addresstype: 'postcode' }), null)
})

console.log('geocodeNominatim (mock fetch)')
const UA = 'Nightup-test/1.0 (test@example.invalid)'
const road = (lat, lon, postcode) => ({ lat: String(lat), lon: String(lon), category: 'highway', type: 'residential', addresstype: 'road', address: { postcode } })
const VOLOS = road(39.365806, 22.928561, '384 45')
const NEA_IONIA = road(38.042582, 23.750542, '142 31')
const EGALEO = road(37.985103, 23.670716, '122 44')
const FIDIOU = road(37.92059, 23.7537, '163 41')
const CAFE = { lat: '37.92336', lon: '23.75499', category: 'amenity', type: 'cafe', addresstype: 'amenity', address: { postcode: '163 41' } }
function mock(respond, calls = []) {
  return async (url, init) => {
    const u = new URL(url)
    calls.push({ params: Object.fromEntries(u.searchParams), init, at: Date.now() })
    return new Response(JSON.stringify(respond(u.searchParams)), { status: 200, headers: { 'content-type': 'application/json' } })
  }
}

await test('Link 1 Latin: Volos (384 45) is filtered out, structured search tried, never Volos', async () => {
  resetNominatimState()
  const calls = []
  const hit = await geocodeNominatim(extractPlaceText(LINK1), { userAgent: UA, fetchImpl: mock(() => [VOLOS], calls) })
  assert.equal(hit, null)
  assert.equal(calls.length, 3)
  assert.equal(calls[0].params.q, 'Τσιπουραδικο Tam Tiririm, Nea Ionia')
  assert.equal(calls[1].params.q, 'Ag. Anargiron 6, Nea Ionia')
  assert.deepEqual(
    { street: calls[2].params.street, city: calls[2].params.city, postalcode: calls[2].params.postalcode, country: calls[2].params.country },
    { street: 'Ag. Anargiron 6', city: 'Nea Ionia', postalcode: '142 31', country: 'gr' })
  assert.equal(calls[2].params.q, undefined)
})
await test('Link 1: structured search finding Nea Ionia 142 31 is accepted', async () => {
  resetNominatimState()
  const hit = await geocodeNominatim(extractPlaceText(LINK1), {
    userAgent: UA, fetchImpl: mock(p => (p.get('q') ? [VOLOS] : [NEA_IONIA])),
  })
  assert.deepEqual(hit, { lat: 38.042582, lng: 23.750542, precision: 'street', unverified: false })
})
await test('Greek Link 1: first matching postcode wins, Volos skipped even when first', async () => {
  resetNominatimState()
  const calls = []
  const place = extractPlaceText('https://www.google.com/maps/place/Αγίων+Αναργύρων+6,+Νέα+Ιωνία+142+31/data=x')
  const hit = await geocodeNominatim(place, { userAgent: UA, fetchImpl: mock(() => [VOLOS, NEA_IONIA], calls) })
  assert.deepEqual(hit, { lat: 38.042582, lng: 23.750542, precision: 'street', unverified: false })
  assert.equal(calls.length, 1)
})
await test('Link 3: Egaleo 122 44 accepted in one call', async () => {
  resetNominatimState()
  const calls = []
  const hit = await geocodeNominatim(extractPlaceText(LINK3), { userAgent: UA, fetchImpl: mock(() => [EGALEO], calls) })
  assert.deepEqual(hit, { lat: 37.985103, lng: 23.670716, precision: 'street', unverified: false })
  assert.equal(calls.length, 1)
  assert.equal(calls[0].params.q, 'Veaki 25, Egaleo')
})
await test('postcode compare ignores spaces', async () => {
  resetNominatimState()
  const hit = await geocodeNominatim(extractPlaceText(LINK3), { userAgent: UA, fetchImpl: mock(() => [road(37.98, 23.67, '12244')]) })
  assert.equal(hit?.lat, 37.98)
})
await test('no postcode in link: first result, unverified: true', async () => {
  resetNominatimState()
  const place = extractPlaceText('https://www.google.com/maps/place/Bar+Foo,+Ermou+10,+Athina/data=x')
  const hit = await geocodeNominatim(place, { userAgent: UA, fetchImpl: mock(() => [road(37.976, 23.728, '105 63')]) })
  assert.deepEqual(hit, { lat: 37.976, lng: 23.728, precision: 'street', unverified: true })
})
await test('Oulaloum: name + city (accents stripped) is the first query and wins in one call', async () => {
  resetNominatimState()
  const calls = []
  const hit = await geocodeNominatim(extractPlaceText(OULALOUM), { userAgent: UA, fetchImpl: mock(() => [CAFE], calls) })
  assert.deepEqual(hit, { lat: 37.92336, lng: 23.75499, precision: 'building', unverified: false })
  assert.equal(calls.length, 1)
  assert.equal(calls[0].params.q, 'Oulaloum, Ilioupoli')
})
await test('Oulaloum: name finds nothing, the address query is tried next; street only gives precision street', async () => {
  resetNominatimState()
  const calls = []
  const hit = await geocodeNominatim(extractPlaceText(OULALOUM), {
    userAgent: UA, fetchImpl: mock(p => (p.get('q') === 'Fidiou 52, Ilioupoli' ? [FIDIOU] : []), calls),
  })
  assert.deepEqual(hit, { lat: 37.92059, lng: 23.7537, precision: 'street', unverified: false })
  assert.deepEqual(calls.map(c => c.params.q), ['Oulaloum, Ilioupoli', 'Fidiou 52, Ilioupoli'])
})
await test('Oulaloum: a same-named place in another area (postcode 564 31) is rejected', async () => {
  resetNominatimState()
  const other = { ...CAFE, lat: '40.67', lon: '22.93', address: { postcode: '564 31' } }
  const calls = []
  const hit = await geocodeNominatim(extractPlaceText(OULALOUM), { userAgent: UA, fetchImpl: mock(() => [other], calls) })
  assert.equal(hit, null)
  assert.equal(calls.length, 3)
})
await test('Oulaloum without postcode: name hit accepted, unverified: true', async () => {
  resetNominatimState()
  const place = extractPlaceText('https://www.google.com/maps/place/Oulalo%C3%BAm,+Fidiou+52,+Ilioupoli/data=x')
  const hit = await geocodeNominatim(place, { userAgent: UA, fetchImpl: mock(() => [CAFE]) })
  assert.deepEqual(hit, { lat: 37.92336, lng: 23.75499, precision: 'building', unverified: true })
})
await test('Greek name and address: no accent stripping needed, name query first', async () => {
  resetNominatimState()
  const calls = []
  const place = extractPlaceText('https://www.google.com/maps/place/Ουλαλούμ,+Φειδίου+52,+Ηλιούπολη+163+41/data=x')
  const hit = await geocodeNominatim(place, { userAgent: UA, fetchImpl: mock(() => [CAFE], calls) })
  assert.equal(hit?.precision, 'building')
  assert.equal(calls[0].params.q, 'Ουλαλουμ, Ηλιούπολη')
})
await test('address-only link sends no name query', async () => {
  resetNominatimState()
  const calls = []
  await geocodeNominatim(extractPlaceText(LINK3), { userAgent: UA, fetchImpl: mock(() => [EGALEO], calls) })
  assert.equal(calls.length, 1)
  assert.equal(calls[0].params.q, 'Veaki 25, Egaleo')
})
await test('never more than 3 requests per lookup', async () => {
  resetNominatimState()
  const calls = []
  await geocodeNominatim(extractPlaceText(OULALOUM), { userAgent: UA, fetchImpl: mock(() => [], calls) })
  assert.equal(calls.length, 3)
})
await test('stripAccents', () => {
  assert.equal(stripAccents('Oulaloúm'), 'Oulaloum')
  assert.equal(stripAccents('Café Zoé'), 'Cafe Zoe')
  assert.equal(stripAccents('Ουλαλούμ'), 'Ουλαλουμ')
})
await test('postcode is not part of the free-text query', async () => {
  resetNominatimState()
  const calls = []
  await geocodeNominatim(extractPlaceText(LINK3), { userAgent: UA, fetchImpl: mock(() => [EGALEO], calls) })
  assert.ok(!calls[0].params.q.includes('122'))
})
await test('request params, User-Agent and timeout signal', async () => {
  resetNominatimState()
  const calls = []
  await geocodeNominatim(extractPlaceText(LINK3), { userAgent: UA, fetchImpl: mock(() => [EGALEO], calls) })
  const p = calls[0].params
  assert.deepEqual([p.format, p.limit, p.countrycodes, p['accept-language'], p.addressdetails], ['jsonv2', '3', 'gr', 'el', '1'])
  assert.equal(calls[0].init.headers['user-agent'], UA)
  assert.ok(calls[0].init.signal instanceof AbortSignal)
})
await test('no User-Agent: no request at all', async () => {
  resetNominatimState()
  const saved = process.env.NOMINATIM_USER_AGENT
  delete process.env.NOMINATIM_USER_AGENT
  let called = false
  const hit = await geocodeNominatim(extractPlaceText(LINK3), { fetchImpl: async () => { called = true; return new Response('[]') } })
  if (saved !== undefined) process.env.NOMINATIM_USER_AGENT = saved
  assert.equal(hit, null)
  assert.equal(called, false)
})
await test('coarse result (suburb) is not a pin', async () => {
  resetNominatimState()
  const suburb = { lat: '37.98', lon: '23.67', category: 'place', type: 'suburb', addresstype: 'suburb', address: { postcode: '122 44' } }
  assert.equal(await geocodeNominatim(extractPlaceText(LINK3), { userAgent: UA, fetchImpl: mock(() => [suburb]) }), null)
})
await test('HTTP 500 / network error / bad JSON give null, never throw', async () => {
  resetNominatimState()
  const place = extractPlaceText(LINK3)
  assert.equal(await geocodeNominatim(place, { userAgent: UA, fetchImpl: async () => new Response('err', { status: 500 }) }), null)
  resetNominatimState()
  assert.equal(await geocodeNominatim(place, { userAgent: UA, fetchImpl: async () => { throw new Error('timeout') } }), null)
  resetNominatimState()
  assert.equal(await geocodeNominatim(place, { userAgent: UA, fetchImpl: async () => new Response('<html>') }), null)
})
await test('cache: same query twice is one request', async () => {
  resetNominatimState()
  const calls = []
  const f = mock(() => [EGALEO], calls)
  await geocodeNominatim(extractPlaceText(LINK3), { userAgent: UA, fetchImpl: f })
  await geocodeNominatim(extractPlaceText(LINK3), { userAgent: UA, fetchImpl: f })
  assert.equal(calls.length, 1)
})
await test('failures are not cached', async () => {
  resetNominatimState()
  let n = 0
  // Both requests of the first lookup (free text + structured) fail.
  const f = async () => (++n <= 2 ? new Response('err', { status: 503 }) : new Response(JSON.stringify([EGALEO])))
  assert.equal(await geocodeNominatim(extractPlaceText(LINK3), { userAgent: UA, fetchImpl: f }), null)
  assert.equal((await geocodeNominatim(extractPlaceText(LINK3), { userAgent: UA, fetchImpl: f }))?.lat, 37.985103)
})
await test(`3 parallel lookups: requests at least ${NOMINATIM_MIN_INTERVAL_MS} ms apart`, async () => {
  resetNominatimState()
  const calls = []
  const f = mock(() => [EGALEO], calls)
  const urls = ['Veaki+25,+Egaleo+122+44', 'Veaki+27,+Egaleo+122+44', 'Veaki+29,+Egaleo+122+44']
    .map(s => extractPlaceText(`https://www.google.com/maps/place/${s}/data=x`))
  await Promise.all(urls.map(p => geocodeNominatim(p, { userAgent: UA, fetchImpl: f })))
  assert.equal(calls.length, 3)
  const gaps = calls.slice(1).map((c, i) => c.at - calls[i].at)
  assert.ok(gaps.every(g => g >= NOMINATIM_MIN_INTERVAL_MS - 5), `gaps ${gaps.join(', ')} ms`)
  console.log(`       gaps: ${gaps.join(', ')} ms`)
})

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
