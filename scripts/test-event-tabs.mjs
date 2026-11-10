#!/usr/bin/env node
/**
 * Offline tests for the tabs of /events and the type chips of /events/all: both
 * group events with eventTypeOf (app/lib/eventTypes.ts), the same rule as /map.
 * Every event must land in exactly one tab, in every value of events.type.
 * No network, no database.
 *
 *   node scripts/test-event-tabs.mjs
 */
import assert from 'node:assert/strict'
import { eventTypeOf, eventsOfType, EVENT_TYPES } from '../app/lib/eventTypes.ts'
import { eventToPoint } from '../app/lib/mapEvents.ts'

let passed = 0, failed = 0
function test(name, fn) {
  try { fn(); passed++; console.log(`  ok   ${name}`) }
  catch (e) { failed++; console.log(`  FAIL ${name}\n       ${e.message}`) }
}

// One event per kind of value events.type can hold.
const VALUES = ['music', 'culture', 'sports', 'other', 'Club Night', 'Live Show', 'Festival', 'Open Air', 'Private Party', 'Other', null, undefined, '', 'concert', 'club night', 'MUSIC']
const EVENTS = VALUES.map((type, i) => ({ id: String(i), title: `e${i}`, type }))
const ids = (list) => list.map(e => e.id)
const tab = (t) => eventsOfType(EVENTS, t)

console.log('the four tabs')
test('Music: music, Club Night, Live Show, Festival, Open Air', () => assert.deepEqual(tab('music').map(e => e.type), ['music', 'Club Night', 'Live Show', 'Festival', 'Open Air']))
test('Culture: culture only', () => assert.deepEqual(tab('culture').map(e => e.type), ['culture']))
test('Sports: sports only', () => assert.deepEqual(tab('sports').map(e => e.type), ['sports']))
test('Other: other, Private Party, Other, null, undefined, empty and unknown values', () =>
  assert.deepEqual(tab('other').map(e => e.type), ['other', 'Private Party', 'Other', null, undefined, '', 'concert', 'club night', 'MUSIC']))

console.log('nothing is lost, nothing is twice')
test('every event is in exactly one tab', () => {
  const all = EVENT_TYPES.flatMap(t => ids(tab(t)))
  assert.equal(all.length, EVENTS.length); assert.deepEqual([...new Set(all)].sort(), ids(EVENTS).sort())
})
test('the counts add up to the total (what the tabs and /events/all chips show)', () => {
  assert.equal(EVENT_TYPES.reduce((n, t) => n + tab(t).length, 0), EVENTS.length)
  assert.deepEqual(EVENT_TYPES.map(t => tab(t).length), [5, 1, 1, 9])
})
test('order is kept (the page sorts by date)', () => assert.deepEqual(ids(tab('music')), ['0', '4', '5', '6', '7']))
test('an empty list gives empty tabs', () => { for (const t of EVENT_TYPES) assert.deepEqual(eventsOfType([], t), []) })
test('extra fields are untouched', () => {
  const e = { id: 'x', type: 'Festival', title: 'T', date: '2026-11-13', time: '22:00', venue: 'V', city: 'Athens' }
  assert.deepEqual(eventsOfType([e], 'music'), [e])
})

console.log('the /events/all chips: the filter is the same one')
const chip = (events, activeType) => events.filter(e => activeType === 'All' || eventTypeOf(e.type) === activeType)
test('All shows every event', () => assert.equal(chip(EVENTS, 'All').length, EVENTS.length))
test('each chip matches the tab of the same name', () => { for (const t of EVENT_TYPES) assert.deepEqual(ids(chip(EVENTS, t)), ids(tab(t))) })
test('null is Other, not Music (it used to be turned into music before the filter)', () => {
  assert.equal(chip([{ id: 'n', type: null }], 'music').length, 0); assert.equal(chip([{ id: 'n', type: null }], 'other').length, 1)
})
test('Club Night used to match no chip but All; now it is under Music', () => {
  assert.equal(chip([{ id: 'c', type: 'Club Night' }], 'music').length, 1)
  for (const t of ['culture', 'sports', 'other']) assert.equal(chip([{ id: 'c', type: 'Club Night' }], t).length, 0, t)
})
test('the rule is the one /map uses: a map point gets the type of the tab the event is in', () => {
  const win = { from: '2026-01-01', to: '2027-12-31' }
  for (const t of EVENT_TYPES) for (const e of tab(t)) {
    const p = eventToPoint({ id: e.id, title: 'T', date: '2026-11-13', lat: 37.9, lng: 23.7, type: e.type }, win, null)
    assert.equal(p.event.type, t, String(e.type))
  }
})

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
