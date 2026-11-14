#!/usr/bin/env node
/**
 * Offline test of the admin spot edit: PATCH /api/admin/spots/[id], the owner
 * route PATCH /api/spots/[id], and POST /api/gallery/upload. The route handlers
 * run for real; Supabase and revalidatePath are in-memory fakes
 * (scripts/lib/fake-*.mjs). No network, no server.
 *
 *   node scripts/test-admin-spot-edit.mjs
 */
import { register } from 'node:module'
import assert from 'node:assert/strict'

process.env.ADMIN_PASSWORD = 'test-admin-secret'
register('./lib/route-test-loader.mjs', import.meta.url)

const { db } = await import('./lib/fake-state.mjs')
const { NextRequest } = await import('next/server')
const { signAdminToken } = await import('../app/lib/adminAuth.ts')
const adminRoute = await import('../app/api/admin/spots/[id]/route.ts')
const ownerRoute = await import('../app/api/spots/[id]/route.ts')
const uploadRoute = await import('../app/api/gallery/upload/route.ts')

let passed = 0, failed = 0
async function test(name, fn) {
  db.user = null; db.updates = []; db.uploads = []; db.revalidated = []
  db.spots = [{ id: 's1', owner_id: 'owner-1', slug: 'oulaloum', name: 'Ουλαλούμ', address: 'Ermou 1', categories: ['drink'], category: 'drink', gallery: [], lat: 37.9, lng: 23.7 },
              { id: 's2', owner_id: null, slug: 'other', name: 'Other', categories: ['drink'], category: 'drink' }]
  try { await fn(); passed++; console.log(`  ok   ${name}`) }
  catch (e) { failed++; console.log(`  FAIL ${name}\n       ${e.message}`) }
}

const cookie = () => ({ cookie: `admin_auth=${signAdminToken()}` })
const patch = (url, body, headers = {}) =>
  new NextRequest(`http://t${url}`, { method: 'PATCH', body: JSON.stringify(body), headers: { 'content-type': 'application/json', ...headers } })
const ctx = id => ({ params: Promise.resolve({ id }) })
const gallery = [{ url: 'https://x.test/a.jpg', type: 'image' }, { url: 'https://x.test/b.jpg', type: 'image' }]

console.log('PATCH /api/admin/spots/[id]')
await test('admin cookie edits a spot owned by someone else and saves gallery', async () => {
  const res = await adminRoute.PATCH(patch('/api/admin/spots/s1', { gallery, phone: '210 1234567', website: 'https://o.test', opening_hours: { 'Δευτέρα': '18:00-02:00' } }, cookie()), ctx('s1'))
  assert.equal(res.status, 200)
  assert.deepEqual(db.updates[0].patch.gallery, gallery)
  assert.equal(db.updates[0].patch.phone, '210 1234567')
  assert.equal(db.spots[0].gallery.length, 2)
  assert.deepEqual(db.revalidated, ['spots'])
})
await test('admin-only fields are written; unknown columns are not', async () => {
  const res = await adminRoute.PATCH(patch('/api/admin/spots/s1', { featured: true, is_published: true, rating: 4.5, slug: 'Νέο Slug', owner_id: 'evil', geo: 'x', status: 'approved' }, cookie()), ctx('s1'))
  assert.equal(res.status, 200)
  const p = db.updates[0].patch
  assert.deepEqual([p.featured, p.is_published, p.rating, p.slug], [true, true, 4.5, 'neo-slug'])
  assert.ok(!('owner_id' in p) && !('geo' in p) && !('status' in p))
})
await test('a slug taken by another spot is refused', async () => {
  const res = await adminRoute.PATCH(patch('/api/admin/spots/s1', { slug: 'other' }, cookie()), ctx('s1'))
  assert.equal(res.status, 409)
})
await test('same validation as the owner route (address link, categories)', async () => {
  let res = await adminRoute.PATCH(patch('/api/admin/spots/s1', { address: 'https://maps.app.goo.gl/abc' }, cookie()), ctx('s1'))
  assert.equal(res.status, 400)
  assert.equal((await res.json()).code, 'address_is_link')
  res = await adminRoute.PATCH(patch('/api/admin/spots/s1', { categories: ['nope'] }, cookie()), ctx('s1'))
  assert.equal(res.status, 400)
})
await test('a spot with no pin can be saved without one', async () => {
  const res = await adminRoute.PATCH(patch('/api/admin/spots/s2', { lat: null, lng: null, phone: '1' }, cookie()), ctx('s2'))
  assert.equal(res.status, 200)
})
await test('no admin cookie -> 401, nothing written', async () => {
  const res = await adminRoute.PATCH(patch('/api/admin/spots/s1', { gallery }), ctx('s1'))
  assert.equal(res.status, 401)
  assert.equal(db.updates.length, 0)
})
await test('forged / expired cookie -> 401', async () => {
  const res = await adminRoute.PATCH(patch('/api/admin/spots/s1', { gallery }, { cookie: 'admin_auth=123.abcd' }), ctx('s1'))
  assert.equal(res.status, 401)
})
await test('unknown spot -> 404', async () => {
  const res = await adminRoute.PATCH(patch('/api/admin/spots/nope', { gallery }, cookie()), ctx('nope'))
  assert.equal(res.status, 404)
})

