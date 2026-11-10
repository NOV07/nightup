#!/usr/bin/env node
/**
 * Offline tests for the map's "night" logic (app/lib/athensTime.ts) and for how
 * events and spots become map points (app/lib/mapEvents.ts). Every time is an
 * exact instant, so the result must not depend on the machine's time zone:
 * run it under another zone to check, e.g.  TZ=America/Los_Angeles node ...
 *
 *   node scripts/test-night.mjs
 */
import assert from 'node:assert/strict'
import {
  athensParts, nightOf, timeToMinutes, eventInNight, clampNight, statusMoment, eventLoadWindow,
  NIGHT_START_MINUTES, EVENING_CHECK_MINUTES, MAX_NIGHTS_AHEAD,
} from '../app/lib/athensTime.ts'
import { eventTypeOf, eventGenresOf, eventToPoint } from '../app/lib/mapEvents.ts'
import { spotStatusAt } from '../app/lib/openingHours.ts'

let passed = 0, failed = 0
function test(name, fn) {
  try { fn(); passed++; console.log(`  ok   ${name}`) }
  catch (e) { failed++; console.log(`  FAIL ${name}\n       ${e.message}`) }
}
// Winter (UTC+2) and summer (UTC+3) instants, written in UTC.
const at = (iso) => new Date(iso)

console.log('Athens clock')
test('winter is UTC+2', () => assert.deepEqual(athensParts(at('2026-11-10T19:30:00Z')), { date: '2026-11-10', minutes: 21 * 60 + 30 }))
test('summer is UTC+3', () => assert.deepEqual(athensParts(at('2026-07-15T18:30:00Z')), { date: '2026-07-15', minutes: 21 * 60 + 30 }))
test('Athens date runs ahead of the UTC date late in the evening', () => assert.deepEqual(athensParts(at('2026-11-09T22:30:00Z')), { date: '2026-11-10', minutes: 30 }))
test('daylight saving: clocks go back on 2026-10-25 (04:00 -> 03:00)', () => {
  assert.deepEqual(athensParts(at('2026-10-24T23:30:00Z')), { date: '2026-10-25', minutes: 2 * 60 + 30 })   // still UTC+3
  assert.deepEqual(athensParts(at('2026-10-25T01:30:00Z')), { date: '2026-10-25', minutes: 3 * 60 + 30 })   // UTC+2
})
test('midnight is minute 0, not 24:00', () => assert.deepEqual(athensParts(at('2026-11-09T22:00:00Z')), { date: '2026-11-10', minutes: 0 }))

console.log('the current night (06:00 edge, Europe/Athens)')
test('05:59 is still yesterday\'s night', () => assert.equal(nightOf(at('2026-11-10T03:59:00Z')), '2026-11-09'))
test('06:00 starts today\'s night', () => assert.equal(nightOf(at('2026-11-10T04:00:00Z')), '2026-11-10'))
test('summer edge: 05:59 / 06:00', () => {
  assert.equal(nightOf(at('2026-07-15T02:59:00Z')), '2026-07-14'); assert.equal(nightOf(at('2026-07-15T03:00:00Z')), '2026-07-15')
})
test('00:30 after midnight is yesterday\'s night', () => assert.equal(nightOf(at('2026-11-09T22:30:00Z')), '2026-11-09'))
test('23:59 is today\'s night', () => assert.equal(nightOf(at('2026-11-10T21:59:00Z')), '2026-11-10'))
test('across a month and a year', () => {
  assert.equal(nightOf(at('2026-12-01T00:10:00Z')), '2026-11-30')            // 02:10 Athens Dec 1 -> Nov 30
  assert.equal(nightOf(at('2026-11-30T23:10:00Z')), '2026-11-30')            // 01:10 Athens Dec 1
  assert.equal(nightOf(at('2026-12-31T23:30:00Z')), '2026-12-31')            // 01:30 Athens Jan 1 -> Dec 31
})
test('the machine\'s own zone changes nothing (this run is in ' + (process.env.TZ || 'the default zone') + ')', () => {
  assert.equal(nightOf(at('2026-11-10T03:59:00Z')), '2026-11-09'); assert.equal(nightOf(at('2026-11-10T04:00:00Z')), '2026-11-10')
})

