#!/usr/bin/env node
/**
 * Offline check that every API route that writes to `events` clears the cached
 * public pages afterwards (revalidatePublicPaths), and that "events" feeds /map.
 * It reads the route sources, so a new route that writes to events without the
 * call fails here. No network, no database.
 *
 *   node scripts/test-events-revalidate.mjs
 */
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
let passed = 0, failed = 0
function test(name, fn) {
  try { fn(); passed++; console.log(`  ok   ${name}`) }
  catch (e) { failed++; console.log(`  FAIL ${name}\n       ${e.message}`) }
}

function routes(dir) {
  const out = []
  for (const f of readdirSync(dir)) {
    const p = join(dir, f)
    if (statSync(p).isDirectory()) out.push(...routes(p))
    else if (f === 'route.ts') out.push(p)
  }
  return out
}
const API = join(ROOT, 'app/api')
const rel = (p) => relative(ROOT, p)
const src = (p) => readFileSync(p, 'utf8')

// What a route does to events, read from its source.
const WRITE = /\.from\(\s*['"`]events['"`]\s*\)\s*(?:\.\s*select\([^)]*\)\s*)?\.\s*(insert|update|delete|upsert)\s*\(/g
function eventWrites(s) {
  const writes = [...s.matchAll(WRITE)].map(m => ({ at: m.index, how: m[1] }))
  // Generic admin routes take the table from the request; they write events when 'events' is allowed.
  const generic = /\.from\(\s*table\s*\)\s*\.\s*(insert|update|delete|upsert)\s*\(/.exec(s)
  if (generic && /VALID_TABLES\s*=\s*\[[^\]]*'events'/.test(s)) writes.push({ at: generic.index, how: `${generic[1]} (generic table)` })
  // Account deletion removes the user's events inside the delete_account function.
  const acct = /\.rpc\(\s*['"]delete_account['"]/.exec(s)
  if (acct) writes.push({ at: acct.index, how: 'delete_account()' })
  return writes
}
const callsAt = (s) => [...s.matchAll(/revalidatePublicPaths\(\s*(?:'events'|table)\s*\)/g)].map(m => m.index)

// Routes that write events on purpose without the call, with the reason.
const EXEMPT = {
  'app/api/submit/route.ts': 'unauthenticated form: only inserts pending rows (never public), and a public endpoint must not be able to flush the cache',
}

console.log('every route that writes to events clears the cache after the write')
const all = routes(API)
const writers = all.map(p => ({ p, s: src(p) })).map(x => ({ ...x, writes: eventWrites(x.s) })).filter(x => x.writes.length)

test('the routes that write to events are the ones expected', () => {
  assert.deepEqual(writers.map(x => rel(x.p)).sort(), [
    'app/api/account/route.ts', 'app/api/admin/action/route.ts', 'app/api/admin/add/route.ts', 'app/api/admin/approve-featured/route.ts',
    'app/api/admin/delete/route.ts', 'app/api/admin/feature-event/route.ts', 'app/api/admin/nightup-pick/route.ts', 'app/api/admin/radar-pick/route.ts',
    'app/api/admin/update/route.ts', 'app/api/events/[id]/route.ts', 'app/api/events/route.ts', 'app/api/submit/route.ts',
  ].sort())
})
for (const w of writers) {
  const name = rel(w.p)
  if (EXEMPT[name]) { test(`${name}: exempt (${EXEMPT[name]})`, () => assert.ok(callsAt(w.s).length === 0, 'if the exemption no longer holds, remove it')); continue }
  test(`${name}: calls revalidatePublicPaths('events') after the write (${w.writes.map(x => x.how).join(', ')})`, () => {
    const calls = callsAt(w.s)
    assert.ok(calls.length > 0, 'no revalidatePublicPaths call')
    const firstWrite = Math.min(...w.writes.map(x => x.at))
    assert.ok(calls.some(c => c > firstWrite), 'the call comes before the write')
  })
}
test('the generic admin routes allow events and revalidate with the table they wrote', () => {
  for (const f of ['add', 'update', 'action', 'delete']) {
    const s = src(join(API, 'admin', f, 'route.ts'))
    assert.match(s, /VALID_TABLES\s*=\s*\[[^\]]*'events'/, f)
    assert.match(s, /revalidatePublicPaths\(\s*table\s*\)/, f)
  }
})
test('account deletion only revalidates events when events were deleted', () => assert.match(src(join(API, 'account/route.ts')), /counts\.events\s*>\s*0\)\s*revalidatePublicPaths\('events'\)/))
test('PATCH /api/events/[id] revalidates after the update, not only in the admin routes', () => {
  const s = src(join(API, 'events/[id]/route.ts')); assert.ok(s.indexOf("revalidatePublicPaths('events')") > s.indexOf('.update(payload)'))
})

console.log('what "events" clears')
const rc = src(join(ROOT, 'app/lib/revalidateContent.ts'))
const eventsBlock = (rc.match(/\n  events:\s*\[([\s\S]*?)\n  \],/) || [])[1] || ''
const paths = [...eventsBlock.matchAll(/path:\s*'([^']+)'/g)].map(m => m[1])
test("the 'events' entry includes /map (the events layer), the home page and /about", () => { for (const p of ['/map', '/', '/about']) assert.ok(paths.includes(p), p) })
test("/map is an ISR page (revalidate = 300), so it needs the call above", () => assert.match(src(join(ROOT, 'app/map/page.tsx')), /export const revalidate = 300/))
test('revalidatePublicPaths never throws (a failed revalidation must not fail a write that succeeded)', () => assert.match(rc, /try \{\s*revalidatePath\(/))

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
