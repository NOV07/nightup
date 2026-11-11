#!/usr/bin/env node
/**
 * Offline tests for the position request of «Near me» (app/lib/locate.ts, used by useUserLocation): a first try
 * that accepts a cached position, one more try with GPS after «unavailable» or «timeout», no retry when the
 * permission is refused, never more than two calls, and an old answer ignored after a cancel (a reset or a newer
 * request). Runs against a mock `navigator.geolocation`. No network, no browser.
 *
 *   node scripts/test-locate.mjs
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { locate, FIRST_TRY, SECOND_TRY } from '../app/lib/locate.ts'

let passed = 0, failed = 0
function test(name, fn) {
  try { fn(); passed++; console.log(`  ok   ${name}`) }
  catch (e) { failed++; console.log(`  FAIL ${name}\n       ${e.message}`) }
}

/** A mock geolocation: every call is recorded and answered by hand (answer(i, …)), so timing is under control. */
function mockGeo() {
  const calls = []
  return {
    calls,
    geo: { getCurrentPosition: (ok, fail, opts) => { calls.push({ ok, fail, opts }) } },
    success: (i, lat, lng) => calls[i].ok({ coords: { latitude: lat, longitude: lng } }),
    error: (i, code, message = `err${code}`) => calls[i].fail({ code, message }),
  }
}
const run = () => { const m = mockGeo(); const results = []; const cancel = locate(m.geo, (r) => results.push(r)); return { ...m, results, cancel } }

console.log('the two tries')
test('options: try 1 = network/cache, 12 s, up to 5 min old; try 2 = GPS, 20 s, never cached', () => {
  assert.deepEqual(FIRST_TRY, { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 })
  assert.deepEqual(SECOND_TRY, { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 })
})
test('success on the first try: one call, with the first options, one result', () => {
  const m = run(); assert.equal(m.calls.length, 1); assert.deepEqual(m.calls[0].opts, FIRST_TRY)
  m.success(0, 37.97, 23.72)
  assert.deepEqual(m.results, [{ ok: true, lat: 37.97, lng: 23.72 }]); assert.equal(m.calls.length, 1)
})
test('timeout (3) on the first try, success on the second: two calls, the second with GPS', () => {
  const m = run(); m.error(0, 3)
  assert.equal(m.calls.length, 2); assert.deepEqual(m.calls[1].opts, SECOND_TRY); assert.equal(m.results.length, 0, 'not finished yet')
  m.success(1, 38.0, 23.7)
  assert.deepEqual(m.results, [{ ok: true, lat: 38.0, lng: 23.7 }])
})
test('unavailable (2) on the first try, success on the second', () => {
  const m = run(); m.error(0, 2); assert.equal(m.calls.length, 2); m.success(1, 1, 2); assert.deepEqual(m.results, [{ ok: true, lat: 1, lng: 2 }])
})
test('both fail: the result is the LAST failure (its code and message)', () => {
  for (const [a, b] of [[3, 2], [2, 3], [3, 3], [2, 2]]) {
    const m = run(); m.error(0, a, 'first'); m.error(1, b, 'second')
    assert.deepEqual(m.results, [{ ok: false, code: b, message: 'second' }], `${a}+${b}`)
  }
})
test('permission refused (1) on the first try: no second try', () => {
  const m = run(); m.error(0, 1, 'denied'); assert.equal(m.calls.length, 1); assert.deepEqual(m.results, [{ ok: false, code: 1, message: 'denied' }])
})
test('permission refused on the second try: reported as 1', () => {
  const m = run(); m.error(0, 3); m.error(1, 1, 'now denied'); assert.equal(m.calls.length, 2); assert.deepEqual(m.results, [{ ok: false, code: 1, message: 'now denied' }])
})
test('never more than two calls, however it fails', () => {
  for (const codes of [[3, 3], [2, 2], [3, 2], [1], [7]]) {
    const m = run(); codes.forEach((c, i) => { if (m.calls[i]) m.error(i, c) })
    assert.ok(m.calls.length <= 2, codes.join()); assert.equal(m.results.length, 1)
  }
})
test('an unknown error code is final (no retry) and is reported without a code', () => {
  const m = run(); m.calls[0].fail({ message: 'weird' }); assert.equal(m.calls.length, 1); assert.deepEqual(m.results, [{ ok: false, code: null, message: 'weird' }])
})
test('done is called once, even if the browser answers twice', () => {
  const m = run(); m.success(0, 1, 2); m.success(0, 3, 4); m.error(0, 3)
  assert.deepEqual(m.results, [{ ok: true, lat: 1, lng: 2 }])
})

console.log('cancel (a reset, or a newer request)')
test('cancelled before any answer: nothing is reported, and a late error does not start a second try', () => {
  const m = run(); m.cancel(); m.error(0, 3); assert.equal(m.results.length, 0); assert.equal(m.calls.length, 1)
})
test('cancelled while the second try is running: its answer is ignored', () => {
  const m = run(); m.error(0, 3); assert.equal(m.calls.length, 2); m.cancel(); m.success(1, 5, 6); assert.equal(m.results.length, 0)
})
test('an old answer after a reset is ignored, the new request answers', () => {
  const a = mockGeo(); const got = []
  const cancelA = locate(a.geo, (r) => got.push(['A', r]))          // first press
  cancelA()                                                          // reset (or a second press)
  const cancelB = locate(a.geo, (r) => got.push(['B', r]))          // pressed again
  a.success(0, 1, 1)                                                 // the answer to A arrives late
  a.success(1, 2, 2)
  assert.deepEqual(got, [['B', { ok: true, lat: 2, lng: 2 }]]); assert.ok(cancelB)
})
test('a cancelled request that fails with code 1 reports nothing', () => {
  const m = run(); m.cancel(); m.error(0, 1); assert.equal(m.results.length, 0)
})

console.log('where it is used, and what is never stored')
test('the hook uses locate(), cancels on reset and unmount, and stores nothing', () => {
  const hook = readFileSync(new URL('../app/lib/useUserLocation.ts', import.meta.url), 'utf8')
  assert.ok(/from "\.\/locate"/.test(hook) && /locate\(navigator\.geolocation/.test(hook))
  assert.ok(/reset = useCallback\(\(\) => \{\s*cancelRef\.current\?\.\(\)/.test(hook))
  assert.ok(/useEffect\(\(\) => \(\) => \{ cancelRef\.current\?\.\(\); \}, \[\]\)/.test(hook))
  const all = hook + readFileSync(new URL('../app/lib/locate.ts', import.meta.url), 'utf8')
  assert.ok(!/localStorage|sessionStorage|document\.cookie|indexedDB|history\.|fetch\(|navigator\.sendBeacon/.test(all), 'the position is kept in memory only')
})
test('the hook keeps its API (TonightModal reads lat, lng, status, requestLocation)', () => {
  const hook = readFileSync(new URL('../app/lib/useUserLocation.ts', import.meta.url), 'utf8')
  for (const k of ['lat', 'lng', 'status', 'error', 'errorCode', 'requestLocation', 'reset']) assert.ok(new RegExp(`return \\{[^}]*\\b${k}\\b`).test(hook), k)
  assert.ok(/UserLocationStatus = "idle" \| "loading" \| "granted" \| "denied" \| "unsupported"/.test(hook))
  const modal = readFileSync(new URL('../app/components/TonightModal.tsx', import.meta.url), 'utf8')
  assert.ok(/const \{ lat, lng, status, requestLocation \} = useUserLocation\(\);/.test(modal))
})

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
