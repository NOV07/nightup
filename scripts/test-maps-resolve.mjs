#!/usr/bin/env node
/**
 * Offline tests for Google Maps coordinate extraction and the SSRF guards in
 * app/lib/mapsCoords.ts and app/lib/mapsResolve.ts. No network, no server.
 *
 *   node scripts/test-maps-resolve.mjs
 */
import assert from 'node:assert/strict'
import { extractCoords, isInGreece, isShortMapsLink, firstUrl } from '../app/lib/mapsCoords.ts'
import {
  checkMapsUrl, resolveMapsUrl, takeRateLimit, resetRateLimit, MapsResolveError,
  RATE_LIMIT_MAX, MAX_REDIRECTS,
} from '../app/lib/mapsResolve.ts'

let passed = 0, failed = 0
async function test(name, fn) {
  try { await fn(); passed++; console.log(`  ok   ${name}`) }
  catch (e) { failed++; console.log(`  FAIL ${name}\n       ${e.message}`) }
}

console.log('extractCoords')
await test('@lat,lng', () => assert.deepEqual(
  extractCoords('https://www.google.com/maps/place/Foo/@37.9755,23.7348,17z/data=abc'), { lat: 37.9755, lng: 23.7348 }))
await test('!3d!4d beats @ (place over viewport)', () => assert.deepEqual(
  extractCoords('https://www.google.com/maps/place/Foo/@37.9000,23.7000,17z/data=!4m6!3m5!1s0x0:0x1!8m2!3d37.9755!4d23.7348'),
  { lat: 37.9755, lng: 23.7348 }))
await test('!3d!4d in percent-encoded data=', () => assert.deepEqual(
  extractCoords('https://www.google.com/maps/place/x/data=%213d37.97%214d23.72'), { lat: 37.97, lng: 23.72 }))
await test('negative values', () => assert.deepEqual(
  extractCoords('https://www.google.com/maps/@-33.8688,151.2093,12z'), { lat: -33.8688, lng: 151.2093 }))
await test('?q=lat,lng', () => assert.deepEqual(
  extractCoords('https://www.google.com/maps?q=37.9838,23.7275'), { lat: 37.9838, lng: 23.7275 }))
await test('?q=lat%2Clng (encoded comma)', () => assert.deepEqual(
  extractCoords('https://maps.google.com/?q=37.9838%2C23.7275'), { lat: 37.9838, lng: 23.7275 }))
await test('?ll=', () => assert.deepEqual(
  extractCoords('https://maps.google.com/?ll=37.9838,23.7275&z=15'), { lat: 37.9838, lng: 23.7275 }))
await test('?query=', () => assert.deepEqual(
  extractCoords('https://www.google.com/maps/search/?api=1&query=37.9838,23.7275'), { lat: 37.9838, lng: 23.7275 }))
await test('?q= with a place name is not coordinates', () => assert.equal(
  extractCoords('https://www.google.com/maps?q=Acropolis+Athens'), null))
await test('lat out of range rejected', () => assert.equal(
  extractCoords('https://www.google.com/maps/@91.5,23.7,17z'), null))
await test('lng out of range rejected', () => assert.equal(
  extractCoords('https://www.google.com/maps/@37.9,181.2,17z'), null))
await test('bad !3d falls through to valid @', () => assert.deepEqual(
  extractCoords('https://www.google.com/maps/@37.9,23.7,17z/data=!3d99.0!4d23.7'), { lat: 37.9, lng: 23.7 }))
await test('short link has no coordinates', () => assert.equal(extractCoords('https://maps.app.goo.gl/AbCd123'), null))
await test('garbage / empty', () => { assert.equal(extractCoords(''), null); assert.equal(extractCoords('hello'), null) })
await test('malformed % escape does not throw', () => assert.deepEqual(
  extractCoords('https://www.google.com/maps/@37.9,23.7,17z/%E0%A4%A'), { lat: 37.9, lng: 23.7 }))

