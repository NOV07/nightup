#!/usr/bin/env node
/**
 * Offline tests for the opening-hours reader (app/lib/openingHours.ts) and the
 * date helpers it uses (app/lib/dateKey.ts). No network, no database.
 *
 *   node scripts/test-opening-hours.mjs
 */
import assert from 'node:assert/strict'
import { parseDayHours, spotStatusAt, DAY_NAMES, UNREADABLE_TAIL_MINUTES } from '../app/lib/openingHours.ts'
import { addDaysKey, daysBetween, isDateKey, weekdayIndex } from '../app/lib/dateKey.ts'

let passed = 0, failed = 0
function test(name, fn) {
  try { fn(); passed++; console.log(`  ok   ${name}`) }
  catch (e) { failed++; console.log(`  FAIL ${name}\n       ${e.message}`) }
}
const hm = (h, m = 0) => h * 60 + m
const open = (...r) => ({ kind: 'open', ranges: r.map(([open, close]) => ({ open, close })) })
const CLOSED = { kind: 'closed' }

console.log('parseDayHours: formats')
test('HH:MM-HH:MM', () => assert.deepEqual(parseDayHours('12:00-16:00'), open([hm(12), hm(16)])))
test('H:MM-H:MM', () => assert.deepEqual(parseDayHours('9:30-17:45'), open([hm(9, 30), hm(17, 45)])))
test('dots instead of colons', () => assert.deepEqual(parseDayHours('9.00-17.30'), open([hm(9), hm(17, 30)])))
test('hyphen, en dash, em dash, spaces around', () => {
  for (const t of ['18:00-23:00', '18:00 - 23:00', '18:00–23:00', '18:00 — 23:00', '18:00—23:00']) assert.deepEqual(parseDayHours(t), open([hm(18), hm(23)]), t)
})
test('two zones split by a comma', () => assert.deepEqual(parseDayHours('12:00-16:00, 19:00-1:30'), open([hm(12), hm(16)], [hm(19), hm(25, 30)])))
test('three zones, no space after the comma', () => assert.deepEqual(parseDayHours('8:00-10:00,12:00-14:00,18:00-20:00'), open([480, 600], [720, 840], [1080, 1200])))
test('24 ώρες, any case, with or without accent', () => {
  for (const t of ['24 ώρες', '24 ΩΡΕΣ', '24 ωρες', '24ώρες', '24ωρο']) assert.deepEqual(parseDayHours(t), open([0, 1440]), t)
})
test('Κλειστά and its forms', () => {
  for (const t of ['Κλειστά', 'κλειστά', 'ΚΛΕΙΣΤΑ', 'Κλειστό', 'κλειστη', ' Κλειστά ', 'Κλειστά τη Δευτέρα']) assert.deepEqual(parseDayHours(t), CLOSED, t)
})

console.log('parseDayHours: overnight')
test('close after midnight: +24 h', () => assert.deepEqual(parseDayHours('18:00-1:30'), open([hm(18), hm(25, 30)])))
test('00:00 as a close is 24:00', () => assert.deepEqual(parseDayHours('18:00-00:00'), open([hm(18), 1440])))
test('24:00 as a close', () => assert.deepEqual(parseDayHours('18:00-24:00'), open([hm(18), 1440])))
test('close equal to open means a full day later', () => assert.deepEqual(parseDayHours('12:00-12:00'), open([hm(12), hm(36)])))
test('opening after midnight in the same day', () => assert.deepEqual(parseDayHours('00:00-6:00'), open([0, 360])))

console.log('parseDayHours: not understood = null (never guessed)')
test('empty, blank, not text', () => { for (const v of ['', '   ', null, undefined, 12, {}, []]) assert.equal(parseDayHours(v), null, String(v)) })
test('free text', () => { for (const t of ['ανάλογα με τη μέρα', 'Ρωτήστε μας', 'open', '-', 'από τις 6']) assert.equal(parseDayHours(t), null, t) })
test('invalid hours or minutes', () => { for (const t of ['25:00-26:00', '12:60-14:00', '12:00-24:30', '24:00-2:00', '12:5-14:00', '-1:00-5:00']) assert.equal(parseDayHours(t), null, t) })
test('one bad zone spoils the whole day', () => { assert.equal(parseDayHours('12:00-16:00, ωωω'), null); assert.equal(parseDayHours('12:00-16:00,'), null) })
test('12-hour clocks are not read', () => { for (const t of ['6 μ.μ.-2 π.μ.', '6:00pm-2:00am', '6:00 PM - 11:00 PM']) assert.equal(parseDayHours(t), null, t) })
test('a time next to "κλειστά" is not a plain closed day', () => assert.equal(parseDayHours('Κλειστά 15:00-18:00'), null))
test('missing a close', () => { assert.equal(parseDayHours('18:00'), null); assert.equal(parseDayHours('18:00-'), null) })