console.log('which events belong to a night')
const ev = (date, time) => ({ date, time })
test('22:00 on D is the night of D', () => assert.ok(eventInNight(ev('2026-11-13', '22:00'), '2026-11-13')))
test('23:00 on D is the night of D', () => assert.ok(eventInNight(ev('2026-11-13', '23:00:00'), '2026-11-13')))
test('01:00 dated D+1 is the night of D', () => assert.ok(eventInNight(ev('2026-11-14', '01:00'), '2026-11-13')))
test('05:59 dated D+1 is the night of D, 06:00 dated D+1 is not', () => {
  assert.ok(eventInNight(ev('2026-11-14', '05:59'), '2026-11-13')); assert.ok(!eventInNight(ev('2026-11-14', '06:00'), '2026-11-13'))
})
test('06:00 dated D is the night of D, 05:59 dated D is not (it is the night of D-1)', () => {
  assert.ok(eventInNight(ev('2026-11-13', '06:00'), '2026-11-13')); assert.ok(!eventInNight(ev('2026-11-13', '05:59'), '2026-11-13'))
  assert.ok(eventInNight(ev('2026-11-13', '05:59'), '2026-11-12'))
})
test('01:00 dated D is not the night of D', () => assert.ok(!eventInNight(ev('2026-11-13', '01:00'), '2026-11-13')))
test('events of other days are out', () => {
  assert.ok(!eventInNight(ev('2026-11-12', '22:00'), '2026-11-13')); assert.ok(!eventInNight(ev('2026-11-15', '01:00'), '2026-11-13')); assert.ok(!eventInNight(ev('2026-11-15', '22:00'), '2026-11-13'))
})
test('no time: counts on its own date only', () => {
  assert.ok(eventInNight(ev('2026-11-13', null), '2026-11-13')); assert.ok(!eventInNight(ev('2026-11-14', null), '2026-11-13'))
  assert.ok(eventInNight(ev('2026-11-13', 'tba'), '2026-11-13'))
})
test('a date with a time part, a bad night', () => {
  assert.ok(eventInNight(ev('2026-11-13T00:00:00', '22:00'), '2026-11-13')); assert.ok(!eventInNight(ev('2026-11-13', '22:00'), 'nope'))
})
test('month and year edges', () => {
  assert.ok(eventInNight(ev('2027-01-01', '02:00'), '2026-12-31')); assert.ok(eventInNight(ev('2026-12-01', '00:00'), '2026-11-30'))
})
test('timeToMinutes', () => {
  assert.equal(timeToMinutes('22:00'), 1320); assert.equal(timeToMinutes('22:00:00'), 1320); assert.equal(timeToMinutes('7:05'), 425)
  for (const v of ['', '24:00', '12:60', 'abc', null, undefined, 2200]) assert.equal(timeToMinutes(v), null, String(v))
})
test('the constants', () => { assert.equal(NIGHT_START_MINUTES, 360); assert.equal(EVENING_CHECK_MINUTES, 1290); assert.equal(MAX_NIGHTS_AHEAD, 60) })

console.log('picking a night')
const NOW = at('2026-11-10T19:30:00Z') // Tuesday 21:30 Athens
test('a day in range is kept', () => assert.equal(clampNight('2026-11-13', NOW), '2026-11-13'))
test('tonight and tonight + 60 are kept, + 61 is cut to + 60', () => {
  assert.equal(clampNight('2026-11-10', NOW), '2026-11-10'); assert.equal(clampNight('2027-01-09', NOW), '2027-01-09'); assert.equal(clampNight('2027-01-10', NOW), '2027-01-09')
})
test('past days become tonight', () => assert.equal(clampNight('2026-11-09', NOW), '2026-11-10'))
test('before 06:00 "tonight" is yesterday, and that can still be picked', () => {
  const late = at('2026-11-10T00:30:00Z') // 02:30 Athens Nov 10 -> night of Nov 9
  assert.equal(clampNight('2026-11-09', late), '2026-11-09'); assert.equal(clampNight('2026-11-08', late), '2026-11-09'); assert.equal(clampNight(undefined, late), '2026-11-09')
})
test('garbage becomes tonight', () => { for (const v of ['', 'x', null, 42, '2026-02-30', '10/11/2026']) assert.equal(clampNight(v, NOW), '2026-11-10', String(v)) })

