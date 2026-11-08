#!/usr/bin/env node
/**
 * Offline tests for the public map: filter logic and URL (app/lib/mapFilters.ts),
 * pin colours (app/lib/mapColors.ts) and the wellness subcategory validation
 * (app/lib/wellnessSpots.ts). No network, no database.
 *
 *   node scripts/test-map-filters.mjs
 */
import assert from 'node:assert/strict'
import {
  NO_FILTERS, filterPoints, pointMatches, normalizeFilters, toggleMapCategory, toggleMapSub,
  parseFilters, serializeFilters, directionsUrl, hasFilters,
} from '../app/lib/mapFilters.ts'
import { MAP_CATEGORY_COLORS, mapColorOf } from '../app/lib/mapColors.ts'
import { SPOT_CATEGORY_KEYS } from '../app/lib/spotCategories.ts'
import { parseWellnessInput, WELLNESS_SUBS, WELLNESS_FIELDS } from '../app/lib/wellnessSpots.ts'

let passed = 0, failed = 0
function test(name, fn) {
  try { fn(); passed++; console.log(`  ok   ${name}`) }
  catch (e) { failed++; console.log(`  FAIL ${name}\n       ${e.message}`) }
}

const pt = (id, kind, categories, subcategories = []) => ({ id, kind, categories, subcategories })
const P = [
  pt('w-strefi', 'wellness', ['wellness'], ['sunset_spot']),
  pt('w-lyk', 'wellness', ['wellness'], ['sunset_spot', 'nature_walk']),
  pt('w-hymettus', 'wellness', ['wellness'], ['nature_walk']),
  pt('w-plain', 'wellness', ['wellness'], []),              // no subcategory set yet
  pt('s-cocktail', 'spot', ['drink'], ['cocktail_bar']),
  pt('s-wine', 'spot', ['drink', 'food'], ['wine_bar', 'italian']),
  pt('s-club', 'spot', ['nightlife'], ['club']),
  pt('s-bowl', 'spot', ['activity'], ['bowling']),
]
const ids = (f) => filterPoints(P, f).map(p => p.id)
const F = (categories, subcategories = []) => ({ categories, subcategories })

console.log('no filter')
test('everything shows', () => assert.equal(ids(NO_FILTERS).length, P.length))
test('hasFilters', () => { assert.equal(hasFilters(NO_FILTERS), false); assert.equal(hasFilters(F(['drink'])), true) })

console.log('one category')
test('wellness: all four wellness points, including the one with no subcategory', () =>
  assert.deepEqual(ids(F(['wellness'])), ['w-strefi', 'w-lyk', 'w-hymettus', 'w-plain']))
test('drink: both drink points (one is also food)', () => assert.deepEqual(ids(F(['drink'])), ['s-cocktail', 's-wine']))
test('a category nobody has gives nothing', () => assert.deepEqual(ids(F(['art'])), []))

console.log('several categories = OR')
test('drink + nightlife', () => assert.deepEqual(ids(F(['drink', 'nightlife'])), ['s-cocktail', 's-wine', 's-club']))
test('wellness + activity', () => assert.deepEqual(ids(F(['wellness', 'activity'])), ['w-strefi', 'w-lyk', 'w-hymettus', 'w-plain', 's-bowl']))
test('all categories on = everything', () => assert.equal(ids(F(SPOT_CATEGORY_KEYS)).length, P.length))

console.log('subcategories = OR inside a category')
test('wellness + sunset_spot', () => assert.deepEqual(ids(F(['wellness'], ['sunset_spot'])), ['w-strefi', 'w-lyk']))
test('wellness + sunset_spot + nature_walk', () => assert.deepEqual(ids(F(['wellness'], ['sunset_spot', 'nature_walk'])), ['w-strefi', 'w-lyk', 'w-hymettus']))
test('a point with no subcategory is hidden once a sub is chosen', () => assert.equal(ids(F(['wellness'], ['yoga'])).includes('w-plain'), false))
test('drink + cocktail_bar', () => assert.deepEqual(ids(F(['drink'], ['cocktail_bar'])), ['s-cocktail']))
test('subs of one category do not narrow another category', () =>
  assert.deepEqual(ids(F(['drink', 'wellness'], ['cocktail_bar'])), ['w-strefi', 'w-lyk', 'w-hymettus', 'w-plain', 's-cocktail']))
test('multi-category point matches through ONE of its categories', () => {
  // wine: drink (wine_bar) + food (italian). food + italian -> yes; drink + cocktail_bar -> no.
  assert.deepEqual(ids(F(['food'], ['italian'])), ['s-wine'])
  assert.deepEqual(ids(F(['drink'], ['cocktail_bar'])), ['s-cocktail'])
})
test('a sub of the point does not count under a category it was not picked for', () =>
  assert.equal(pointMatches(pt('x', 'spot', ['drink', 'food'], ['italian']), F(['drink'], ['wine_bar'])), false))

console.log('combinations with zero results')
test('wellness + a sub nobody has', () => assert.deepEqual(ids(F(['wellness'], ['sea_swim'])), []))
test('drink + a sub that only the other drink point lacks', () => assert.deepEqual(ids(F(['drink'], ['speakeasy'])), []))
test('nightlife + karaoke', () => assert.deepEqual(ids(F(['nightlife'], ['karaoke'])), []))
test('empty point list', () => assert.deepEqual(filterPoints([], F(['drink'])), []))

