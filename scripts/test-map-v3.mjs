#!/usr/bin/env node
/**
 * Offline tests for the controls of the map (v3/v4): the number on the filter button (how many things
 * differ from the default), the plural of the screen-reader count in both languages, and the radius chip
 * cycle 1 → 3 → 5 → all → 1.
 * No network, no database.
 *
 *   node scripts/test-map-v3.mjs
 */
import assert from 'node:assert/strict'
import { activeFilterCount, pluralLabel } from '../app/lib/mapUi.ts'
import { nextRadius, NEAR_RADII, DEFAULT_NEAR_RADIUS, parseNear, serializeNear } from '../app/lib/mapNear.ts'
import { NO_FILTERS, toggleGroupShown, setNight, normalizeFilters } from '../app/lib/mapFilters.ts'
import translations from '../app/lib/translations.ts'

let passed = 0, failed = 0
function test(name, fn) {
  try { fn(); passed++; console.log(`  ok   ${name}`) }
  catch (e) { failed++; console.log(`  FAIL ${name}\n       ${e.message}`) }
}

console.log('filter button count (changes from the default)')
const F = (over) => normalizeFilters({ ...NO_FILTERS, ...over })
test('the default (all groups shown, tonight, no filter, no Near me) = 0: no number', () => {
  assert.equal(activeFilterCount(NO_FILTERS, false), 0)
})
test('every hidden group counts one', () => {
  assert.equal(activeFilterCount(toggleGroupShown(NO_FILTERS, 'events'), false), 1)
  assert.equal(activeFilterCount(F({ shown: ['spots', 'wellness'] }), false), 1)
  assert.equal(activeFilterCount(F({ shown: ['spots'] }), false), 2)
  assert.equal(activeFilterCount(F({ shown: ['wellness'] }), false), 2)
})
test('hiding and showing a group again goes back to 0; all three hidden = 3', () => {
  const h = toggleGroupShown(NO_FILTERS, 'spots')
  assert.equal(activeFilterCount(h, false), 1)
  assert.equal(activeFilterCount(toggleGroupShown(h, 'spots'), false), 0)
  assert.equal(activeFilterCount(F({ shown: [] }), false), 3)
})
test('a night other than tonight adds one; tonight (null) adds nothing', () => {
  assert.equal(activeFilterCount(setNight(NO_FILTERS, '2026-11-11'), false), 1)
  assert.equal(activeFilterCount(setNight(NO_FILTERS, null), false), 0)
})
test('Near me adds one, only when it is active', () => {
  assert.equal(activeFilterCount(NO_FILTERS, true), 1)
  assert.equal(activeFilterCount(setNight(NO_FILTERS, '2026-11-12'), true), 2)
  assert.equal(activeFilterCount(setNight(NO_FILTERS, '2026-11-12'), false), 1)
})
test('any group filter adds exactly one, however many there are', () => {
  for (const over of [{ evTypes: ['music'] }, { evGenres: ['techno'] }, { spotStatus: 'open' }, { spotStatus: 'closed' }, { categories: ['drink'] }, { categories: ['drink'], subcategories: ['cocktail_bar'] }, { wellnessSubs: ['yoga'] }]) {
    assert.equal(activeFilterCount(F(over), false), 1, JSON.stringify(over))
  }
  assert.equal(activeFilterCount(F({ evTypes: ['music', 'sports'], evGenres: ['techno', 'jazz'], spotStatus: 'open', categories: ['drink', 'food'], subcategories: ['cocktail_bar'], wellnessSubs: ['yoga', 'sea_swim'] }), false), 1)
})
test('a filter of a hidden group still counts (it is still a change from the default)', () => {
  assert.equal(activeFilterCount(F({ shown: ['events', 'wellness'], spotStatus: 'open' }), false), 2)
})
test('all four kinds at once', () => {
  assert.equal(activeFilterCount(F({ shown: ['events', 'wellness'], night: '2026-11-13', evTypes: ['music'] }), true), 4)
})

console.log('count text for screen readers')
test('Greek: 1 → «1 σημείο», otherwise «N σημεία» (also 0 and 2)', () => {
  const c = { one: translations.map_count_one.el, many: translations.map_count_many.el }
  assert.deepEqual([1, 0, 2, 12].map(n => pluralLabel(n, c)), ['1 σημείο', '0 σημεία', '2 σημεία', '12 σημεία'])
})
test('English: 1 → "1 place", otherwise "N places"', () => {
  const c = { one: translations.map_count_one.en, many: translations.map_count_many.en }
  assert.deepEqual([1, 0, 25].map(n => pluralLabel(n, c)), ['1 place', '0 places', '25 places'])
})
test('every text of the controls exists in Greek and English', () => {
  for (const k of ['map_filters', 'map_clear', 'map_dock_close', 'map_legend_title', 'map_count_one', 'map_count_many', 'map_near_aria', 'map_near_radius_change', 'map_near_me', 'map_view_list', 'map_view_map', 'map_tonight', 'map_tomorrow', 'map_date_bar']) {
    assert.ok(translations[k]?.el && translations[k]?.en, k)
  }
  assert.equal(translations.map_filters.el, 'Φίλτρα'); assert.equal(translations.map_clear.el, 'Καθαρισμός')
})

console.log('radius chip')
test('cycles 1 → 3 → 5 → all → 1', () => {
  assert.deepEqual([1, 3, 5, 'all'].map(nextRadius), [3, 5, 'all', 1])
  let r = DEFAULT_NEAR_RADIUS
  const seen = []
  for (let i = 0; i < 5; i++) { seen.push(r); r = nextRadius(r) }
  assert.deepEqual(seen, [3, 5, 'all', 1, 3])
  assert.equal(DEFAULT_NEAR_RADIUS, 3)
  assert.deepEqual([...NEAR_RADII], [1, 3, 5, 'all'])
})
test('every step is a valid URL value and round-trips', () => {
  let r = 1
  for (let i = 0; i < 4; i++) {
    const qs = serializeNear({ on: true, radius: r })
    assert.deepEqual(parseNear(new URLSearchParams(qs)), { on: true, radius: r })
    r = nextRadius(r)
  }
})

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