console.log('the moment a spot is judged at')
test('the current night: the real moment', () => assert.deepEqual(statusMoment('2026-11-10', NOW), { date: '2026-11-10', minutes: 1290 }))
test('another night: 21:30 of that date', () => assert.deepEqual(statusMoment('2026-11-13', NOW), { date: '2026-11-13', minutes: 1290 }))
test('before 06:00 on the current night: the calendar date and minute are today\'s real ones', () => {
  const late = at('2026-11-10T00:30:00Z') // 02:30 Athens Nov 10, night of Nov 9
  assert.deepEqual(statusMoment('2026-11-09', late), { date: '2026-11-10', minutes: 150 })
})
test('end to end with a real hours table (Ουλαλούμ)', () => {
  const OUL = { Δευτέρα: 'Κλειστά', Τρίτη: 'Κλειστά', Τετάρτη: '18:00-1:30', Πέμπτη: '18:00-1:30', Παρασκευή: '18:00-1:30', Σάββατο: '12:00-1:30', Κυριακή: '12:00-1:30' }
  const status = (night, now) => { const m = statusMoment(night, now); return spotStatusAt(OUL, m.date, m.minutes) }
  assert.equal(status('2026-11-10', NOW), 'closed')                    // Tue 21:30
  assert.equal(status('2026-11-11', NOW), 'open')                      // Wed night: 21:30
  assert.equal(status('2026-11-10', at('2026-11-11T22:30:00Z')), 'closed') // Wed 00:30 Athens (night of Tue): Tue closed, no tail
  assert.equal(status('2026-11-11', at('2026-11-12T22:30:00Z')), 'open')   // Thu 00:30 Athens (night of Wed): tail of Wed
  assert.equal(status('2026-11-15', NOW), 'open')                      // Sun 21:30
})

console.log('the event load window')
test('yesterday to +61 days, in Athens dates', () => assert.deepEqual(eventLoadWindow(NOW), { from: '2026-11-09', to: '2027-01-10' }))
test('uses the Athens date, not the UTC one', () => assert.deepEqual(eventLoadWindow(at('2026-11-09T22:30:00Z')), { from: '2026-11-09', to: '2027-01-10' }))
test('it contains every night that can be picked, with its morning after', () => {
  for (const now of [NOW, at('2026-11-10T00:30:00Z'), at('2026-11-09T22:05:00Z')]) {
    const w = eventLoadWindow(now), tonight = nightOf(now)
    assert.ok(tonight >= w.from, 'the current night starts inside the window')
    const last = clampNight('2099-01-01', now)
    assert.ok(`${last}` <= w.to)
  }
})

console.log('event type, genres and the point')
test('the four types as they are', () => { for (const t of ['music', 'culture', 'sports', 'other']) assert.equal(eventTypeOf(t), t) })
test('the legacy form values: the four music ones, then everything else is other', () => {
  for (const v of ['Club Night', 'Live Show', 'Festival', 'Open Air']) assert.equal(eventTypeOf(v), 'music', v)
  for (const v of ['Private Party', 'Other', '', null, undefined, 3, 'MUSIC', {}]) assert.equal(eventTypeOf(v), 'other', String(v))
})
test('genre keys: legacy spellings converted, unknown dropped, no duplicates', () => {
  assert.deepEqual(eventGenresOf({ genres: ['techno', 'house'] }), ['techno', 'house'])
  assert.deepEqual(eventGenresOf({ genres: ['Techno', 'techno', 'Ρεμπέτικα', 'nope'] }), ['techno', 'rebetiko'])
  assert.deepEqual(eventGenresOf({ genres: [], genre: 'jazz' }), ['jazz']); assert.deepEqual(eventGenresOf({ genres: null, genre: 'jazz' }), ['jazz'])
  assert.deepEqual(eventGenresOf({}), []); assert.deepEqual(eventGenresOf({ genres: 'techno' }), [])
})
test('the point carries date, time, venue, type and genres', () => {
  const p = eventToPoint({ id: 'a1', title: 'T', date: '2026-11-13', time: '22:00:00', venue: 'V', city: 'Athens', lat: 37.9, lng: 23.7, type: 'culture', genres: ['jazz'] }, { from: '2026-11-09', to: '2027-01-10' }, null)
  assert.deepEqual(p.event, { date: '2026-11-13', time: '22:00:00', venue: 'V', type: 'culture', genres: ['jazz'] })
})
test('a point can be tested against a night', () => {
  const win = { from: '2026-11-09', to: '2027-01-10' }
  const p = eventToPoint({ id: 'a1', title: 'T', date: '2026-11-14', time: '01:00:00', lat: 37.9, lng: 23.7 }, win, null)
  assert.ok(eventInNight(p.event, '2026-11-13')); assert.ok(!eventInNight(p.event, '2026-11-14'))
})

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
