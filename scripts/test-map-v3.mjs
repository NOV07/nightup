#!/usr/bin/env node
/**
 * Offline tests for the clean map (v3): the number on the filter button, the plural of
 * "See N places" in both languages, and the radius chip cycle 1 → 3 → 5 → all → 1.
 * No network, no database.
 *
 *   node scripts/test-map-v3.mjs
 */
import assert from 'node:assert/strict'
import { activeFilterCount, pluralLabel } from '../app/lib/mapUi.ts'
import { nextRadius, NEAR_RADII, DEFAULT_NEAR_RADIUS, parseNear, serializeNear } from '../app/lib/mapNear.ts'
import { NO_FILTERS, toggleGroupShown, setNight, showGroup } from '../app/lib/mapFilters.ts'
import translations from '../app/lib/translations.ts'

let passed = 0, failed = 0
function test(name, fn) {
  try { fn(); passed++; console.log(`  ok   ${name}`) }
  catch (e) { failed++; console.log(`  FAIL ${name}\n       ${e.message}`) }
}

console.log('filter button count')
test('nothing chosen = 0 (the button says "Choose what to see")', () => {
  assert.equal(activeFilterCount(NO_FILTERS, false), 0)
})
test('lit groups count one each', () => {
  let f = toggleGroupShown(NO_FILTERS, 'events')
  assert.equal(activeFilterCount(f, false), 1)
  f = showGroup(showGroup(f, 'spots'), 'wellness')
  assert.equal(activeFilterCount(f, false), 3)
  assert.equal(activeFilterCount(toggleGroupShown(f, 'spots'), false), 2)
})
test('a night other than tonight adds one; tonight (null) adds nothing', () => {
  const now = new Date('2026-11-10T19:30:00Z')
  const tomorrow = setNight(NO_FILTERS, '2026-11-11')
  assert.equal(activeFilterCount(tomorrow, false), 1)
  assert.equal(activeFilterCount({ shown: [], night: null }, false), 0)
  assert.ok(now)
})
test('Near me adds one, only when it is active', () => {
  assert.equal(activeFilterCount(NO_FILTERS, true), 1)
  const f = setNight(showGroup(NO_FILTERS, 'events'), '2026-11-12')
  assert.equal(activeFilterCount(f, true), 3)
  assert.equal(activeFilterCount(f, false), 2)
})
test('filters inside a group (type, genre, status, categories) do not add to the number', () => {
  const f = { ...showGroup(NO_FILTERS, 'spots'), categories: ['drink', 'food'], spotStatus: 'open', evGenres: ['techno'] }
  assert.equal(activeFilterCount(f, false), 1)
})

console.log('"See N places"')
const tpl = (lang) => ({ one: translations.map_see_one[lang], many: translations.map_see_many[lang] })
test('Greek: 1 → «Δες 1 σημείο», otherwise «Δες N σημεία» (also 0 and 2)', () => {
  assert.equal(pluralLabel(1, tpl('el')), 'Δες 1 σημείο')
  assert.equal(pluralLabel(0, tpl('el')), 'Δες 0 σημεία')
  assert.equal(pluralLabel(2, tpl('el')), 'Δες 2 σημεία')
  assert.equal(pluralLabel(12, tpl('el')), 'Δες 12 σημεία')
})
test('English: 1 → "See 1 place", otherwise "See N places"', () => {
  assert.equal(pluralLabel(1, tpl('en')), 'See 1 place')
  assert.equal(pluralLabel(0, tpl('en')), 'See 0 places')
  assert.equal(pluralLabel(25, tpl('en')), 'See 25 places')
})
test('the count text for screen readers follows the same rule', () => {
  const c = (lang) => ({ one: translations.map_count_one[lang], many: translations.map_count_many[lang] })
  assert.deepEqual([1, 5].map(n => pluralLabel(n, c('el'))), ['1 σημείο', '5 σημεία'])
  assert.deepEqual([1, 5].map(n => pluralLabel(n, c('en'))), ['1 place', '5 places'])
})
test('every new text exists in Greek and English', () => {
  for (const k of ['map_filter_prompt', 'map_sheet_title', 'map_see_one', 'map_see_many', 'map_count_one', 'map_count_many', 'map_legend_title', 'map_list_empty_pick', 'map_near_aria', 'map_near_radius_change', 'map_near_me', 'map_view_list', 'map_view_map']) {
    assert.ok(translations[k]?.el && translations[k]?.en, k)
  }
  assert.equal(translations.map_filter_prompt.el, 'Διάλεξε τι θες να δεις')
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
