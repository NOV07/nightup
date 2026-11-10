#!/usr/bin/env node
/**
 * Offline tests for the events layer of /map: which events become a point
 * (date, coordinates), how the layer switch and the category filters interact,
 * the ?events=1 URL state, the pin colour, and the event coordinate check the
 * API routes use. No network, no database.
 *
 *   node scripts/test-events-map.mjs
 */
import assert from 'node:assert/strict'
import { eventToPoint, localToday } from '../app/lib/mapEvents.ts'
import {
  NO_FILTERS, visiblePoints, hasFilters, parseFilters, serializeFilters, toggleMapEvents,
  toggleMapCategory, toggleMapSub, clearCategoryFilters, normalizeFilters,
} from '../app/lib/mapFilters.ts'
import { MAP_EVENT_COLOR, mapPointColor, MAP_CATEGORY_COLORS } from '../app/lib/mapColors.ts'
import { eventCoordsError } from '../app/lib/mapsCoords.ts'

let passed = 0, failed = 0
function test(name, fn) {
  try { fn(); passed++; console.log(`  ok   ${name}`) }
  catch (e) { failed++; console.log(`  FAIL ${name}\n       ${e.message}`) }
}

const TODAY = '2026-11-10'
const row = (over = {}) => ({ id: 'ev1', title: 'Techno night', date: '2026-11-14', time: '22:00:00', venue: 'Gazi Hall', city: 'Athens', lat: 37.9778, lng: 23.7117, ...over })

console.log('which events become a point')
test('valid upcoming event', () => {
  const p = eventToPoint(row(), TODAY, '/img.png')
  assert.equal(p.kind, 'event'); assert.equal(p.id, 'e-ev1'); assert.equal(p.slug, 'ev1')
  assert.deepEqual([p.lat, p.lng], [37.9778, 23.7117]); assert.deepEqual(p.categories, []); assert.equal(p.image, '/img.png')
  assert.deepEqual(p.event, { date: '2026-11-14', time: '22:00:00', venue: 'Gazi Hall' })
})
test('today counts, yesterday does not', () => {
  assert.ok(eventToPoint(row({ date: TODAY }), TODAY, null))
  assert.equal(eventToPoint(row({ date: '2026-11-09' }), TODAY, null), null)
})
test('a date with a time part still compares by day', () => assert.ok(eventToPoint(row({ date: '2026-11-10T00:00:00' }), TODAY, null)))
test('no coordinates: not on the map (old events)', () => {
  assert.equal(eventToPoint(row({ lat: null, lng: null }), TODAY, null), null)
  assert.equal(eventToPoint(row({ lat: undefined, lng: undefined }), TODAY, null), null)
})
test('only one coordinate: not on the map', () => {
  assert.equal(eventToPoint(row({ lng: null }), TODAY, null), null)
  assert.equal(eventToPoint(row({ lat: null }), TODAY, null), null)
})
test('string, NaN or out-of-range coordinates: not on the map', () => {
  assert.equal(eventToPoint(row({ lat: '37.9' }), TODAY, null), null)
  assert.equal(eventToPoint(row({ lat: NaN }), TODAY, null), null)
  assert.equal(eventToPoint(row({ lat: 91 }), TODAY, null), null)
  assert.equal(eventToPoint(row({ lng: -181 }), TODAY, null), null)
})
test('coordinate 0 is a real value, not "missing"', () => assert.ok(eventToPoint(row({ lat: 0, lng: 0 }), TODAY, null)))
test('missing title, id or date: not on the map', () => {
  assert.equal(eventToPoint(row({ title: '  ' }), TODAY, null), null)
  assert.equal(eventToPoint(row({ id: null }), TODAY, null), null)
  assert.equal(eventToPoint(row({ date: null }), TODAY, null), null)
})
test('no time / venue / city give nulls', () => {
  const p = eventToPoint(row({ time: null, venue: '', city: null }), TODAY, null)
  assert.deepEqual(p.event, { date: '2026-11-14', time: null, venue: null }); assert.equal(p.area, null)
})
test('localToday uses local date parts, zero padded', () => {
  assert.equal(localToday(new Date(2026, 0, 5, 23, 59)), '2026-01-05')
  assert.equal(localToday(new Date(2026, 10, 10, 0, 0)), '2026-11-10')
})

