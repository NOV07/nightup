#!/usr/bin/env node
/**
 * Offline tests for map v2: emoji of the pins, Radar flag, "Near me" (haversine,
 * radius filter, ?near=1&r=3 and that no coordinates are ever written), grid
 * clustering, order of the list and "closing soon" (incl. shifts past midnight).
 * No network, no database.
 *
 *   node scripts/test-map-v2.mjs
 */
import assert from 'node:assert/strict'
import { mapEmojiOf } from '../app/lib/mapEmoji.ts'
import { eventToPoint } from '../app/lib/mapEvents.ts'
import {
  haversineKm, filterByRadius, nearestDistanceKm, isFarFromData, parseNear, serializeNear, joinQuery, formatDistance, NO_NEAR, FAR_FROM_DATA_KM,
} from '../app/lib/mapNear.ts'
import { parseFilters, serializeFilters, NO_FILTERS } from '../app/lib/mapFilters.ts'
import { clusterPoints, CLUSTER_RADIUS_PX } from '../app/lib/mapCluster.ts'
import { sortForList } from '../app/lib/mapList.ts'
import { minutesUntilClose, closesSoon, spotStatusAt, CLOSING_SOON_MINUTES } from '../app/lib/openingHours.ts'

let passed = 0, failed = 0
function test(name, fn) {
  try { fn(); passed++; console.log(`  ok   ${name}`) }
  catch (e) { failed++; console.log(`  FAIL ${name}\n       ${e.message}`) }
}
const qs = (s) => new URLSearchParams(s)

console.log('emoji')
test('spot categories (first one wins)', () => {
  const e = (c) => mapEmojiOf({ kind: 'spot', categories: c, subcategories: [] })
  assert.deepEqual(['drink', 'food', 'nightlife', 'show', 'chill', 'activity', 'art'].map(k => e([k])), ['🍸', '🍴', '🪩', '🎭', '☕', '🎯', '🎨'])
  assert.equal(e(['food', 'drink']), '🍴')
})
test('event types', () => {
  const e = (type) => mapEmojiOf({ kind: 'event', categories: [], subcategories: [], event: { type } })
  assert.deepEqual(['music', 'culture', 'sports', 'other'].map(e), ['🎵', '🎭', '⚽', '✨'])
})
test('wellness subcategories', () => {
  const e = (s) => mapEmojiOf({ kind: 'wellness', categories: ['wellness'], subcategories: s })
  assert.deepEqual(['sunset_spot', 'yoga', 'sea_swim', 'nature_walk'].map(k => e([k])), ['🌅', '🧘', '🌊', '🌿'])
})
test('fallbacks', () => {
  assert.equal(mapEmojiOf({ kind: 'wellness', categories: ['wellness'], subcategories: [] }), '🌿')
  assert.equal(mapEmojiOf({ kind: 'spot', categories: [], subcategories: [] }), '📍')
  assert.equal(mapEmojiOf({ kind: 'spot', categories: ['wellness'], subcategories: [] }), '📍')
  assert.equal(mapEmojiOf({ kind: 'event', categories: [], subcategories: [], event: { type: 'zzz' } }), '✨')
  assert.equal(mapEmojiOf({ kind: 'spot', categories: ['constructor'], subcategories: [] }), '📍')
})

console.log('radar flag')
const WIN = { from: '2026-11-09', to: '2027-01-10' }
const row = (x = {}) => ({ id: 'a', title: 'T', date: '2026-11-14', lat: 37.9, lng: 23.7, ...x })
test('is_radar_pick reaches the point, only when exactly true', () => {
  assert.equal(eventToPoint(row({ is_radar_pick: true }), WIN, null).event.radar, true)
  for (const v of [false, null, undefined, 'true', 1]) assert.equal(eventToPoint(row({ is_radar_pick: v }), WIN, null).event.radar, false)
})