console.log('isInGreece / isShortMapsLink / firstUrl')
await test('Athens in Greece', () => assert.equal(isInGreece(37.98, 23.72), true))
await test('Sydney not in Greece', () => assert.equal(isInGreece(-33.87, 151.2), false))
await test('short links recognised', () => {
  assert.equal(isShortMapsLink('https://maps.app.goo.gl/AbCd'), true)
  assert.equal(isShortMapsLink('https://goo.gl/maps/AbCd'), true)
  assert.equal(isShortMapsLink('https://g.co/kgs/AbCd'), true)
  assert.equal(isShortMapsLink('Bar Foo\nhttps://maps.app.goo.gl/AbCd'), true)
})
await test('non-short links not recognised', () => {
  assert.equal(isShortMapsLink('https://www.google.com/maps/@37.9,23.7,17z'), false)
  assert.equal(isShortMapsLink('https://goo.gl/other'), false)
  assert.equal(isShortMapsLink('https://maps.app.goo.gl.evil.com/x'), false)
  assert.equal(isShortMapsLink('http://maps.app.goo.gl/x'), false)
  assert.equal(isShortMapsLink(''), false)
})
await test('firstUrl picks the link out of shared text', () => assert.equal(
  firstUrl('Check this out https://maps.app.goo.gl/AbCd thanks'), 'https://maps.app.goo.gl/AbCd'))

console.log('checkMapsUrl (allowlist)')
const allowed = [
  'https://maps.app.goo.gl/abc', 'https://goo.gl/maps/abc', 'https://g.co/kgs/abc',
  'https://www.google.com/maps/place/x', 'https://google.com/maps', 'https://maps.google.com/?q=1,2',
  'https://google.gr/maps', 'https://www.google.gr/maps', 'https://MAPS.APP.GOO.GL/abc', 'https://maps.app.goo.gl:443/abc',
]
const rejected = [
  'http://maps.app.goo.gl/x', 'https://google.com.evil.com/', 'https://maps.app.goo.gl.evil.com/',
  'https://evilgoogle.com/', 'https://evil.com/?https://www.google.com', 'https://www.google.com@evil.com/',
  'https://user:pw@www.google.com/', 'https://maps.app.goo.gl:8443/x', 'https://169.254.169.254/',
  'https://localhost/', 'https://127.0.0.1/', 'https://[::1]/', 'file:///etc/passwd', 'ftp://google.com/',
  'https://goo.gl/other', 'https://goo.gl/', 'https://g.co/other', 'https://g.co/', 'https://consent.google.com/x',
  'https://accounts.google.com/', 'https://sub.maps.google.com/', 'javascript:alert(1)', 'not a url', '',
]
for (const u of allowed) await test(`allow  ${u}`, () => assert.ok(checkMapsUrl(u)))
for (const u of rejected) await test(`reject ${u || '(empty)'}`, () => assert.equal(checkMapsUrl(u), null))

