#!/usr/bin/env node
/**
 * Live test for wellness_spots: RLS, the published-needs-coords constraint,
 * the admin API and the photo bucket. Runs against the real Supabase project
 * and a running Next server (default http://localhost:3000).
 *
 *   npm run dev   (in another terminal)
 *   node scripts/test-wellness-spots.mjs
 *
 * Only rows whose slug starts with "zz-test-" are ever written, changed or
 * deleted. Seed rows are only counted. Env values are never printed.
 */
import crypto from 'node:crypto'
import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'

try { process.loadEnvFile('.env.local') } catch { /* env may already be set */ }

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
const PASSWORD = process.env.ADMIN_PASSWORD
const BASE = process.env.BASE_URL || 'http://localhost:3000'
for (const [k, v] of Object.entries({ URL_, ANON, SERVICE, PASSWORD })) {
  if (!v) { console.error(`missing env: ${k}`); process.exit(2) }
}

const BUCKET = 'wellness-spots'
const PREFIX = 'zz-test-'
const run = crypto.randomBytes(3).toString('hex')
const slug = (n) => `${PREFIX}${run}-${n}`

const admin = createClient(URL_, SERVICE)
const anon = createClient(URL_, ANON)

// Same signing as app/lib/adminAuth.ts, so no login (and no lockout) is needed.
const payload = String(Date.now())
const cookie = `admin_auth=${payload}.${crypto.createHmac('sha256', PASSWORD).update(payload).digest('hex')}`

const api = (path, { method = 'GET', body, auth = true, form } = {}) =>
  fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(auth ? { cookie } : {}),
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    body: form ?? (body ? JSON.stringify(body) : undefined),
  }).then(async (r) => ({ status: r.status, json: await r.json().catch(() => ({})) }))

// 1x1 transparent PNG
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64')
const pngForm = (s) => {
  const f = new FormData()
  f.append('file', new Blob([PNG], { type: 'image/png' }), 'x.png')
  f.append('slug', s)
  return f
}

let passed = 0, failed = 0
async function test(name, fn) {
  try { await fn(); passed++; console.log(`  ok   ${name}`) }
  catch (e) { failed++; console.log(`  FAIL ${name}\n       ${e.message}`) }
}

async function totalCount() {
  const { count, error } = await admin.from('wellness_spots').select('id', { count: 'exact', head: true })
  if (error) throw new Error(`count failed: ${error.message}`)
  return count
}

async function cleanup() {
  await admin.from('wellness_spots').delete().like('slug', `${PREFIX}%`)
  const { data: folders } = await admin.storage.from(BUCKET).list('', { limit: 1000 })
  for (const f of folders ?? []) {
    if (!f.name.startsWith(PREFIX)) continue
    const { data: files } = await admin.storage.from(BUCKET).list(f.name, { limit: 1000 })
    const paths = (files ?? []).map((x) => `${f.name}/${x.name}`)
    if (paths.length) await admin.storage.from(BUCKET).remove(paths)
  }
}

const before = await totalCount()
console.log(`wellness_spots rows before: ${before}`)
await cleanup() // leftovers of an aborted earlier run