console.log('spotStatusAt: Ουλαλούμ (real hours)')
// Δευ, Τρί Κλειστά · Τετ-Παρ 18:00-1:30 · Σάβ, Κυρ 12:00-1:30
const OUL = { Δευτέρα: 'Κλειστά', Τρίτη: 'Κλειστά', Τετάρτη: '18:00-1:30', Πέμπτη: '18:00-1:30', Παρασκευή: '18:00-1:30', Σάββατο: '12:00-1:30', Κυριακή: '12:00-1:30' }
const MON = '2026-11-09', TUE = '2026-11-10', WED = '2026-11-11', THU = '2026-11-12', FRI = '2026-11-13', SAT = '2026-11-14', SUN = '2026-11-15'
test('the dates are the weekdays the tests say', () => assert.deepEqual([MON, TUE, WED, THU, SUN].map(weekdayIndex), [0, 1, 2, 3, 6]))
test('Τρίτη 21:30 closed', () => assert.equal(spotStatusAt(OUL, TUE, hm(21, 30)), 'closed'))
test('Τετάρτη 21:30 open', () => assert.equal(spotStatusAt(OUL, WED, hm(21, 30)), 'open'))
test('Τετάρτη 01:00 closed (tail of a closed Τρίτη)', () => assert.equal(spotStatusAt(OUL, WED, hm(1)), 'closed'))
test('Πέμπτη 01:00 open (tail of Τετάρτη)', () => assert.equal(spotStatusAt(OUL, THU, hm(1)), 'open'))
test('Δευτέρα 01:00 open (tail of Κυριακή)', () => assert.equal(spotStatusAt(OUL, MON, hm(1)), 'open'))
test('Δευτέρα 02:00 closed', () => assert.equal(spotStatusAt(OUL, MON, hm(2)), 'closed'))
test('edges: opens at 18:00, closes at 1:30', () => {
  assert.equal(spotStatusAt(OUL, WED, hm(17, 59)), 'closed')
  assert.equal(spotStatusAt(OUL, WED, hm(18)), 'open')
  assert.equal(spotStatusAt(OUL, THU, hm(1, 29)), 'open')
  assert.equal(spotStatusAt(OUL, THU, hm(1, 30)), 'closed')
})
test('Σάββατο 12:00 open, 11:59 closed, Κυριακή 01:00 open (tail of Σάββατο)', () => {
  assert.equal(spotStatusAt(OUL, SAT, hm(12)), 'open'); assert.equal(spotStatusAt(OUL, SAT, hm(11, 59)), 'closed')
  assert.equal(spotStatusAt(OUL, SUN, hm(1)), 'open')
})
test('the tail of a shift beats a "Κλειστά" next morning', () => assert.equal(spotStatusAt({ ...OUL, Δευτέρα: 'Κλειστά' }, MON, hm(0, 30)), 'open'))
test('minutes past 1440 count in the next calendar day', () => {
  assert.equal(spotStatusAt(OUL, WED, 1440 + hm(1)), 'open')        // = Πέμπτη 01:00
  assert.equal(spotStatusAt(OUL, TUE, 1440 + hm(1)), 'closed')      // = Τετάρτη 01:00
  assert.equal(spotStatusAt(OUL, SUN, 1440 + hm(2)), 'closed')      // = Δευτέρα 02:00
})

