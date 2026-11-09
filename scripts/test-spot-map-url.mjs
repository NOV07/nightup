#!/usr/bin/env node
/** Offline test for app/lib/spotMapUrl.ts.   node scripts/test-spot-map-url.mjs */
import assert from 'node:assert/strict'
import { spotMapUrl } from '../app/lib/spotMapUrl.ts'

const B = 'https://www.google.com/maps/search/?api=1&query='
let failed = 0
function test(name, fn) {
  try { fn(); console.log(`  ok   ${name}`) } catch (e) { failed++; console.log(`  FAIL ${name}\n       ${e.message}`) }
}

test('name + address + city, Greek encoded', () => {
  const u = spotMapUrl({ name: 'Ουλαλούμ', address: 'Αγίου Γεωργίου 5', city: 'Ηλιούπολη', lat: 37.9, lng: 23.7 })
  assert.equal(u, B + encodeURIComponent('Ουλαλούμ Αγίου Γεωργίου 5 Ηλιούπολη'))
  assert.equal(new URL(u).searchParams.get('query'), 'Ουλαλούμ Αγίου Γεωργίου 5 Ηλιούπολη')
})
test('empty address falls back to name + city', () => {
  for (const address of [null, undefined, '', '   ']) {
    assert.equal(spotMapUrl({ name: 'Ουλαλούμ', address, city: 'Ηλιούπολη', lat: 1, lng: 2 }),
      B + encodeURIComponent('Ουλαλούμ Ηλιούπολη'))
  }
})
test('no name: address + city', () => {
  assert.equal(spotMapUrl({ name: '', address: 'Ermou 10', city: 'Athina' }), B + encodeURIComponent('Ermou 10 Athina'))
})
test('no name and no address: coordinates', () => {
  assert.equal(spotMapUrl({ name: '', address: '', city: 'Athina', lat: 37.99, lng: 23.736 }), `${B}37.99,23.736`)
})
test('nothing usable: null', () => {
  assert.equal(spotMapUrl({ name: ' ', city: 'Athina' }), null)
  assert.equal(spotMapUrl({}), null)
})
test('special characters are encoded', () => {
  const u = spotMapUrl({ name: 'Bar & Grill #1', city: 'Athina' })
  assert.equal(new URL(u).searchParams.get('query'), 'Bar & Grill #1 Athina')
})
if (failed) process.exit(1)
