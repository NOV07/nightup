#!/usr/bin/env node
/**
 * Offline tests for the admin Add Spot input rules (app/lib/spotInput.ts) and
 * slug generation (app/lib/slug.ts). No network, no server.
 *
 *   node scripts/test-admin-add-spot.mjs
 */
import assert from 'node:assert/strict'
import { checkAdminSpotInput, SPOT_FIELDS, ADMIN_SPOT_INPUT_FIELDS } from '../app/lib/spotInput.ts'
import { slugify, uniqueSlug } from '../app/lib/slug.ts'

let passed = 0, failed = 0
function test(name, fn) {
  try { fn(); passed++; console.log(`  ok   ${name}`) }
  catch (e) { failed++; console.log(`  FAIL ${name}\n       ${e.message}`) }
}

const base = () => ({
  name: 'Κήπος Bar', slug: null, category: 'drink', subcategory: 'cocktail bar', city: 'Athens',
  neighborhood: '', address: 'Ermou 1', description: '', cover_image: '', price_level: 2,
  price_text: '15-30€', rating: null, instagram: '', is_sponsored: false, featured: false,
  is_published: false, crop_x: null, crop_y: null, crop_width: null, crop_height: null,
  lat: 37.9755, lng: 23.7348,
})
const err = (input) => { const r = checkAdminSpotInput(input); assert.equal(r.ok, false, 'expected rejection'); return r.error }
const ok = (input) => { const r = checkAdminSpotInput(input); assert.equal(r.ok, true, r.error); return r }

console.log('checkAdminSpotInput: accepted payloads')
test('the admin form payload passes', () => {
  const { row, slugRoot } = ok(base())
  assert.equal(slugRoot, 'kipos-bar')
  assert.equal(row.name, 'Κήπος Bar')
  assert.equal(row.neighborhood, null, 'empty text becomes null')
  assert.equal(row.lat, 37.9755)
  assert.equal('slug' in row, false, 'slug is never written as given')
})
test('is_published is always explicit: false when unticked', () => assert.equal(ok(base()).row.is_published, false))
test('is_published true when ticked', () => assert.equal(ok({ ...base(), is_published: true }).row.is_published, true))
test('is_published false when the key is missing (never the DB default)', () => {
  const b = base(); delete b.is_published
  assert.equal(ok(b).row.is_published, false)
})
test('no owner: owner_id and claimed_by_profile_id are null', () => {
  const { row } = ok(base())
  assert.equal(row.owner_id, null)
  assert.equal(row.claimed_by_profile_id, null)
})
test('row only holds whitelisted columns', () => {
  const allowed = new Set([...SPOT_FIELDS, 'rating', 'is_sponsored', 'featured', 'is_published', 'owner_id', 'claimed_by_profile_id'])
  for (const k of Object.keys(ok(base()).row)) assert.ok(allowed.has(k), `unexpected column ${k}`)
})
test('empty subcategory is allowed', () => assert.equal(ok({ ...base(), subcategory: '' }).row.subcategory, null))
test('a given slug is slugified', () => assert.equal(ok({ ...base(), slug: '  My Spot!! ' }).slugRoot, 'my-spot'))
test('a slug of only symbols falls back to the name', () => assert.equal(ok({ ...base(), slug: '!!!' }).slugRoot, 'kipos-bar'))

console.log('checkAdminSpotInput: rejections')
test('unknown field', () => assert.match(err({ ...base(), status: 'approved' }), /Unknown field.*status/))
test('profile_id is unknown', () => assert.match(err({ ...base(), profile_id: null }), /profile_id/))
for (const k of ['owner_id', 'claimed_by_profile_id', 'geo', 'id', 'created_at']) {
  test(`${k} from the client is rejected`, () => assert.match(err({ ...base(), [k]: 'x' }), new RegExp(k)))
}
test('missing name', () => assert.match(err({ ...base(), name: '   ' }), /Name is required/))
test('name not a string', () => assert.match(err({ ...base(), name: 42 }), /name must be text/))
test('name too long', () => assert.match(err({ ...base(), name: 'x'.repeat(121) }), /too long/))
test('price_text over the DB limit', () => assert.match(err({ ...base(), price_text: 'x'.repeat(41) }), /price_text is too long/))
test('invalid category', () => assert.match(err({ ...base(), category: 'casino' }), /Category must be one of/))
test('subcategory not in the list', () => assert.match(err({ ...base(), subcategory: 'karaoke' }), /not in the list/))
test('subcategory from another category', () => assert.match(err({ ...base(), subcategory: 'club' }), /not in the list for drink/))
test('no pin', () => assert.match(err({ ...base(), lat: null, lng: null }), /Missing coordinates/))
test('pin out of range', () => assert.match(err({ ...base(), lat: 123, lng: 23 }), /Invalid coordinates/))
test('lat as a string', () => assert.match(err({ ...base(), lat: '37.9' }), /Invalid coordinates/))
test('price_level out of range', () => assert.match(err({ ...base(), price_level: 7 }), /price_level/))
test('rating out of range', () => assert.match(err({ ...base(), rating: 9 }), /rating/))
test('cover_image not a URL', () => assert.match(err({ ...base(), cover_image: 'javascript:alert(1)' }), /cover_image must be/))
test('is_published not boolean', () => assert.match(err({ ...base(), is_published: 'yes' }), /is_published/))
test('not an object', () => assert.equal(err(null), 'Invalid request'))
test('array body', () => assert.equal(err([]), 'Invalid request'))
test('slug is accepted as input', () => assert.ok(ADMIN_SPOT_INPUT_FIELDS.includes('slug')))

console.log('slug')
test('Greek name', () => assert.equal(slugify('Μπαρ Ουζερί'), 'bar-ouzeri'))
test('free root kept', () => assert.equal(uniqueSlug('kipos', new Set(['other'])), 'kipos'))
test('taken root gets -2', () => assert.equal(uniqueSlug('kipos', new Set(['kipos'])), 'kipos-2'))
test('next free suffix', () => assert.equal(uniqueSlug('kipos', new Set(['kipos', 'kipos-2', 'kipos-3'])), 'kipos-4'))
test('empty base falls back to spot', () => assert.equal(uniqueSlug('', new Set()), 'spot'))

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
