#!/usr/bin/env node
/**
 * Offline tests for the Spots / Wellness category filters of the public map
 * (app/lib/mapFilters.ts), their URL, the pin colours (app/lib/mapColors.ts)
 * and the wellness subcategory validation (app/lib/wellnessSpots.ts). The
 * groups, the date and the open/closed status are in test-map-groups.mjs.
 * No network, no database.
 *
 *   node scripts/test-map-filters.mjs
 */
import assert from 'node:assert/strict'
import {
  NO_FILTERS, filterPoints, pointMatches, normalizeFilters, toggleMapCategory, toggleMapSub,
  parseFilters, serializeFilters, directionsUrl, hasFilters, SPOT_FILTER_CATEGORIES,
} from '../app/lib/mapFilters.ts'
import { MAP_CATEGORY_COLORS, mapColorOf } from '../app/lib/mapColors.ts'
import { SPOT_CATEGORY_KEYS } from '../app/lib/spotCategories.ts'
import { parseWellnessInput, WELLNESS_SUBS, WELLNESS_FIELDS } from '../app/lib/wellnessSpots.ts'

let passed = 0, failed = 0
function test(name, fn) {
  try { fn(); passed++; console.log(`  ok   ${name}`) }
  catch (e) { failed++; console.log(`  FAIL ${name}\n       ${e.message}`) }
}

// Points as the Spots filter sees them. «wellness» is NOT a Spots category any more: a venue that
// also carries it is found through its other categories (wine: drink + food + wellness).
const pt = (id, kind, categories, subcategories = []) => ({ id, kind, categories, subcategories })
const P = [
  pt('s-cocktail', 'spot', ['drink'], ['cocktail_bar']),
  pt('s-wine', 'spot', ['drink', 'food'], ['wine_bar', 'italian']),
  pt('s-club', 'spot', ['nightlife'], ['club']),
  pt('s-bowl', 'spot', ['activity'], ['bowling']),
  pt('s-spa', 'spot', ['wellness'], []),                        // only wellness: no category matches it
  pt('s-café', 'spot', ['chill', 'wellness'], ['all_day_cafe']), // chill + wellness
]
const ids = (f) => filterPoints(P, f).map(p => p.id)
const F = (categories, subcategories = []) => ({ ...NO_FILTERS, categories, subcategories })
// The same filters with the Spots layer lit: what picking a category or a status (or an old link) gives.
const LIT = (f) => ({ ...f, shown: ['spots'] })

console.log('no filter')
test('everything shows, wellness-only included', () => assert.equal(ids(NO_FILTERS).length, P.length))
test('hasFilters', () => { assert.equal(hasFilters(NO_FILTERS), false); assert.equal(hasFilters(F(['drink'])), true) })
test('wellness is not a Spots category', () => {
  assert.equal(SPOT_FILTER_CATEGORIES.includes('wellness'), false)
  assert.equal(SPOT_FILTER_CATEGORIES.length, SPOT_CATEGORY_KEYS.length - 1)
})

console.log('one category')
test('drink: both drink points (one is also food)', () => assert.deepEqual(ids(F(['drink'])), ['s-cocktail', 's-wine']))
test('a category nobody has gives nothing', () => assert.deepEqual(ids(F(['art'])), []))
test('a spot with wellness AND another category is filtered by the other one', () => {
  assert.deepEqual(ids(F(['chill'])), ['s-café'])
  assert.equal(ids(F(['drink'])).includes('s-café'), false)
})
test('a wellness-only spot shows with no category selected, and disappears once one is', () => {
  assert.ok(ids(NO_FILTERS).includes('s-spa')); assert.equal(ids(F(['drink'])).includes('s-spa'), false)
})

console.log('several categories = OR')
test('drink + nightlife', () => assert.deepEqual(ids(F(['drink', 'nightlife'])), ['s-cocktail', 's-wine', 's-club']))
test('all categories on = every spot that has one of them', () => assert.equal(ids(F(SPOT_FILTER_CATEGORIES)).length, P.length - 1))

console.log('subcategories = OR inside a category')
test('drink + cocktail_bar', () => assert.deepEqual(ids(F(['drink'], ['cocktail_bar'])), ['s-cocktail']))
test('drink + two subs', () => assert.deepEqual(ids(F(['drink'], ['cocktail_bar', 'wine_bar'])), ['s-cocktail', 's-wine']))
test('subs of one category do not narrow another category', () =>
  assert.deepEqual(ids(F(['drink', 'nightlife'], ['cocktail_bar'])), ['s-cocktail', 's-club']))