console.log('near me')
const MONASTIRAKI = { lat: 37.9764, lng: 23.7253 }
const ACROPOLIS = { lat: 37.9715, lng: 23.7257 }
test('haversine', () => {
  assert.equal(haversineKm(MONASTIRAKI, MONASTIRAKI), 0)
  const d = haversineKm(MONASTIRAKI, ACROPOLIS)
  assert.ok(d > 0.5 && d < 0.6, String(d))
  assert.ok(Math.abs(haversineKm({ lat: 0, lng: 0 }, { lat: 0, lng: 1 }) - 111.19) < 0.1)
  assert.ok(Math.abs(haversineKm(MONASTIRAKI, { lat: 40.6401, lng: 22.9444 }) - 303) < 5) // Athens - Thessaloniki
  assert.equal(haversineKm(MONASTIRAKI, ACROPOLIS), haversineKm(ACROPOLIS, MONASTIRAKI))
})
const pts = [
  { id: 'near', ...ACROPOLIS },                       // ~0.55 km
  { id: 'two', lat: 37.9936, lng: 23.7253 },          // ~1.9 km
  { id: 'four', lat: 38.0124, lng: 23.7253 },         // ~4.0 km
  { id: 'far', lat: 38.2, lng: 23.7253 },             // ~25 km
]
test('radius filter 1 / 3 / 5 / all', () => {
  const ids = (r) => filterByRadius(pts, MONASTIRAKI, r).map(p => p.id)
  assert.deepEqual(ids(1), ['near'])
  assert.deepEqual(ids(3), ['near', 'two'])
  assert.deepEqual(ids(5), ['near', 'two', 'four'])
  assert.deepEqual(ids('all'), ['near', 'two', 'four', 'far'])
})
test('far from the data (> 100 km from the closest point)', () => {
  assert.equal(FAR_FROM_DATA_KM, 100)
  assert.equal(isFarFromData(pts, MONASTIRAKI), false)
  assert.equal(isFarFromData(pts, { lat: 51.5, lng: -0.12 }), true)           // London
  assert.equal(isFarFromData(pts, { lat: 40.64, lng: 22.94 }), true)          // Thessaloniki
  assert.equal(isFarFromData([], MONASTIRAKI), false)                          // no points: nothing to compare
  assert.equal(nearestDistanceKm([], MONASTIRAKI), null)
})
test('URL: near=1&r=3, defaults and bad values', () => {
  assert.deepEqual(parseNear(qs('near=1&r=5')), { on: true, radius: 5 })
  assert.deepEqual(parseNear(qs('near=1&r=all')), { on: true, radius: 'all' })
  assert.deepEqual(parseNear(qs('near=1')), { on: true, radius: 3 })
  assert.deepEqual(parseNear(qs('near=1&r=7')), { on: true, radius: 3 })
  assert.deepEqual(parseNear(qs('near=0&r=5')), { on: false, radius: 5 })
  assert.deepEqual(parseNear(qs('')), NO_NEAR)
  assert.equal(serializeNear({ on: true, radius: 3 }), 'near=1&r=3')
  assert.equal(serializeNear({ on: true, radius: 'all' }), 'near=1&r=all')
  assert.equal(serializeNear({ on: false, radius: 5 }), '')
})
test('URL never carries coordinates, whatever the state holds', () => {
  const state = { on: true, radius: 3, lat: 37.9764, lng: 23.7253, coords: MONASTIRAKI }
  const out = joinQuery(serializeFilters({ ...NO_FILTERS, shown: ['spots'] }), serializeNear(state))
  assert.equal(out, 'hide=events,wellness&near=1&r=3')
  assert.ok(!/37\.|23\.|lat|lng|coord/.test(out))
  // and a link that carries a position is not read as one
  const parsed = parseNear(qs('near=1&r=3&lat=37.97&lng=23.72'))
  assert.deepEqual(Object.keys(parsed).sort(), ['on', 'radius'])
})
test('near params do not disturb the filters', () => {
  assert.equal(serializeFilters(parseFilters(qs('near=1&r=3'))), serializeFilters(NO_FILTERS))
  assert.equal(serializeFilters(parseFilters(qs('hide=events,wellness&c=drink&near=1&r=1'))), serializeFilters(parseFilters(qs('hide=events,wellness&c=drink'))))
})
test('distance text', () => {
  const u = { km: 'χλμ', m: 'μ' }
  assert.equal(formatDistance(0.55, u, 'el-GR'), '550 μ')
  assert.equal(formatDistance(0.004, u, 'el-GR'), '10 μ')
  assert.equal(formatDistance(1.234, u, 'en-GB'), '1.2 χλμ')
  assert.equal(formatDistance(12.4, { km: 'km', m: 'm' }, 'en-GB'), '12 km')
})

