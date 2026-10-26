#!/usr/bin/env node
/**
 * Offline tests for the Featured Track URL handling in app/lib/soundcloud.ts:
 * short-link resolution, the hostname allowlist on every hop, and the
 * embeddable check the profile page uses to choose player or plain link.
 * No network, no server.
 *
 *   node scripts/test-soundcloud.mjs
 */
import assert from 'node:assert/strict'
import {
  checkSoundcloudUrl, isEmbeddableSoundcloud, featuredTrackEmbedSrc, safeExternalHref,
  resolveSoundcloudUrl, SoundcloudError, takeRateLimit, resetRateLimit,
  MAX_REDIRECTS, RATE_LIMIT_MAX,
} from '../app/lib/soundcloud.ts'

let passed = 0, failed = 0
async function test(name, fn) {
  try { await fn(); passed++; console.log(`  ok   ${name}`) }
  catch (e) { failed++; console.log(`  FAIL ${name}\n       ${e.message}`) }
}
const rejects = (p, code) => assert.rejects(p, (e) => e instanceof SoundcloudError && e.code === code)

// Fake fetch driven by a map of url -> { status, location }. Records every URL requested.
function fakeFetch(routes) {
  const calls = []
  const fn = async (url) => {
    calls.push(url)
    const r = routes[url]
    if (!r) throw new Error(`unexpected fetch: ${url}`)
    return new Response(null, { status: r.status, headers: r.location ? { location: r.location } : {} })
  }
  fn.calls = calls
  return fn
}

const SHORT = 'https://on.soundcloud.com/xKJNr4r9x9EnyRPqYN'

console.log('short link resolves to canonical')
await test('on.soundcloud.com -> soundcloud.com/artist/track, query stripped', async () => {
  const f = fakeFetch({ [SHORT]: { status: 302, location: 'https://soundcloud.com/some-artist/some-track?utm_source=clipboard&utm_medium=text#t=1' } })
  assert.equal(await resolveSoundcloudUrl(SHORT, f), 'https://soundcloud.com/some-artist/some-track')
  assert.deepEqual(f.calls, [SHORT])
})
await test('relative Location is resolved against the short link', async () => {
  const f = fakeFetch({ [SHORT]: { status: 301, location: 'https://soundcloud.com/a/b?x=1' } })
  assert.equal(await resolveSoundcloudUrl(SHORT, f), 'https://soundcloud.com/a/b')
})
await test('two short-link hops are followed, each checked', async () => {
  const f = fakeFetch({
    [SHORT]: { status: 302, location: 'https://on.soundcloud.com/second' },
    'https://on.soundcloud.com/second': { status: 302, location: 'https://www.soundcloud.com/a/b/s-SECRET?si=1' },
  })
  assert.equal(await resolveSoundcloudUrl(SHORT, f), 'https://soundcloud.com/a/b/s-SECRET')
})
await test('an already-canonical URL is cleaned without any fetch', async () => {
  const f = fakeFetch({})
  assert.equal(await resolveSoundcloudUrl('https://soundcloud.com/a/b/?utm=1', f), 'https://soundcloud.com/a/b')
  assert.equal(f.calls.length, 0)
})

console.log('other hosts are rejected')
for (const bad of [
  'https://evil.com/a/b',
  'https://soundcloud.com.evil.com/a/b',
  'https://on.soundcloud.com.evil.com/x',
  'https://evil.com/?u=https://soundcloud.com/a/b',
  'http://soundcloud.com/a/b',
  'http://on.soundcloud.com/x',
  'https://user:pw@soundcloud.com/a/b',
  'https://soundcloud.com:8443/a/b',
  'https://127.0.0.1/a/b',
  'javascript:alert(1)',
  'not a url',
]) {
  await test(`rejects ${bad}`, async () => {
    const f = fakeFetch({})
    await rejects(resolveSoundcloudUrl(bad, f), 'invalid_url')
    assert.equal(f.calls.length, 0, 'must not fetch a disallowed host')
  })
}
await test('soundcloud.com profile / site pages are not embeddable', async () => {
  await rejects(resolveSoundcloudUrl('https://soundcloud.com/some-artist', fakeFetch({})), 'not_embeddable')
  await rejects(resolveSoundcloudUrl('https://soundcloud.com/discover/sets', fakeFetch({})), 'not_embeddable')
})