test('multi-category point matches through ONE of its categories', () => {
  assert.deepEqual(ids(F(['food'], ['italian'])), ['s-wine'])
  assert.deepEqual(ids(F(['drink'], ['cocktail_bar'])), ['s-cocktail'])
})
test('a sub of the point does not count under a category it was not picked for', () =>
  assert.equal(pointMatches(pt('x', 'spot', ['drink', 'food'], ['italian']), F(['drink'], ['wine_bar'])), false))

console.log('combinations with zero results')
test('drink + a sub that no drink point has', () => assert.deepEqual(ids(F(['drink'], ['speakeasy'])), []))
test('nightlife + karaoke', () => assert.deepEqual(ids(F(['nightlife'], ['karaoke'])), []))
test('empty point list', () => assert.deepEqual(filterPoints([], F(['drink'])), []))

console.log('toggling')
test('selecting a sub also selects its category (and lights Spots)', () => assert.deepEqual(toggleMapSub(NO_FILTERS, 'cocktail_bar'), LIT(F(['drink'], ['cocktail_bar']))))
test('turning a category off drops its subs only', () => {
  const f = LIT(F(['drink', 'nightlife'], ['cocktail_bar', 'club']))
  assert.deepEqual(toggleMapCategory(f, 'drink'), LIT(F(['nightlife'], ['club'])))
})
test('turning the last sub off keeps the category (whole category shows again)', () =>
  assert.deepEqual(toggleMapSub(LIT(F(['drink'], ['cocktail_bar'])), 'cocktail_bar'), LIT(F(['drink']))))
test('unknown sub is ignored', () => assert.deepEqual(toggleMapSub(NO_FILTERS, 'rooftop_bar'), NO_FILTERS))
test('a wellness sub is not a Spots sub', () => assert.deepEqual(toggleMapSub(NO_FILTERS, 'yoga'), NO_FILTERS))
test('wellness cannot be toggled as a Spots category', () => assert.deepEqual(toggleMapCategory(NO_FILTERS, 'wellness'), NO_FILTERS))
test('normalize: unknown keys, duplicates and orphan subs are dropped, display order kept', () =>
  assert.deepEqual(normalizeFilters({ categories: ['nightlife', 'nope', 'drink', 'drink', 'wellness'], subcategories: ['cocktail_bar', 'museum', 'zzz', 'cocktail_bar', 'yoga'] }), F(['drink', 'nightlife'], ['cocktail_bar'])))

console.log('URL (?c=…&s=…)')
test('serialize empty', () => assert.equal(serializeFilters(NO_FILTERS), ''))
test('serialize (Spots lit)', () => assert.equal(serializeFilters(LIT(F(['drink', 'nightlife'], ['cocktail_bar', 'club']))), 'c=drink,nightlife&s=cocktail_bar,club&show=spots'))
test('serialize categories only', () => assert.equal(serializeFilters(LIT(F(['food']))), 'c=food&show=spots'))
test('serialize filters with nothing lit: show= says so', () => assert.equal(serializeFilters(F(['food'])), 'c=food&show='))
test('parse: a link with Spots filters and no show lights Spots', () => assert.deepEqual(parseFilters(new URLSearchParams('c=nightlife,drink&s=club,cocktail_bar')), LIT(F(['drink', 'nightlife'], ['cocktail_bar', 'club']))))
test('parse: with show, show decides', () => assert.deepEqual(parseFilters(new URLSearchParams('show=&c=drink')), F(['drink'])))
test('round trip', () => {
  const f = F(['nightlife', 'food'], ['club', 'italian'])
  assert.deepEqual(parseFilters(new URLSearchParams(serializeFilters(f))), normalizeFilters(f))
})
test('garbage in the URL gives no filter', () => assert.deepEqual(parseFilters(new URLSearchParams('c=%3Cscript%3E&s=;;,')), NO_FILTERS))
test('a sub without its category in the URL is dropped', () => assert.deepEqual(parseFilters(new URLSearchParams('s=cocktail_bar')), NO_FILTERS))
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
