#!/usr/bin/env node
/**
 * Offline tests for the groups of the public map (Events / Spots / Wellness):
 * the night and what it does to events and to open/closed status, the filters
 * of each group, hidden layers, counts and the URL (including old links).
 * Logic in app/lib/mapFilters.ts. No network, no database.
 *
 *   node scripts/test-map-groups.mjs
 */
import assert from 'node:assert/strict'
import {
  NO_FILTERS, mapContext, resolvePoints, normalizeFilters, parseFilters, parseOpenGroup, serializeFilters,
  toggleGroupHidden, showGroup, toggleEventType, toggleEventGenre, setSpotStatus, toggleMapCategory, toggleMapSub,
  toggleWellnessSub, setNight, clearGroupFilters, clearAllFilters, hasFilters, hasGroupFilters, eventMatches, GROUPS,
} from '../app/lib/mapFilters.ts'

let passed = 0, failed = 0
function test(name, fn) {
  try { fn(); passed++; console.log(`  ok   ${name}`) }
  catch (e) { failed++; console.log(`  FAIL ${name}\n       ${e.message}`) }
}
const at = (iso) => new Date(iso)
const NOW = at('2026-11-10T19:30:00Z') // Tuesday 10 Nov 2026, 21:30 in Athens

const OUL = { Δευτέρα: 'Κλειστά', Τρίτη: 'Κλειστά', Τετάρτη: '18:00-1:30', Πέμπτη: '18:00-1:30', Παρασκευή: '18:00-1:30', Σάββατο: '12:00-1:30', Κυριακή: '12:00-1:30' }
const all = (v) => Object.fromEntries(['Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο', 'Κυριακή'].map(d => [d, v]))

const ev = (id, date, time, type, genres = []) => ({ id: `e-${id}`, kind: 'event', categories: [], subcategories: [], event: { date, time, venue: 'V', type, genres } })
const spot = (id, categories, subcategories, hours) => ({ id: `s-${id}`, kind: 'spot', categories, subcategories, hours })
const well = (id, subs) => ({ id: `w-${id}`, kind: 'wellness', categories: ['wellness'], subcategories: subs })

const P = [
  ev('tonight-techno', '2026-11-10', '23:00:00', 'music', ['techno', 'house']),
  ev('tonight-jazz', '2026-11-10', '21:00:00', 'music', ['jazz']),
  ev('tonight-comedy', '2026-11-10', '22:00:00', 'culture', []),
  ev('after-midnight', '2026-11-11', '01:00:00', 'music', ['techno']),       // still the night of the 10th
  ev('tomorrow-rock', '2026-11-11', '22:00:00', 'music', ['rock']),
  ev('early-today', '2026-11-10', '03:00:00', 'music', ['house']),           // the night of the 9th
  ev('friday-sports', '2026-11-13', '19:00:00', 'sports', []),
  ev('friday-other', '2026-11-13', '22:30:00', 'other', ['techno']),
  spot('oulaloum', ['drink'], ['cocktail_bar'], OUL),                          // closed on Tuesday, open Wed-Sun
  spot('club', ['nightlife'], ['club'], all('23:00-5:00')),
  spot('cafe', ['chill'], ['all_day_cafe'], all('8:00-20:00')),
  spot('nohours', ['food'], ['italian'], null),
  spot('text', ['drink'], ['wine_bar'], all('ανάλογα με τη μέρα')),
  spot('spa', ['wellness'], [], all('10:00-22:00')),                           // wellness only
  well('strefi', ['sunset_spot']),
  well('yoga', ['yoga']),
  well('plain', []),
]
const ctxAt = (picked = null, now = NOW) => mapContext(picked, now)
const run = (f = NO_FILTERS, ctx = ctxAt(f.night)) => resolvePoints(P, f, ctx)
const ids = (r) => r.visible.map(p => p.id)
const onlyKind = (r, kind) => r.visible.filter(p => p.kind === kind).map(p => p.id)
const F = (over) => normalizeFilters({ ...NO_FILTERS, ...over })