console.log('spotStatusAt: other shapes')
const all = (v) => Object.fromEntries(DAY_NAMES.map(d => [d, v]))
test('double zones', () => {
  const h = all('12:00-16:00, 19:00-1:30')
  assert.equal(spotStatusAt(h, WED, hm(14)), 'open'); assert.equal(spotStatusAt(h, WED, hm(17)), 'closed')
  assert.equal(spotStatusAt(h, WED, hm(22)), 'open'); assert.equal(spotStatusAt(h, THU, hm(1)), 'open'); assert.equal(spotStatusAt(h, THU, hm(2)), 'closed')
})
test('24 ώρες is open all day, every day', () => { const h = all('24 ώρες'); for (const m of [0, 1, 359, 720, 1439]) assert.equal(spotStatusAt(h, WED, m), 'open', String(m)) })
test('dots', () => assert.equal(spotStatusAt(all('9.00-17.00'), WED, hm(10)), 'open'))
test('a club that opens at night: 23:00-5:00', () => {
  const h = all('23:00-5:00')
  assert.equal(spotStatusAt(h, FRI, hm(21, 30)), 'closed'); assert.equal(spotStatusAt(h, FRI, hm(23, 30)), 'open'); assert.equal(spotStatusAt(h, SAT, hm(4)), 'open'); assert.equal(spotStatusAt(h, SAT, hm(5)), 'closed')
})
test('no hours at all: unknown', () => { for (const h of [null, undefined, {}, [], 'x', 5]) assert.equal(spotStatusAt(h, WED, hm(20)), 'unknown', JSON.stringify(h)) })
test('free text: unknown', () => assert.equal(spotStatusAt(all('ανάλογα με τη μέρα'), WED, hm(20)), 'unknown'))
test('empty day: unknown', () => assert.equal(spotStatusAt({ ...OUL, Τετάρτη: '' }, WED, hm(21, 30)), 'unknown'))
test('missing day key: unknown, not closed', () => {
  const { Τετάρτη, ...rest } = OUL
  assert.equal(spotStatusAt(rest, WED, hm(21, 30)), 'unknown')
})
test('invalid hours in the day: unknown', () => assert.equal(spotStatusAt({ ...OUL, Τετάρτη: '25:00-26:00' }, WED, hm(21, 30)), 'unknown'))
test('an unreadable day does not hide a certain open from yesterday\'s shift', () => assert.equal(spotStatusAt({ ...OUL, Πέμπτη: 'ρωτήστε' }, THU, hm(1)), 'open'))
test('unreadable yesterday: early morning is unknown, later it is closed', () => {
  const h = { ...OUL, Τετάρτη: 'ρωτήστε' }   // Πέμπτη itself is 18:00-1:30
  assert.equal(spotStatusAt(h, THU, hm(3)), 'unknown')
  assert.equal(spotStatusAt(h, THU, UNREADABLE_TAIL_MINUTES - 1), 'unknown')
  assert.equal(spotStatusAt(h, THU, UNREADABLE_TAIL_MINUTES), 'closed')
  assert.equal(spotStatusAt(h, THU, hm(12)), 'closed')
  assert.equal(spotStatusAt(h, THU, hm(20)), 'open')
})
test('only the days that were filled in: the rest are unknown', () => {
  const h = { Δευτέρα: '18:00-23:00', Τρίτη: '18:00-23:00' }
  assert.equal(spotStatusAt(h, MON, hm(20)), 'open'); assert.equal(spotStatusAt(h, MON, hm(12)), 'closed'); assert.equal(spotStatusAt(h, WED, hm(20)), 'unknown')
})
test('bad date or minutes: unknown', () => {
  for (const [d, m] of [['nope', 600], ['2026-02-30', 600], [WED, NaN], [WED, -5], ['', 0]]) assert.equal(spotStatusAt(OUL, d, m), 'unknown', `${d} ${m}`)
})
test('values that are not text are unknown, not a crash', () => assert.equal(spotStatusAt({ ...OUL, Τετάρτη: 1800 }, WED, hm(21, 30)), 'unknown'))

console.log('dateKey')
test('isDateKey', () => {
  assert.ok(isDateKey('2026-11-10')); assert.ok(isDateKey('2028-02-29'))
  for (const v of ['2026-02-30', '2026-13-01', '2026-1-1', '', null, 20261110, '2026-11-10T00:00']) assert.ok(!isDateKey(v), String(v))
})
test('addDaysKey across month, year, leap day, DST change', () => {
  assert.equal(addDaysKey('2026-11-30', 1), '2026-12-01'); assert.equal(addDaysKey('2026-12-31', 1), '2027-01-01')
  assert.equal(addDaysKey('2028-02-28', 1), '2028-02-29'); assert.equal(addDaysKey('2026-03-01', -1), '2026-02-28')
  assert.equal(addDaysKey('2026-10-25', 1), '2026-10-26'); assert.equal(addDaysKey('2026-03-29', 1), '2026-03-30')
})
test('daysBetween', () => { assert.equal(daysBetween('2026-11-10', '2026-11-10'), 0); assert.equal(daysBetween('2026-11-10', '2027-01-09'), 60); assert.equal(daysBetween('2026-11-10', '2026-11-09'), -1) })

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