console.log('toggling')
test('selecting a sub also selects its category', () =>
  assert.deepEqual(toggleMapSub(NO_FILTERS, 'yoga'), F(['wellness'], ['yoga'])))
test('turning a category off drops its subs only', () => {
  const f = F(['drink', 'wellness'], ['cocktail_bar', 'yoga'])
  assert.deepEqual(toggleMapCategory(f, 'drink'), F(['wellness'], ['yoga']))
})
test('turning the last sub off keeps the category (whole category shows again)', () =>
  assert.deepEqual(toggleMapSub(F(['wellness'], ['yoga']), 'yoga'), F(['wellness'])))
test('unknown sub is ignored', () => assert.deepEqual(toggleMapSub(NO_FILTERS, 'rooftop_bar'), NO_FILTERS))
test('normalize: unknown keys, duplicates and orphan subs are dropped, display order kept', () =>
  assert.deepEqual(normalizeFilters({ categories: ['wellness', 'nope', 'drink', 'drink'], subcategories: ['yoga', 'club', 'zzz', 'yoga'] }), F(['drink', 'wellness'], ['yoga'])))

console.log('URL (?c=…&s=…)')
test('serialize empty', () => assert.equal(serializeFilters(NO_FILTERS), ''))
test('serialize', () => assert.equal(serializeFilters(F(['drink', 'wellness'], ['cocktail_bar', 'sunset_spot'])), 'c=drink,wellness&s=cocktail_bar,sunset_spot'))
test('serialize categories only', () => assert.equal(serializeFilters(F(['food'])), 'c=food'))
test('parse', () => assert.deepEqual(parseFilters(new URLSearchParams('c=wellness,drink&s=yoga,cocktail_bar')), F(['drink', 'wellness'], ['cocktail_bar', 'yoga'])))
test('round trip', () => {
  const f = F(['nightlife', 'wellness'], ['club', 'nature_walk'])
  assert.deepEqual(parseFilters(new URLSearchParams(serializeFilters(f))), f)
})
test('garbage in the URL gives no filter', () => assert.deepEqual(parseFilters(new URLSearchParams('c=%3Cscript%3E&s=;;,')), NO_FILTERS))
test('a sub without its category in the URL is dropped', () => assert.deepEqual(parseFilters(new URLSearchParams('s=yoga')), NO_FILTERS))
test('no params', () => assert.deepEqual(parseFilters(new URLSearchParams('')), NO_FILTERS))

console.log('colours and directions')
test('every category has a colour, one constant', () => {
  for (const k of SPOT_CATEGORY_KEYS) assert.match(MAP_CATEGORY_COLORS[k], /^#[0-9A-F]{6}$/i, k)
  assert.equal(Object.keys(MAP_CATEGORY_COLORS).length, SPOT_CATEGORY_KEYS.length)
})
test('the colours chosen by the owner', () => assert.deepEqual(MAP_CATEGORY_COLORS, {
  drink: '#E8A020', food: '#E8704A', nightlife: '#5B8DEF', show: '#E066A8', chill: '#8FB8DE', activity: '#A3D65C', art: '#D9C7A0', wellness: '#4FC3A1',
}))
test('a spot takes the colour of its first category', () => assert.equal(mapColorOf(['food', 'drink'][0]), '#E8704A'))
test('directions link', () => assert.equal(directionsUrl(37.99, 23.736), 'https://www.google.com/maps/dir/?api=1&destination=37.99,23.736'))

console.log('wellness_spots: subcategory validation (API)')
test('subcategories is in the allowlist', () => assert.ok(WELLNESS_FIELDS.includes('subcategories')))
test('only the four wellness subs are offered', () =>
  assert.deepEqual(WELLNESS_SUBS.map(s => s.key), ['sunset_spot', 'yoga', 'sea_swim', 'nature_walk']))
const parse = (subcategories) => parseWellnessInput({ subcategories })
test('valid: one, two, three', () => {
  assert.deepEqual(parse(['yoga']).row.subcategories, ['yoga'])
  assert.deepEqual(parse(['yoga', 'sea_swim']).row.subcategories, ['yoga', 'sea_swim'])
  assert.deepEqual(parse(['sunset_spot', 'yoga', 'sea_swim']).row.subcategories, ['sunset_spot', 'yoga', 'sea_swim'])
})
test('empty list clears', () => assert.deepEqual(parse([]).row.subcategories, []))
test('four is refused', () => assert.equal(parse(['sunset_spot', 'yoga', 'sea_swim', 'nature_walk']).ok, false))
test('duplicates are dropped before counting', () => assert.deepEqual(parse(['yoga', 'yoga', 'yoga', 'yoga']).row.subcategories, ['yoga']))
test('subs of other categories are refused', () => {
  for (const k of ['cocktail_bar', 'club', 'museum', 'rooftop_bar', 'nope']) assert.equal(parse([k]).ok, false, k)
})
test('not a list / not text is refused', () => {
  assert.equal(parse('yoga').ok, false)
  assert.equal(parse([5]).ok, false)
  assert.equal(parse(null).ok, false)
})
test('absent key = untouched (PATCH)', () => assert.equal('subcategories' in parseWellnessInput({ name: 'x' }).row, false))

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