console.log('the night in force')
test('tonight by default', () => { const c = ctxAt(); assert.equal(c.night, '2026-11-10'); assert.equal(c.tonight, '2026-11-10') })
test('a picked night is kept; past is cut to tonight; far is cut to +60', () => {
  assert.equal(ctxAt('2026-11-13').night, '2026-11-13'); assert.equal(ctxAt('2026-11-09').night, '2026-11-10'); assert.equal(ctxAt('2027-03-01').night, '2027-01-09')
})
test('before 06:00 tonight is yesterday\'s night', () => {
  const c = mapContext(null, at('2026-11-10T00:30:00Z')) // 02:30 Athens
  assert.equal(c.night, '2026-11-09'); assert.deepEqual(c.moment, { date: '2026-11-10', minutes: 150 })
})
test('status moment: now for tonight, 21:30 for another night', () => {
  assert.deepEqual(ctxAt().moment, { date: '2026-11-10', minutes: 1290 }); assert.deepEqual(ctxAt('2026-11-13').moment, { date: '2026-11-13', minutes: 1290 })
})

console.log('Events: the night')
test('default: events of tonight\'s night only (incl. 01:00 after midnight)', () =>
  assert.deepEqual(onlyKind(run(), 'event').sort(), ['e-after-midnight', 'e-tonight-comedy', 'e-tonight-jazz', 'e-tonight-techno']))
test('the 03:00 event of today belongs to last night, not tonight', () => assert.equal(ids(run()).includes('e-early-today'), false))
test('another night: Friday', () => assert.deepEqual(onlyKind(run(F({ night: '2026-11-13' })), 'event').sort(), ['e-friday-other', 'e-friday-sports']))
test('the night of the 9th (picked before 06:00) shows the 03:00 event', () => {
  const late = at('2026-11-10T00:30:00Z')
  assert.deepEqual(onlyKind(resolvePoints(P, NO_FILTERS, mapContext(null, late)), 'event'), ['e-early-today'])
})

console.log('Events: type x genre')
const evIds = (f) => onlyKind(run(f), 'event').sort()
test('type: one', () => assert.deepEqual(evIds(F({ evTypes: ['culture'] })), ['e-tonight-comedy']))
test('type: OR inside the row', () => assert.deepEqual(evIds(F({ evTypes: ['culture', 'music'] })), ['e-after-midnight', 'e-tonight-comedy', 'e-tonight-jazz', 'e-tonight-techno']))
test('genre: one', () => assert.deepEqual(evIds(F({ evGenres: ['techno'] })), ['e-after-midnight', 'e-tonight-techno']))
test('genre: OR inside the row', () => assert.deepEqual(evIds(F({ evGenres: ['techno', 'jazz'] })), ['e-after-midnight', 'e-tonight-jazz', 'e-tonight-techno']))
test('type AND genre', () => {
  assert.deepEqual(evIds(F({ evTypes: ['music'], evGenres: ['jazz'] })), ['e-tonight-jazz'])
  assert.deepEqual(evIds(F({ evTypes: ['culture'], evGenres: ['jazz'] })), [])
})
test('an event with no genre is out once a genre is chosen', () => assert.equal(evIds(F({ evGenres: ['techno', 'jazz', 'house'] })).includes('e-tonight-comedy'), false))
test('the type filter on another night', () => assert.deepEqual(evIds(F({ night: '2026-11-13', evTypes: ['sports'] })), ['e-friday-sports']))
test('genre and type together on another night', () => assert.deepEqual(evIds(F({ night: '2026-11-13', evTypes: ['other'], evGenres: ['techno'] })), ['e-friday-other']))
test('event filters never touch spots or wellness', () => {
  const r = run(F({ evTypes: ['sports'] }))
  assert.equal(onlyKind(r, 'spot').length, 6); assert.equal(onlyKind(r, 'wellness').length, 3)
})
test('eventMatches ignores non-events', () => assert.equal(eventMatches(P.find(p => p.kind === 'spot'), NO_FILTERS, ctxAt()), false))

