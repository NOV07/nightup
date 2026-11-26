#!/usr/bin/env node
/**
 * Offline tests for the day label / date format of the "Or try an event ..."
 * box in the Tonight modal (app/lib/eventDayLabel.ts). Exact instants, so it
 * must not depend on the machine's zone:  TZ=America/Los_Angeles node ...
 *
 *   node scripts/test-event-day-label.mjs
 */
import assert from 'node:assert/strict'
import { getEventDayLabel, formatEventDateTime } from '../app/lib/eventDayLabel.ts'
import { tr } from '../app/lib/translations.ts'

let passed = 0, failed = 0
function test(name, fn) {
  try { fn(); passed++; console.log(`  ok   ${name}`) }
  catch (e) { failed++; console.log(`  FAIL ${name}\n       ${e.message}`) }
}
const el = (k) => tr(k, 'el'), en = (k) => tr(k, 'en')
// 2026-11-26 is a Thursday, Athens = UTC+2.
const now = new Date('2026-11-26T18:00:00Z') // 20:00 Athens
const label = (date, time, t = el, n = now) => getEventDayLabel({ date, time }, t, n)

test('same night', () => assert.equal(label('2026-11-26', '21:00'), 'απόψε'))
test('tomorrow', () => assert.equal(label('2026-11-27', '21:00'), 'αύριο'))
test('2 days: weekday + dd/mm', () => assert.equal(label('2026-11-28', '21:00'), 'το Σάββατο 28/11'))
test('6 days', () => assert.equal(label('2026-12-02', '21:00'), 'την Τετάρτη 02/12'))
test('7+ days', () => assert.equal(label('2026-12-03', '21:00'), 'στις 03/12'))
test('01:00 belongs to previous calendar day night', () => {
  assert.equal(label('2026-11-27', '01:00'), 'απόψε')
  assert.equal(label('2026-11-28', '01:00'), 'αύριο')
})
test('after midnight now: still yesterday night', () => {
  const late = new Date('2026-11-26T23:30:00Z') // 01:30 Athens on the 27th -> night of 26th
  assert.equal(label('2026-11-26', '22:00', el, late), 'απόψε')
  assert.equal(label('2026-11-27', '21:00', el, late), 'αύριο')
})
test('Athens zone, not UTC (23:30 UTC = 01:30 Athens)', () => {
  assert.equal(label('2026-11-27', '21:00', el, new Date('2026-11-27T22:30:00Z')), 'απόψε')
})
test('past night and bad date', () => {
  assert.equal(label('2026-11-24', '21:00'), 'στις 24/11')
  assert.equal(label('garbage', '21:00'), '')
})
test('english', () => {
  assert.equal(label('2026-11-26', '21:00', en), 'tonight')
  assert.equal(label('2026-11-27', '21:00', en), 'tomorrow')
  assert.equal(label('2026-11-28', '21:00', en), 'on Saturday 28/11')
  assert.equal(label('2026-12-10', '21:00', en), 'on 10/12')
})
test('no "απόψε" in non-tonight labels', () => {
  for (const d of ['2026-11-27', '2026-11-28', '2026-12-20']) assert.ok(!label(d, '21:00').includes('απόψε'))
})
test('card format', () => {
  assert.equal(formatEventDateTime({ date: '2026-11-28', time: '21:00' }, el), 'Σάβ 28/11 · 21:00')
  assert.equal(formatEventDateTime({ date: '2026-11-28', time: null }, en), 'Sat 28/11')
})

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