console.log('resolveMapsUrl (mock fetch)')
const redirect = (loc) => async () => new Response(null, { status: 302, headers: { location: loc } })
function scripted(map, calls = []) {
  return async (url) => {
    calls.push(url)
    const step = map[url]
    if (!step) throw new Error(`unexpected fetch: ${url}`)
    return step()
  }
}
const expectCode = async (p, code) => {
  try { await p } catch (e) { assert.ok(e instanceof MapsResolveError, String(e)); assert.equal(e.code, code); return }
  assert.fail(`expected ${code}`)
}
await test('follows a redirect to a URL with coordinates', async () => {
  const calls = []
  const r = await resolveMapsUrl('https://maps.app.goo.gl/x', scripted({
    'https://maps.app.goo.gl/x': redirect('https://www.google.com/maps/place/Foo/@37.9,23.7,17z/data=!3d37.91!4d23.71'),
  }, calls))
  assert.deepEqual([r.lat, r.lng], [37.91, 23.71])
  assert.equal(calls.length, 1)
})
await test('relative Location is resolved against the current URL', async () => {
  const r = await resolveMapsUrl('https://maps.app.goo.gl/x', scripted({
    'https://maps.app.goo.gl/x': redirect('/maps/@37.9,23.7,17z'),
  }))
  assert.deepEqual([r.lat, r.lng], [37.9, 23.7])
})
await test('redirect to a non-allowlisted host is blocked, never fetched', async () => {
  const calls = []
  await expectCode(resolveMapsUrl('https://maps.app.goo.gl/x', scripted({
    'https://maps.app.goo.gl/x': redirect('https://evil.com/steal'),
  }, calls)), 'blocked_redirect')
  assert.equal(calls.length, 1)
})
await test('redirect to metadata IP is blocked', async () => {
  await expectCode(resolveMapsUrl('https://maps.app.goo.gl/x', scripted({
    'https://maps.app.goo.gl/x': redirect('https://169.254.169.254/latest/meta-data'),
  })), 'blocked_redirect')
})
await test('redirect downgrade to http is blocked', async () => {
  await expectCode(resolveMapsUrl('https://maps.app.goo.gl/x', scripted({
    'https://maps.app.goo.gl/x': redirect('http://www.google.com/maps'),
  })), 'blocked_redirect')
})
await test('consent.google.com?continue= is unwrapped and re-checked', async () => {
  const calls = []
  const r = await resolveMapsUrl('https://maps.app.goo.gl/x', scripted({
    'https://maps.app.goo.gl/x': redirect('https://consent.google.com/m?continue=' + encodeURIComponent('https://www.google.com/maps/@37.9,23.7,17z')),
  }, calls))
  assert.deepEqual([r.lat, r.lng], [37.9, 23.7])
  assert.ok(!calls.some(u => u.includes('consent.google')), 'consent page must not be fetched')
})
await test('consent continue= pointing off-allowlist is blocked', async () => {
  await expectCode(resolveMapsUrl('https://maps.app.goo.gl/x', scripted({
    'https://maps.app.goo.gl/x': redirect('https://consent.google.com/m?continue=' + encodeURIComponent('https://evil.com/')),
  })), 'blocked_redirect')
})
await test('consent loop back to the same short link ends in no_coords', async () => {
  const self = 'https://maps.app.goo.gl/x'
  await expectCode(resolveMapsUrl(self, scripted({
    [self]: redirect('https://consent.google.com/m?continue=' + encodeURIComponent(self)),
  })), 'no_coords')
})
await test(`more than ${MAX_REDIRECTS} redirects stops`, async () => {
  let n = 0
  const f = async () => new Response(null, { status: 302, headers: { location: `https://www.google.com/maps/r${++n}` } })
  await expectCode(resolveMapsUrl('https://maps.app.goo.gl/x', f), 'too_many_redirects')
  assert.equal(n, MAX_REDIRECTS + 1)
})
await test('final 200 without coordinates is no_coords', async () => {
  await expectCode(resolveMapsUrl('https://maps.app.goo.gl/x', async () => new Response('<html>secret</html>', { status: 200 })), 'no_coords')
})
await test('fetch failure maps to fetch_failed', async () => {
  await expectCode(resolveMapsUrl('https://maps.app.goo.gl/x', async () => { throw new Error('boom') }), 'fetch_failed')
})
await test('manual redirect mode and timeout signal are requested', async () => {
  let init
  await resolveMapsUrl('https://maps.app.goo.gl/x', async (_u, i) => { init = i; return new Response(null, { status: 302, headers: { location: 'https://www.google.com/maps/@37.9,23.7,17z' } }) })
  assert.equal(init.redirect, 'manual')
  assert.ok(init.signal instanceof AbortSignal)
})
await test('disallowed start URL never calls fetch', async () => {
  let called = false
  await expectCode(resolveMapsUrl('https://google.com.evil.com/', async () => { called = true; return new Response() }), 'invalid_url')
  assert.equal(called, false)
})
await test('URL that already holds coordinates needs no fetch', async () => {
  let called = false
  const r = await resolveMapsUrl('https://www.google.com/maps/@37.9,23.7,17z', async () => { called = true; return new Response() })
  assert.equal(called, false)
  assert.deepEqual([r.lat, r.lng], [37.9, 23.7])
})

console.log('rate limit')
await test(`allows ${RATE_LIMIT_MAX} then blocks, per user, and recovers after the window`, () => {
  resetRateLimit()
  const t0 = 1_000_000
  for (let i = 0; i < RATE_LIMIT_MAX; i++) assert.equal(takeRateLimit('u1', t0 + i), true)
  assert.equal(takeRateLimit('u1', t0 + 100), false)
  assert.equal(takeRateLimit('u2', t0 + 100), true)
  assert.equal(takeRateLimit('u1', t0 + 10 * 60 * 1000 + RATE_LIMIT_MAX), true)
})

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
