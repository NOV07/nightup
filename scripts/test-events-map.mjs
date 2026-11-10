#!/usr/bin/env node
/**
 * Offline tests for the events layer of /map: which events become a point
 * (date window, coordinates), the pin colour, and the event coordinate check the
 * API routes use. No network, no database.
 *
 *   node scripts/test-events-map.mjs
 */
import assert from 'node:assert/strict'
import { eventToPoint } from '../app/lib/mapEvents.ts'
import { eventTypeOf } from '../app/lib/eventTypes.ts'
import { MAP_EVENT_COLOR, mapPointColor, MAP_CATEGORY_COLORS } from '../app/lib/mapColors.ts'
import { eventCoordsError } from '../app/lib/mapsCoords.ts'

let passed = 0, failed = 0
function test(name, fn) {
  try { fn(); passed++; console.log(`  ok   ${name}`) }
  catch (e) { failed++; console.log(`  FAIL ${name}\n       ${e.message}`) }
}

const WIN = { from: '2026-11-09', to: '2027-01-10' }
const row = (over = {}) => ({ id: 'ev1', title: 'Techno night', date: '2026-11-14', time: '22:00:00', venue: 'Gazi Hall', city: 'Athens', lat: 37.9778, lng: 23.7117, ...over })

console.log('which events become a point')
test('valid upcoming event', () => {
  const p = eventToPoint(row(), WIN, '/img.png')
  assert.equal(p.kind, 'event'); assert.equal(p.id, 'e-ev1'); assert.equal(p.slug, 'ev1')
  assert.deepEqual([p.lat, p.lng], [37.9778, 23.7117]); assert.deepEqual(p.categories, []); assert.equal(p.image, '/img.png')
  assert.deepEqual(p.event, { date: '2026-11-14', time: '22:00:00', venue: 'Gazi Hall', type: 'other', genres: [] })
})
test('the window includes both ends and nothing outside', () => {
  assert.ok(eventToPoint(row({ date: WIN.from }), WIN, null)); assert.ok(eventToPoint(row({ date: WIN.to }), WIN, null))
  assert.equal(eventToPoint(row({ date: '2026-11-08' }), WIN, null), null); assert.equal(eventToPoint(row({ date: '2027-01-11' }), WIN, null), null)
})
test('a date with a time part still compares by day', () => assert.ok(eventToPoint(row({ date: '2026-11-09T00:00:00' }), WIN, null)))
test('no coordinates: not on the map (old events)', () => {
  assert.equal(eventToPoint(row({ lat: null, lng: null }), WIN, null), null)
  assert.equal(eventToPoint(row({ lat: undefined, lng: undefined }), WIN, null), null)
})
test('only one coordinate: not on the map', () => {
  assert.equal(eventToPoint(row({ lng: null }), WIN, null), null)
  assert.equal(eventToPoint(row({ lat: null }), WIN, null), null)
})
test('string, NaN or out-of-range coordinates: not on the map', () => {
  assert.equal(eventToPoint(row({ lat: '37.9' }), WIN, null), null)
  assert.equal(eventToPoint(row({ lat: NaN }), WIN, null), null)
  assert.equal(eventToPoint(row({ lat: 91 }), WIN, null), null)
  assert.equal(eventToPoint(row({ lng: -181 }), WIN, null), null)
})
test('coordinate 0 is a real value, not "missing"', () => assert.ok(eventToPoint(row({ lat: 0, lng: 0 }), WIN, null)))
test('missing title, id or date: not on the map', () => {
  assert.equal(eventToPoint(row({ title: '  ' }), WIN, null), null)
  assert.equal(eventToPoint(row({ id: null }), WIN, null), null)
  assert.equal(eventToPoint(row({ date: null }), WIN, null), null)
})
test('no time / venue / city give nulls', () => {
  const p = eventToPoint(row({ time: null, venue: '', city: null }), WIN, null)
  assert.deepEqual(p.event, { date: '2026-11-14', time: null, venue: null, type: 'other', genres: [] }); assert.equal(p.area, null)
})

console.log('event type (events.type -> the map\'s four types)')
test('the four stored keys stay as they are', () => {
  for (const t of ['music', 'culture', 'sports', 'other']) assert.equal(eventTypeOf(t), t)
})
test('Club Night, Live Show, Festival, Open Air -> music', () => {
  for (const t of ['Club Night', 'Live Show', 'Festival', 'Open Air']) assert.equal(eventTypeOf(t), 'music', t)
})
test('Private Party and Other -> other (every value of the organiser form is covered)', () => {
  for (const t of ['Private Party', 'Other']) assert.equal(eventTypeOf(t), 'other', t)
})
test('null, undefined, empty and unknown values -> other', () => {
  for (const t of [null, undefined, '', ' ', 'concert', 'Techno', 'Theatre', 0, 1, true, {}, [], ['music']]) assert.equal(eventTypeOf(t), 'other', JSON.stringify(t))
})
test('the match is exact: other spellings of the legacy values are unknown, so other', () => {
  for (const t of ['club night', 'Club night', 'CLUB NIGHT', ' Club Night', 'Club Night ', 'live show', 'open air', 'MUSIC', 'Music', 'Culture', 'Sports', 'festival']) assert.equal(eventTypeOf(t), 'other', JSON.stringify(t))
})
test('every value the organiser form offers has a type', () => {
  const FORM = ['Club Night', 'Live Show', 'Festival', 'Open Air', 'Private Party', 'Other']
  assert.deepEqual(FORM.map(eventTypeOf), ['music', 'music', 'music', 'music', 'other', 'other'])
})
test('the point carries the mapped type', () => {
  const type = (raw) => eventToPoint(row({ type: raw }), WIN, null).event.type
  assert.equal(type('Club Night'), 'music'); assert.equal(type('Private Party'), 'other'); assert.equal(type('culture'), 'culture'); assert.equal(type(null), 'other')
})

console.log('pin colour')
const pt = (id, kind, categories) => ({ id, kind, categories })
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