console.log('PATCH /api/spots/[id] (owner route unchanged)')
await test('owner editing someone else\'s spot -> 403', async () => {
  db.user = { id: 'owner-2' }
  const res = await ownerRoute.PATCH(patch('/api/spots/s1', { gallery }), ctx('s1'))
  assert.equal(res.status, 403)
  assert.equal(db.updates.length, 0)
})
await test('owner editing own spot still works, and cannot touch slug/is_published', async () => {
  db.user = { id: 'owner-1' }
  const res = await ownerRoute.PATCH(patch('/api/spots/s1', { gallery, slug: 'hijack', is_published: true, featured: true }), ctx('s1'))
  assert.equal(res.status, 200)
  const p = db.updates[0].patch
  assert.deepEqual(p.gallery, gallery)
  assert.ok(!('slug' in p) && !('is_published' in p) && !('featured' in p))
})
await test('owner route without a session -> 401', async () => {
  const res = await ownerRoute.PATCH(patch('/api/spots/s1', { gallery }), ctx('s1'))
  assert.equal(res.status, 401)
})

console.log('POST /api/gallery/upload')
function upload(headers = {}, type = 'image/jpeg', size = 100) {
  const fd = new FormData()
  fd.append('file', new File([new Uint8Array(size)], 'p h.jpg', { type }))
  fd.append('context', 'spot')
  return new NextRequest('http://t/api/gallery/upload', { method: 'POST', body: fd, headers })
}
await test('admin cookie without a Supabase user uploads under "admin"', async () => {
  const res = await uploadRoute.POST(upload(cookie()))
  assert.equal(res.status, 200)
  assert.match(db.uploads[0], /^spot\/admin\/\d+-p_h\.jpg$/)
  assert.equal((await res.json()).type, 'image')
})
await test('cover upload (context=spot, as ImageUpload viaApi sends it) with admin cookie returns a url', async () => {
  const res = await uploadRoute.POST(upload(cookie(), 'image/png'))
  assert.equal(res.status, 200)
  const json = await res.json()
  assert.match(json.url, /^https:\/\/fake\.test\/spot\/admin\//)
})
await test('a Supabase user still uploads under their id', async () => {
  db.user = { id: 'u-9' }
  const res = await uploadRoute.POST(upload())
  assert.equal(res.status, 200)
  assert.match(db.uploads[0], /^spot\/u-9\//)
})
await test('neither user nor admin cookie -> 401', async () => {
  const res = await uploadRoute.POST(upload())
  assert.equal(res.status, 401)
  assert.equal(db.uploads.length, 0)
})
await test('admin uploads keep the type and size checks', async () => {
  assert.equal((await uploadRoute.POST(upload(cookie(), 'application/pdf'))).status, 400)
  assert.equal((await uploadRoute.POST(upload(cookie(), 'image/jpeg', 9 * 1024 * 1024))).status, 400)
})

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