console.log('layer switch and filters')
const pt = (id, kind, categories, subcategories = []) => ({ id, kind, categories, subcategories })
const P = [
  pt('s-bar', 'spot', ['drink'], ['cocktail_bar']),
  pt('w-yoga', 'wellness', ['wellness'], ['yoga']),
  pt('e-1', 'event', []),
  pt('e-2', 'event', []),
]
const F = (categories = [], subcategories = [], events = false) => ({ categories, subcategories, events })
const ids = (f) => visiblePoints(P, f).map(p => p.id)
test('default: events layer is off', () => assert.deepEqual(ids(NO_FILTERS), ['s-bar', 'w-yoga']))
test('layer on: events join the rest', () => assert.deepEqual(ids(F([], [], true)), ['s-bar', 'w-yoga', 'e-1', 'e-2']))
test('category filter does not hide events when the layer is on', () => assert.deepEqual(ids(F(['wellness'], [], true)), ['w-yoga', 'e-1', 'e-2']))
test('category filter does not reveal events when the layer is off', () => assert.deepEqual(ids(F(['drink'])), ['s-bar']))
test('subcategory filter leaves events alone', () => assert.deepEqual(ids(F(['wellness'], ['yoga'], true)), ['w-yoga', 'e-1', 'e-2']))
test('toggleMapEvents flips only the layer', () => {
  const f = F(['drink'], ['cocktail_bar'])
  assert.deepEqual(toggleMapEvents(f), F(['drink'], ['cocktail_bar'], true))
  assert.deepEqual(toggleMapEvents(toggleMapEvents(f)), f)
})
test('category toggles keep the layer state', () => {
  assert.equal(toggleMapCategory(F([], [], true), 'drink').events, true)
  assert.equal(toggleMapSub(F([], [], true), 'yoga').events, true)
  assert.equal(toggleMapCategory(F(['drink'], [], true), 'drink').events, true)
})
test('hasFilters ignores the layer; clear keeps it', () => {
  assert.equal(hasFilters(F([], [], true)), false)
  assert.deepEqual(clearCategoryFilters(F(['drink'], ['cocktail_bar'], true)), F([], [], true))
  assert.deepEqual(clearCategoryFilters(F(['drink'])), NO_FILTERS)
})

console.log('URL (?events=1)')
test('serialize', () => {
  assert.equal(serializeFilters(F([], [], true)), 'events=1')
  assert.equal(serializeFilters(F(['drink'], [], true)), 'c=drink&events=1')
  assert.equal(serializeFilters(F(['drink'])), 'c=drink')
})
test('parse', () => {
  assert.deepEqual(parseFilters(new URLSearchParams('events=1')), F([], [], true))
  assert.deepEqual(parseFilters(new URLSearchParams('c=wellness&s=yoga&events=1')), F(['wellness'], ['yoga'], true))
})
test('only events=1 turns it on', () => {
  for (const v of ['0', 'true', '', 'yes', '2']) assert.equal(parseFilters(new URLSearchParams(`events=${v}`)).events, false)
  assert.deepEqual(parseFilters(new URLSearchParams('')), NO_FILTERS)
})
test('round trip', () => {
  const f = F(['nightlife', 'wellness'], ['club', 'yoga'], true)
  assert.deepEqual(parseFilters(new URLSearchParams(serializeFilters(f))), f)
})
test('normalize drops a non-boolean events value', () => assert.equal(normalizeFilters({ events: 'yes' }).events, false))

console.log('pin colour')
test('events are gold #E8A020', () => { assert.equal(MAP_EVENT_COLOR, '#E8A020'); assert.equal(mapPointColor(pt('e', 'event', [])), '#E8A020') })
test('spots and wellness keep their category colour', () => {
  assert.equal(mapPointColor(pt('s', 'spot', ['nightlife'])), MAP_CATEGORY_COLORS.nightlife)
  assert.equal(mapPointColor(pt('w', 'wellness', ['wellness'])), MAP_CATEGORY_COLORS.wellness)
})

console.log('event coordinate check (what the API routes run before saving)')
const bad = (body) => assert.ok(eventCoordsError(body), JSON.stringify(body))
const good = (body) => assert.equal(eventCoordsError(body), null, JSON.stringify(body))
test('no lat/lng keys: untouched', () => good({ title: 'x' }))
test('both null: event without a pin', () => good({ lat: null, lng: null }))
test('valid pair', () => { good({ lat: 37.9, lng: 23.7 }); good({ lat: 0, lng: 0 }); good({ lat: -90, lng: 180 }) })
test('only one of the two', () => { bad({ lat: 37.9 }); bad({ lng: 23.7 }); bad({ lat: 37.9, lng: null }); bad({ lat: null, lng: 23.7 }) })
test('out of range', () => { bad({ lat: 90.0001, lng: 23 }); bad({ lat: -91, lng: 23 }); bad({ lat: 37, lng: 181 }); bad({ lat: 37, lng: -180.5 }) })
test('strings and other types', () => { bad({ lat: '37.9', lng: '23.7' }); bad({ lat: 37.9, lng: '23.7' }); bad({ lat: true, lng: false }); bad({ lat: {}, lng: [] }) })
test('outside Greece is only a UI warning, never rejected', () => good({ lat: 51.5, lng: -0.12 }))

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