console.log('redirects to a disallowed host are rejected')
for (const target of [
  'https://evil.com/a/b',
  'http://soundcloud.com/a/b',
  'https://soundcloud.com.evil.com/a/b',
  'https://169.254.169.254/latest/meta-data/',
  'https://localhost/a/b',
  'https://soundcloud.com@evil.com/a/b',
  'file:///etc/passwd',
]) {
  await test(`short link -> ${target}`, async () => {
    const f = fakeFetch({ [SHORT]: { status: 302, location: target } })
    await rejects(resolveSoundcloudUrl(SHORT, f), 'blocked_redirect')
    assert.deepEqual(f.calls, [SHORT], 'the disallowed target must never be requested')
  })
}
await test('blocked hop in the middle of a chain is never requested', async () => {
  const f = fakeFetch({
    [SHORT]: { status: 302, location: 'https://on.soundcloud.com/second' },
    'https://on.soundcloud.com/second': { status: 302, location: 'https://evil.com/x' },
  })
  await rejects(resolveSoundcloudUrl(SHORT, f), 'blocked_redirect')
  assert.equal(f.calls.length, 2)
})

console.log('limits')
await test('redirect loop stops', async () => {
  const f = fakeFetch({ [SHORT]: { status: 302, location: SHORT } })
  await rejects(resolveSoundcloudUrl(SHORT, f), 'too_many_redirects')
  assert.equal(f.calls.length, 1)
})
await test(`more than ${MAX_REDIRECTS} short-link hops stops`, async () => {
  const routes = {}
  for (let i = 0; i < 10; i++) routes[`https://on.soundcloud.com/h${i}`] = { status: 302, location: `https://on.soundcloud.com/h${i + 1}` }
  const f = fakeFetch(routes)
  await rejects(resolveSoundcloudUrl('https://on.soundcloud.com/h0', f), 'too_many_redirects')
  assert.ok(f.calls.length <= MAX_REDIRECTS)
})
await test('non-redirect response -> fetch_failed', async () => {
  await rejects(resolveSoundcloudUrl(SHORT, fakeFetch({ [SHORT]: { status: 404 } })), 'fetch_failed')
  await rejects(resolveSoundcloudUrl(SHORT, fakeFetch({ [SHORT]: { status: 302 } })), 'fetch_failed')
})
await test('network error -> fetch_failed', async () => {
  await rejects(resolveSoundcloudUrl(SHORT, async () => { throw new Error('boom') }), 'fetch_failed')
})
await test('redirect is requested manually with a timeout signal', async () => {
  let init
  const f = async (_u, i) => { init = i; return new Response(null, { status: 302, headers: { location: 'https://soundcloud.com/a/b' } }) }
  await resolveSoundcloudUrl(SHORT, f)
  assert.equal(init.redirect, 'manual')
  assert.ok(init.signal instanceof AbortSignal)
})
await test('rate limit', () => {
  resetRateLimit()
  for (let i = 0; i < RATE_LIMIT_MAX; i++) assert.equal(takeRateLimit('u1', 1000), true)
  assert.equal(takeRateLimit('u1', 1000), false)
  assert.equal(takeRateLimit('u2', 1000), true)
})

console.log('render decision (player vs plain link)')
await test('canonical track -> player src', () => {
  const src = featuredTrackEmbedSrc('https://soundcloud.com/a/b')
  assert.ok(src.startsWith('https://w.soundcloud.com/player/?url=https%3A%2F%2Fsoundcloud.com%2Fa%2Fb&'))
  assert.ok(src.includes('show_user=true'))
  assert.ok(!featuredTrackEmbedSrc('https://soundcloud.com/a/b', false).includes('show_user'))
})
for (const v of [SHORT, 'https://spotify.com/track/1', 'https://evil.com/a/b', 'https://soundcloud.com/a', '', null, undefined, 42]) {
  await test(`not embeddable -> null (fallback link): ${String(v)}`, () => {
    assert.equal(featuredTrackEmbedSrc(v), null)
    assert.equal(isEmbeddableSoundcloud(v), false)
  })
}
await test('fallback link href only for http(s)', () => {
  assert.equal(safeExternalHref(SHORT), SHORT)
  assert.equal(safeExternalHref('javascript:alert(1)'), null)
  assert.equal(safeExternalHref('nonsense'), null)
  assert.equal(safeExternalHref(null), null)
})
await test('checkSoundcloudUrl is exact-host', () => {
  assert.ok(checkSoundcloudUrl('https://on.soundcloud.com/x'))
  assert.ok(checkSoundcloudUrl('https://SoundCloud.com/a/b'))
  assert.equal(checkSoundcloudUrl('https://api.soundcloud.com/a/b'), null)
})

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