console.log('Spots: open / closed / unknown')
const sp = (f, ctx) => onlyKind(run(f, ctx), 'spot').sort()
const status = (f = NO_FILTERS, ctx) => run(f, ctx).status
test('status of every spot on Tuesday 21:30', () => {
  const st = status()
  assert.equal(st['s-oulaloum'], 'closed'); assert.equal(st['s-club'], 'closed')   // club opens at 23:00
  assert.equal(st['s-cafe'], 'closed'); assert.equal(st['s-nohours'], 'unknown'); assert.equal(st['s-text'], 'unknown'); assert.equal(st['s-spa'], 'open')
})
test('Όλα shows everything, unknown included', () => assert.equal(sp(F({})).length, 6))
test('Ανοιχτά: only open ones; unknown is not open', () => assert.deepEqual(sp(F({ spotStatus: 'open' })), ['s-spa']))
test('Κλειστά: only closed ones; unknown is not closed', () => assert.deepEqual(sp(F({ spotStatus: 'closed' })), ['s-cafe', 's-club', 's-oulaloum']))
test('open + closed + unknown = all', () => {
  const n = ['open', 'closed'].reduce((a, s) => a + sp(F({ spotStatus: s })).length, 0)
  assert.equal(n + Object.values(status()).filter(x => x === 'unknown').length, 6)
})
test('another night is judged at 21:30 of that date (Wednesday: Ουλαλούμ opens at 18:00)', () => {
  const st = status(F({ night: '2026-11-11' })); assert.equal(st['s-oulaloum'], 'open'); assert.equal(st['s-cafe'], 'closed'); assert.equal(st['s-club'], 'closed')
})
test('status filter on another night', () => assert.deepEqual(sp(F({ night: '2026-11-11', spotStatus: 'open' })).includes('s-oulaloum'), true))
test('at the real moment tonight: Tuesday 23:30 the club is open', () => {
  const late = at('2026-11-10T21:30:00Z') // 23:30 Athens
  assert.equal(resolvePoints(P, NO_FILTERS, mapContext(null, late)).status['s-club'], 'open')
})
test('before 06:00 the status is read at the real moment of the next calendar day', () => {
  const late = at('2026-11-10T22:30:00Z') // Wed 00:30 Athens, still the night of Tue
  const r = resolvePoints(P, NO_FILTERS, mapContext(null, late))
  assert.equal(r.status['s-club'], 'open')       // 23:00-5:00 from Tuesday
  assert.equal(r.status['s-oulaloum'], 'closed') // Tuesday is Κλειστά, no tail
})
test('status + category are ANDed', () => {
  assert.deepEqual(sp(F({ spotStatus: 'closed', categories: ['drink'] })), ['s-oulaloum'])
  assert.deepEqual(sp(F({ spotStatus: 'open', categories: ['drink'] })), [])
})
test('category: a wellness-only spot is out once a category is on, in with none', () => {
  assert.ok(sp(F({})).includes('s-spa')); assert.equal(sp(F({ categories: ['food'] })).includes('s-spa'), false)
})
test('subcategory', () => assert.deepEqual(sp(F({ categories: ['drink'], subcategories: ['wine_bar'] })), ['s-text']))

console.log('Wellness')
const we = (f, ctx) => onlyKind(run(f, ctx), 'wellness').sort()
test('always there, any night', () => { for (const n of [null, '2026-11-13', '2027-01-09']) assert.equal(we(F({ night: n })).length, 3) })
test('subcategories: OR', () => {
  assert.deepEqual(we(F({ wellnessSubs: ['yoga'] })), ['w-yoga'])
  assert.deepEqual(we(F({ wellnessSubs: ['yoga', 'sunset_spot'] })), ['w-strefi', 'w-yoga'])
})
test('a wellness point with no subcategory is hidden once one is chosen', () => assert.equal(we(F({ wellnessSubs: ['yoga'] })).includes('w-plain'), false))
test('the status filter does not touch wellness', () => assert.equal(we(F({ spotStatus: 'open' })).length, 3))