console.log('clustering')
const it = (id, x, y, solo) => ({ id, x, y, lat: y / 1000, lng: x / 1000, solo })
test('points within the radius become a cluster; a lone point stays', () => {
  const { singles, clusters } = clusterPoints([it('a', 10, 10), it('b', 20, 20), it('c', 300, 300)], CLUSTER_RADIUS_PX)
  assert.deepEqual(singles, ['c'])
  assert.equal(clusters.length, 1)
  assert.deepEqual(clusters[0].ids, ['a', 'b'])
  assert.equal(clusters[0].key, 'a|b')
  assert.ok(Math.abs(clusters[0].lat - 0.015) < 1e-9 && Math.abs(clusters[0].lng - 0.015) < 1e-9)
})
test('radar picks stay their own pin, unless a cluster would cover them: then it carries the halo', () => {
  const far = clusterPoints([it('a', 10, 10), it('b', 12, 12), { ...it('radar', 200, 200, true), radar: true }])
  assert.ok(far.singles.includes('radar'))
  assert.deepEqual(far.clusters.map(c => [c.ids, c.radar]), [[['a', 'b'], false]])
  const under = clusterPoints([it('a', 10, 10), it('b', 12, 12), { ...it('radar', 11, 11, true), radar: true }])
  assert.deepEqual(under.singles, [])
  assert.deepEqual(under.clusters.map(c => [c.ids, c.radar]), [[['a', 'b', 'radar'], true]])
  // the picked point (solo, not radar) is never swallowed
  const picked = clusterPoints([it('a', 10, 10), it('b', 12, 12), it('sel', 11, 11, true)])
  assert.deepEqual(picked.singles, ['sel'])
})
test('every point is in exactly one place', () => {
  const items = Array.from({ length: 200 }, (_, i) => it(`p${i}`, (i * 37) % 500, (i * 91) % 500, i % 17 === 0))
  const { singles, clusters } = clusterPoints(items)
  const all = [...singles, ...clusters.flatMap(c => c.ids)].sort()
  assert.deepEqual(all, items.map(i => i.id).sort())
})
test('pins that touch across a would-be cell edge still merge; leaders stay apart', () => {
  const { clusters } = clusterPoints([it('a', 47, 10), it('b', 49, 10)]) // 2px apart, either side of x = 48
  assert.equal(clusters.length, 1)
  const items = Array.from({ length: 120 }, (_, i) => it(`q${i}`, (i * 53) % 400, (i * 29) % 400))
  const r = clusterPoints(items)
  const pos = (id) => items.find(i => i.id === id)
  const shown = [...r.singles.map(pos), ...r.clusters.map(c => ({ x: pos(c.ids[0]).x, y: pos(c.ids[0]).y }))]
  for (let i = 0; i < shown.length; i++) for (let j = i + 1; j < shown.length; j++) assert.ok(Math.hypot(shown[i].x - shown[j].x, shown[i].y - shown[j].y) > CLUSTER_RADIUS_PX)
})
test('empty / far apart', () => {
  assert.deepEqual(clusterPoints([]), { singles: [], clusters: [] })
  assert.equal(clusterPoints([it('a', 0, 0), it('b', 500, 500)]).clusters.length, 0)
})

