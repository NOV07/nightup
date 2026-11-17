#!/usr/bin/env node
/** Offline test for app/lib/spotOpenNow.ts.   node scripts/test-spot-open-now.mjs */
import assert from 'node:assert/strict'
import { openNowInfo, athensClock, athensDayName } from '../app/lib/spotOpenNow.ts'

let failed = 0
function test(name, fn) {
  try { fn(); console.log(`  ok   ${name}`) } catch (e) { failed++; console.log(`  FAIL ${name}\n       ${e.message}`) }
}
// Athens is UTC+2 in January and UTC+3 in July. 2026-01-05 is a Monday.
const at = (iso) => new Date(iso)
const week = (v) => Object.fromEntries(['Δευτέρα','Τρίτη','Τετάρτη','Πέμπτη','Παρασκευή','Σάββατο','Κυριακή'].map(d => [d, v]))

test('athensClock: winter and summer offsets', () => {
  assert.deepEqual(athensClock(at('2026-01-05T10:30:00Z')), { date: '2026-01-05', minutes: 12 * 60 + 30, dayIndex: 0 })
  assert.deepEqual(athensClock(at('2026-07-06T10:30:00Z')), { date: '2026-07-06', minutes: 13 * 60 + 30, dayIndex: 0 })
})
test('athensClock: UTC evening is already the next Athens day', () => {
  const c = athensClock(at('2026-01-05T22:30:00Z'))
  assert.equal(c.date, '2026-01-06'); assert.equal(c.minutes, 30); assert.equal(athensDayName(at('2026-01-05T22:30:00Z')), 'Τρίτη')
})
test('open inside the zone, until its end', () => {
  assert.deepEqual(openNowInfo(week('10:00-18:00'), at('2026-01-05T10:00:00Z')), { until: '18:00' })
})
test('closed before opening / after closing', () => {
  assert.equal(openNowInfo(week('18:00-23:00'), at('2026-01-05T10:00:00Z')), null)  // 12:00 Athens
  assert.equal(openNowInfo(week('10:00-18:00'), at('2026-01-05T17:00:00Z')), null)  // 19:00 Athens
})
test('after midnight: 18:00-1:30 is open at 00:30 of the next day, until 01:30', () => {
  const h = { 'Δευτέρα': '18:00-1:30', 'Τρίτη': 'Κλειστά' }
  assert.deepEqual(openNowInfo(h, at('2026-01-05T20:00:00Z')), { until: '01:30' }) // Mon 22:00
  assert.deepEqual(openNowInfo(h, at('2026-01-05T22:30:00Z')), { until: '01:30' }) // Tue 00:30
  assert.equal(openNowInfo(h, at('2026-01-05T23:45:00Z')), null)                   // Tue 01:45
})
test('shift ending at midnight shows until 00:00', () => {
  assert.deepEqual(openNowInfo(week('18:00-00:00'), at('2026-01-05T20:00:00Z')), { until: '00:00' })
})
test('two zones: picks the one running now', () => {
  assert.deepEqual(openNowInfo(week('12:00-16:00, 19:00-1:30'), at('2026-01-05T19:00:00Z')), { until: '01:30' })
  assert.equal(openNowInfo(week('12:00-16:00, 19:00-1:30'), at('2026-01-05T15:00:00Z')), null) // 17:00
})
test('24 ώρες: open, no until', () => {
  assert.deepEqual(openNowInfo(week('24 ώρες'), at('2026-01-05T10:00:00Z')), { until: null })
})
test('Κλειστά, unreadable, missing, empty: nothing', () => {
  assert.equal(openNowInfo(week('Κλειστά'), at('2026-01-05T10:00:00Z')), null)
  assert.equal(openNowInfo(week('από το απόγευμα'), at('2026-01-05T10:00:00Z')), null)
  assert.equal(openNowInfo({}, at('2026-01-05T10:00:00Z')), null)
  assert.equal(openNowInfo(null, at('2026-01-05T10:00:00Z')), null)
})
console.log(failed ? `\n${failed} failed` : '\nall passed')
process.exit(failed ? 1 : 0)
