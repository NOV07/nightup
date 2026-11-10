#!/usr/bin/env node
/**
 * Offline tests for how the map writes a night («Τρί 10 Νοε») and for the limits of the
 * date picker (tonight .. tonight + 60). The label is built from the date's own parts, so it must
 * not change with the time zone of the machine: run it under another zone to check, e.g.
 *   TZ=America/Los_Angeles node scripts/test-map-date.mjs
 *
 *   node scripts/test-map-date.mjs
 */
import assert from 'node:assert/strict'
import { formatNightLabel, nightBounds } from '../app/lib/mapDate.ts'
import { weekdayIndex, addDaysKey, daysBetween } from '../app/lib/dateKey.ts'
import { clampNight, nightOf, MAX_NIGHTS_AHEAD } from '../app/lib/athensTime.ts'

let passed = 0, failed = 0
function test(name, fn) {
  try { fn(); passed++; console.log(`  ok   ${name}`) }
  catch (e) { failed++; console.log(`  FAIL ${name}\n       ${e.message}`) }
}

console.log('the label')
test('Greek: weekday, day, month, abbreviated', () => {
  assert.equal(formatNightLabel('2026-11-10', 'el'), 'Τρί 10 Νοε')   // the date of the reported bug
  assert.equal(formatNightLabel('2026-11-13', 'el'), 'Παρ 13 Νοε')
  assert.equal(formatNightLabel('2026-12-31', 'el'), 'Πέμ 31 Δεκ')
  assert.equal(formatNightLabel('2027-01-09', 'el'), 'Σάβ 9 Ιαν')
})
test('English', () => { assert.equal(formatNightLabel('2026-11-10', 'en'), 'Tue 10 Nov'); assert.equal(formatNightLabel('2026-11-13', 'en'), 'Fri 13 Nov') })
test('the day comes before the month (10 Nov, never 11/10)', () => {
  for (const lang of ['el', 'en']) assert.ok(!/\d+\/\d+/.test(formatNightLabel('2026-11-10', lang)))
  assert.match(formatNightLabel('2026-11-10', 'el'), /^\S+ 10 \S+$/)
})
test('any other language falls back to Greek, like the rest of the site', () => assert.equal(formatNightLabel('2026-11-10', 'fr'), 'Τρί 10 Νοε'))
test('a bad date gives an empty label, not "Invalid Date"', () => { for (const v of ['', 'nope', '2026-02-30', '10/11/2026', null, undefined, 20261110]) assert.equal(formatNightLabel(v, 'el'), '', String(v)) })
test('the weekday is the real one, for every day of a year (checked against dateKey)', () => {
  const names = ['Δευ', 'Τρί', 'Τετ', 'Πέμ', 'Παρ', 'Σάβ', 'Κυρ']
  for (let i = 0; i < 366; i++) {
    const d = addDaysKey('2026-11-10', i)
    assert.equal(formatNightLabel(d, 'el').split(' ')[0], names[weekdayIndex(d)], d)
    assert.equal(Number(formatNightLabel(d, 'el').split(' ')[1]), Number(d.slice(8)), d)
  }
})
test('daylight-saving days are not shifted (2026-10-25 and 2027-03-28)', () => {
  assert.equal(formatNightLabel('2026-10-25', 'el'), 'Κυρ 25 Οκτ'); assert.equal(formatNightLabel('2027-03-28', 'el'), 'Κυρ 28 Μαρ')
  assert.equal(formatNightLabel('2026-10-24', 'el'), 'Σάβ 24 Οκτ'); assert.equal(formatNightLabel('2027-03-27', 'el'), 'Σάβ 27 Μαρ')
})
test('the machine\'s zone changes nothing (this run is in ' + (process.env.TZ || 'the default zone') + ')', () => assert.equal(formatNightLabel('2026-11-10', 'el'), 'Τρί 10 Νοε'))

console.log('the limits of the picker')
test('min is tonight, max is tonight + 60', () => {
  assert.deepEqual(nightBounds('2026-11-10'), { min: '2026-11-10', max: '2027-01-09' })
  assert.equal(daysBetween(nightBounds('2026-11-10').min, nightBounds('2026-11-10').max), MAX_NIGHTS_AHEAD)
})
test('across a month, a year and a leap day', () => {
  assert.equal(nightBounds('2026-12-15').max, '2027-02-13'); assert.equal(nightBounds('2027-12-31').max, '2028-02-29'); assert.equal(nightBounds('2026-01-01').max, '2026-03-02')
})
test('the bounds follow the Athens night: before 06:00 min is yesterday', () => {
  const late = new Date('2026-11-10T00:30:00Z') // 02:30 Athens Nov 10 -> the night of Nov 9
  assert.deepEqual(nightBounds(nightOf(late)), { min: '2026-11-09', max: '2027-01-08' })
})
test('a typed date outside the limits is cut to them (what the map does with it)', () => {
  const now = new Date('2026-11-10T19:30:00Z'), { min, max } = nightBounds(nightOf(now))
  assert.equal(clampNight('2026-11-09', now), min); assert.equal(clampNight(addDaysKey(max, 1), now), max)
  assert.equal(clampNight(min, now), min); assert.equal(clampNight(max, now), max)
})

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