try {
  console.log('RLS')
  await test('anon sees no non-test rows while nothing is published', async () => {
    const { data, error } = await anon.from('wellness_spots').select('slug')
    assert.equal(error, null)
    assert.deepEqual(data.filter((r) => !r.slug.startsWith(PREFIX)), [])
  })

  const pub = slug('pub'), hid = slug('hid')
  await test('service role can create a published and an unpublished test row', async () => {
    const { error } = await admin.from('wellness_spots').insert([
      { slug: pub, name: 'test pub', lat: 37.98, lng: 23.73, published: true },
      // Explicit: a bulk insert sends null for keys missing from some rows.
      { slug: hid, name: 'test hidden', published: false },
    ])
    assert.equal(error, null)
  })
  await test('anon sees only the published test row', async () => {
    const { data, error } = await anon.from('wellness_spots').select('slug')
    assert.equal(error, null)
    assert.deepEqual(data.map((r) => r.slug), [pub])
  })
  await test('anon insert fails', async () => {
    const { error } = await anon.from('wellness_spots').insert({ slug: slug('anon'), name: 'x' })
    assert.ok(error, 'expected an error')
  })
  await test('anon update changes nothing', async () => {
    await anon.from('wellness_spots').update({ name: 'hacked' }).eq('slug', pub)
    const { data } = await admin.from('wellness_spots').select('name').eq('slug', pub).single()
    assert.equal(data.name, 'test pub')
  })
  await test('anon delete removes nothing', async () => {
    await anon.from('wellness_spots').delete().eq('slug', pub)
    const { data } = await admin.from('wellness_spots').select('id').eq('slug', pub)
    assert.equal(data.length, 1)
  })
  await test('anon cannot list the bucket', async () => {
    const { data } = await anon.storage.from(BUCKET).list('', { limit: 10 })
    assert.equal((data ?? []).length, 0)
  })

  console.log('Constraint')
  await test('published = true without lat/lng is rejected by the database', async () => {
    const { error } = await admin.from('wellness_spots').insert({ slug: slug('nocoords'), name: 'x', published: true })
    assert.ok(error)
    assert.equal(error.code, '23514')
  })

  console.log('Admin API')
  await test('no cookie: 401 on every route', async () => {
    const fakeId = crypto.randomUUID()
    const calls = [
      api('/api/admin/wellness-spots', { auth: false }),
      api('/api/admin/wellness-spots', { method: 'POST', auth: false, body: { name: 'x' } }),
      api(`/api/admin/wellness-spots/${fakeId}`, { method: 'PATCH', auth: false, body: { name: 'x' } }),
      api(`/api/admin/wellness-spots/${fakeId}`, { method: 'DELETE', auth: false }),
      api('/api/admin/wellness-spots/upload', { method: 'POST', auth: false, form: pngForm(slug('noauth')) }),
    ]
    for (const r of await Promise.all(calls)) assert.ok([401, 403].includes(r.status), `got ${r.status}`)
  })

  const apiSlug = slug('api')
  let created
  await test('create via API ignores a client-supplied id and unknown fields', async () => {
    const wantedId = crypto.randomUUID()
    const r = await api('/api/admin/wellness-spots', { method: 'POST', body: { name: 'API test', slug: apiSlug, id: wantedId, evil: 1, created_at: '2000-01-01T00:00:00Z' } })
    assert.equal(r.status, 200, JSON.stringify(r.json))
    created = r.json.spot
    assert.notEqual(created.id, wantedId)
    assert.ok(!('evil' in created))
    assert.ok(created.created_at.startsWith(String(new Date().getFullYear())))
    assert.equal(created.published, false)
  })
  await test('duplicate slug gives the Greek message', async () => {
    const r = await api('/api/admin/wellness-spots', { method: 'POST', body: { name: 'dup', slug: apiSlug } })
    assert.equal(r.status, 409)
    assert.equal(r.json.error, 'Το slug υπάρχει ήδη.')
  })
  await test('patch ignores fields outside the allowlist', async () => {
    const other = crypto.randomUUID()
    const r = await api(`/api/admin/wellness-spots/${created.id}`, { method: 'PATCH', body: { area: 'Δοκιμή', id: other, created_at: '2000-01-01T00:00:00Z', evil: 'x' } })
    assert.equal(r.status, 200, JSON.stringify(r.json))
    assert.equal(r.json.spot.area, 'Δοκιμή')
    assert.equal(r.json.spot.id, created.id)
    assert.equal(r.json.spot.created_at, created.created_at)
  })
  await test('publishing without a pin gets a Greek message before the database', async () => {
    const r = await api(`/api/admin/wellness-spots/${created.id}`, { method: 'PATCH', body: { published: true } })
    assert.equal(r.status, 400)
    assert.match(r.json.error, /χωρίς pin/)
  })
  await test('publishing works once there is a pin; removing the pin while published is refused', async () => {
    let r = await api(`/api/admin/wellness-spots/${created.id}`, { method: 'PATCH', body: { lat: 37.97, lng: 23.72, published: true } })
    assert.equal(r.status, 200, JSON.stringify(r.json))
    r = await api(`/api/admin/wellness-spots/${created.id}`, { method: 'PATCH', body: { lat: null } })
    assert.equal(r.status, 400)
  })
  let photoUrl
  await test('upload returns a public URL that serves the image', async () => {
    const r = await api('/api/admin/wellness-spots/upload', { method: 'POST', form: pngForm(apiSlug) })
    assert.equal(r.status, 200, JSON.stringify(r.json))
    photoUrl = r.json.url
    assert.ok(photoUrl.includes(`/${apiSlug}/`))
    const img = await fetch(photoUrl)
    assert.equal(img.status, 200)
  })
  await test('upload rejects a non-image and a bad slug', async () => {
    const f = new FormData()
    f.append('file', new Blob(['hi'], { type: 'text/plain' }), 'x.txt')
    f.append('slug', apiSlug)
    assert.equal((await api('/api/admin/wellness-spots/upload', { method: 'POST', form: f })).status, 400)
    assert.equal((await api('/api/admin/wellness-spots/upload', { method: 'POST', form: pngForm('../etc') })).status, 400)
  })
  await test('photo_urls accepts our bucket and rejects foreign URLs', async () => {
    let r = await api(`/api/admin/wellness-spots/${created.id}`, { method: 'PATCH', body: { photo_urls: [photoUrl] } })
    assert.equal(r.status, 200, JSON.stringify(r.json))
    r = await api(`/api/admin/wellness-spots/${created.id}`, { method: 'PATCH', body: { photo_urls: ['https://example.com/a.png'] } })
    assert.equal(r.status, 400)
  })
  await test('delete removes the row and its files', async () => {
    const r = await api(`/api/admin/wellness-spots/${created.id}`, { method: 'DELETE' })
    assert.equal(r.status, 200, JSON.stringify(r.json))
    assert.equal(r.json.filesRemoved, true)
    const { data } = await admin.from('wellness_spots').select('id').eq('id', created.id)
    assert.equal(data.length, 0)
    const { data: files } = await admin.storage.from(BUCKET).list(apiSlug)
    assert.equal((files ?? []).length, 0)
  })
} finally {
  console.log('Cleanup')
  await cleanup()
  const after = await totalCount()
  const { count: leftRows } = await admin.from('wellness_spots').select('id', { count: 'exact', head: true }).like('slug', `${PREFIX}%`)
  const { data: folders } = await admin.storage.from(BUCKET).list('', { limit: 1000 })
  const leftFolders = (folders ?? []).filter((f) => f.name.startsWith(PREFIX)).length
  console.log(`  rows after: ${after} (before: ${before}), leftover test rows: ${leftRows}, leftover test folders: ${leftFolders}`)
  if (after !== before || leftRows || leftFolders) { failed++; console.log('  FAIL cleanup left something behind') }
}

console.log(`\n${passed}/${passed + failed} passed`)
process.exit(failed ? 1 : 0)