console.log('list order')
const ev = (id, time, name = id) => ({ id, kind: 'event', name, lat: 37.97, lng: 23.72, categories: [], subcategories: [], event: { date: '2026-11-10', time, venue: null, type: 'music', genres: [], radar: false } })
const sp = (id, name, lat, lng) => ({ id, kind: 'spot', name, lat, lng, categories: ['drink'], subcategories: [] })
const wl = (id, name) => ({ id, kind: 'wellness', name, lat: 37.9, lng: 23.7, categories: ['wellness'], subcategories: [] })
test('no position: events by night time, then venues and wellness by name', () => {
  const order = sortForList([wl('w', 'Ζ'), sp('s2', 'Βαρ', 37.9, 23.7), ev('late', '01:00:00'), ev('early', '21:00:00'), sp('s1', 'Άλφα', 37.9, 23.7), ev('none', null)], null).map(e => e.point.id)
  assert.deepEqual(order, ['early', 'late', 'none', 's1', 's2', 'w'])
})
test('with a position: nearest first, with the distance', () => {
  const r = sortForList([sp('far', 'Μακριά', 38.2, 23.7253), sp('near', 'Κοντά', ACROPOLIS.lat, ACROPOLIS.lng), ev('e', '22:00:00')], MONASTIRAKI)
  assert.equal(r[0].point.id, 'near')
  assert.ok(r.every(x => typeof x.distanceKm === 'number'))
  assert.deepEqual(r.map(x => x.distanceKm), [...r.map(x => x.distanceKm)].sort((a, b) => a - b))
  assert.equal(sortForList([ev('a', '20:00:00')], null)[0].distanceKm, null)
})

console.log('closing soon')
const H = { Δευτέρα: '18:00-1:30', Τρίτη: '18:00-1:30', Τετάρτη: 'Κλειστά', Πέμπτη: '12:00-23:00', Παρασκευή: '24 ώρες', Σάββατο: '24 ώρες', Κυριακή: '12:00-23:00' }
const TUE = '2026-11-10', WED = '2026-11-11'
const m = (h, mm) => h * 60 + mm
test('minutes left, same evening', () => {
  assert.equal(minutesUntilClose(H, TUE, m(21, 30)), 240)  // closes 01:30
  assert.equal(minutesUntilClose({ ...H, Τρίτη: '18:00-23:00' }, TUE, m(21, 30)), 90)
})
test('shift past midnight: after 00:00 the minutes come from the evening date or the next day', () => {
  assert.equal(minutesUntilClose(H, TUE, m(24, 10)), 80)   // 00:10 as 1450 of Tuesday
  assert.equal(minutesUntilClose(H, WED, m(0, 30)), 60)    // 00:30 of Wednesday, Tuesday's shift
  assert.equal(minutesUntilClose(H, WED, m(1, 30)), null)  // closed at the exact end
})
test('null when closed, unknown or no hours', () => {
  assert.equal(minutesUntilClose(H, WED, m(20, 0)), null)  // Wednesday is closed
  assert.equal(minutesUntilClose(H, TUE, m(12, 0)), null)  // not open yet
  assert.equal(minutesUntilClose(null, TUE, m(20, 0)), null)
  assert.equal(minutesUntilClose({ ...H, Τρίτη: 'κατόπιν ραντεβού' }, TUE, m(20, 0)), null)
})
test('a shift ending at midnight into a day that opens at 00:00 is one stay; 24 h all week never closes', () => {
  assert.equal(minutesUntilClose(H, '2026-11-13', m(23, 0)), 1500) // Fri 24h, Sat 24h, closes Sun 00:00 (Sun opens at 12:00)
  const always = Object.fromEntries(Object.keys(H).map(d => [d, '24 ώρες']))
  assert.equal(minutesUntilClose(always, TUE, m(22, 0)), null)
})
test('closesSoon: ≤ 90 minutes, open only, never when closed', () => {
  assert.equal(CLOSING_SOON_MINUTES, 90)
  const h = { ...H, Τρίτη: '18:00-23:00' }
  assert.equal(closesSoon(h, TUE, m(21, 30)), true)    // exactly 90
  assert.equal(closesSoon(h, TUE, m(21, 29)), false)   // 91
  assert.equal(closesSoon(h, TUE, m(22, 59)), true)
  assert.equal(closesSoon(h, TUE, m(23, 0)), false)    // closed now
  assert.equal(closesSoon(H, WED, m(0, 30)), true)     // Tuesday's shift, 60 min left
  assert.equal(closesSoon(H, TUE, m(21, 30)), false)   // 240 left
  assert.equal(closesSoon(null, TUE, m(21, 30)), false)
  assert.equal(spotStatusAt(h, TUE, m(21, 30)), 'open')
})

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