console.log('groups: layers and counts')
test('hiding a group removes its points but not the others', () => {
  assert.equal(onlyKind(run(F({ hidden: ['events'] })), 'event').length, 0)
  assert.equal(onlyKind(run(F({ hidden: ['spots', 'wellness'] })), 'event').length, 4)
  assert.equal(run(F({ hidden: ['events', 'spots', 'wellness'] })).visible.length, 0)
})
test('counts: per group, with the filters, whether the layer is on or not', () => {
  assert.deepEqual(run().counts, { events: 4, spots: 6, wellness: 3 })
  assert.deepEqual(run(F({ hidden: ['spots'], spotStatus: 'closed', evTypes: ['culture'] })).counts, { events: 1, spots: 3, wellness: 3 })
})
test('toggleGroupHidden / showGroup', () => {
  assert.deepEqual(toggleGroupHidden(NO_FILTERS, 'spots').hidden, ['spots']); assert.deepEqual(toggleGroupHidden(F({ hidden: ['spots'] }), 'spots').hidden, [])
  assert.deepEqual(showGroup(F({ hidden: ['events', 'spots'] }), 'events').hidden, ['spots'])
})
test('a hidden layer keeps its filters', () => assert.deepEqual(toggleGroupHidden(F({ evTypes: ['music'] }), 'events').evTypes, ['music']))
test('hasFilters / hasGroupFilters (hidden layers and the date are not filters)', () => {
  assert.equal(hasFilters(F({ hidden: ['spots'], night: '2026-11-13' })), false)
  assert.equal(hasGroupFilters(F({ evGenres: ['techno'] }), 'events'), true); assert.equal(hasGroupFilters(F({ evGenres: ['techno'] }), 'spots'), false)
  assert.equal(hasGroupFilters(F({ spotStatus: 'open' }), 'spots'), true); assert.equal(hasGroupFilters(F({ wellnessSubs: ['yoga'] }), 'wellness'), true)
})

console.log('toggles and normalising')
test('event type / genre toggle, display order', () => {
  let f = toggleEventType(NO_FILTERS, 'sports'); f = toggleEventType(f, 'music'); assert.deepEqual(f.evTypes, ['music', 'sports'])
  f = toggleEventGenre(f, 'jazz'); f = toggleEventGenre(f, 'techno'); assert.deepEqual(f.evGenres, ['techno', 'jazz'])
  assert.deepEqual(toggleEventGenre(f, 'jazz').evGenres, ['techno'])
})
test('normalize drops unknown types, genres, statuses, groups and bad dates', () => {
  const f = normalizeFilters({ hidden: ['spots', 'nope', 'spots'], night: '31/12/2026', evTypes: ['music', 'x'], evGenres: ['techno', 'nope', 'Techno'], spotStatus: 'maybe' })
  assert.deepEqual(f, { ...NO_FILTERS, hidden: ['spots'], evTypes: ['music'], evGenres: ['techno'] })
})
test('legacy genre spellings become keys', () => assert.deepEqual(normalizeFilters({ evGenres: ['Ρεμπέτικα'] }).evGenres, ['rebetiko']))
test('wellness subs and spots subs stay apart', () => {
  assert.deepEqual(toggleWellnessSub(NO_FILTERS, 'yoga').wellnessSubs, ['yoga']); assert.deepEqual(toggleWellnessSub(NO_FILTERS, 'club').wellnessSubs, [])
  assert.deepEqual(toggleMapSub(NO_FILTERS, 'yoga'), NO_FILTERS)
})
test('setSpotStatus, setNight', () => { assert.equal(setSpotStatus(NO_FILTERS, 'open').spotStatus, 'open'); assert.equal(setNight(NO_FILTERS, '2026-11-13').night, '2026-11-13'); assert.equal(setNight(F({ night: '2026-11-13' }), null).night, null) })
test('clear one group; clear all keeps the night', () => {
  const f = F({ evTypes: ['music'], evGenres: ['jazz'], spotStatus: 'open', categories: ['drink'], wellnessSubs: ['yoga'], hidden: ['wellness'], night: '2026-11-13' })
  assert.deepEqual(clearGroupFilters(f, 'events'), { ...f, evTypes: [], evGenres: [] })
  assert.deepEqual(clearGroupFilters(f, 'spots'), { ...f, spotStatus: 'all', categories: [], subcategories: [] })
  assert.deepEqual(clearGroupFilters(f, 'wellness'), { ...f, wellnessSubs: [] })
  assert.deepEqual(clearAllFilters(f), { ...NO_FILTERS, night: '2026-11-13' })
})
test('GROUPS order', () => assert.deepEqual([...GROUPS], ['events', 'spots', 'wellness']))

console.log('URL: c s ws et eg st hide date (+ open)')
const parse = (q) => parseFilters(new URLSearchParams(q))
test('nothing is written for the defaults', () => assert.equal(serializeFilters(NO_FILTERS), ''))
test('every parameter', () => {
  const f = F({ categories: ['drink', 'nightlife'], subcategories: ['cocktail_bar', 'club'], wellnessSubs: ['yoga', 'sea_swim'], evTypes: ['music', 'culture'], evGenres: ['techno', 'jazz'], spotStatus: 'closed', hidden: ['wellness'], night: '2026-11-13' })
  assert.equal(serializeFilters(f), 'c=drink,nightlife&s=cocktail_bar,club&ws=yoga,sea_swim&et=music,culture&eg=techno,jazz&st=closed&hide=wellness&date=2026-11-13')
})
test('parse every parameter', () =>
  assert.deepEqual(parse('c=drink&s=cocktail_bar&ws=yoga&et=music&eg=techno&st=open&hide=events,wellness&date=2026-11-13'),
    F({ categories: ['drink'], subcategories: ['cocktail_bar'], wellnessSubs: ['yoga'], evTypes: ['music'], evGenres: ['techno'], spotStatus: 'open', hidden: ['events', 'wellness'], night: '2026-11-13' })))
test('round trip', () => {
  const f = F({ categories: ['food'], subcategories: ['italian'], evTypes: ['sports'], evGenres: ['rock'], spotStatus: 'open', hidden: ['events'], night: '2026-12-24', wellnessSubs: ['nature_walk'] })
  assert.deepEqual(parse(serializeFilters(f)), f)
})
test('garbage gives the defaults', () => assert.deepEqual(parse('c=%3Cscript%3E&s=;;,&et=zzz&eg=,&st=maybe&hide=all&date=tomorrow&ws=club'), NO_FILTERS))
test('the date is not written for tonight (null), only when one was picked', () => { assert.equal(serializeFilters(F({ night: null })), ''); assert.equal(serializeFilters(F({ night: '2026-11-13' })), 'date=2026-11-13') })
test('a sub whose category is not selected is dropped', () => assert.deepEqual(parse('s=cocktail_bar'), NO_FILTERS))

console.log('URL: old links keep working')
test('?c=wellness&s=yoga: wellness was a category; its subs go to Wellness, Spots go off (it was the only category)', () =>
  assert.deepEqual(parse('c=wellness&s=yoga'), F({ wellnessSubs: ['yoga'], hidden: ['spots'] })))
test('?c=wellness alone', () => assert.deepEqual(parse('c=wellness'), F({ hidden: ['spots'] })))
test('?c=wellness,drink&s=yoga,cocktail_bar: both groups keep their share, Spots stay on', () =>
  assert.deepEqual(parse('c=wellness,drink&s=yoga,cocktail_bar'), F({ categories: ['drink'], subcategories: ['cocktail_bar'], wellnessSubs: ['yoga'] })))
test('?c=drink&s=cocktail_bar is unchanged', () => assert.deepEqual(parse('c=drink&s=cocktail_bar'), F({ categories: ['drink'], subcategories: ['cocktail_bar'] })))
test('?events=1 (old switch, and the button on /events) opens the Events panel and filters nothing', () => {
  assert.deepEqual(parse('events=1'), NO_FILTERS); assert.equal(parseOpenGroup(new URLSearchParams('events=1')), 'events')
})
test('?open=… opens one group, bad values open none', () => {
  const o = (q) => parseOpenGroup(new URLSearchParams(q))
  assert.equal(o('open=spots'), 'spots'); assert.equal(o('open=wellness'), 'wellness'); assert.equal(o('open=events'), 'events')
  assert.equal(o('open=nope'), null); assert.equal(o(''), null); assert.equal(o('events=0'), null)
})
test('?open is never written back', () => assert.equal(serializeFilters(parse('open=events&events=1')), ''))

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
