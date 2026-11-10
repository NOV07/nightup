#!/usr/bin/env node
/**
 * Offline tests for the groups of the public map (Events / Spots / Wellness):
 * the night and what it does to events and to open/closed status, the filters
 * of each group, lighting the layers (the map opens with none), counts and the URL
 * (including old links).
 * Logic in app/lib/mapFilters.ts. No network, no database.
 *
 *   node scripts/test-map-groups.mjs
 */
import assert from 'node:assert/strict'
import {
  NO_FILTERS, mapContext, resolvePoints, normalizeFilters, parseFilters, parseOpenGroup, serializeFilters,
  toggleGroupShown, toggleGroupPanel, showGroup, toggleEventType, toggleEventGenre, setSpotStatus, toggleMapCategory, toggleMapSub,
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
// The map opens with no group lit. Most tests below are about filters, so their F() lights all three.
const ALL = ['events', 'spots', 'wellness']
const F = (over) => normalizeFilters({ ...NO_FILTERS, shown: ALL, ...over })
const run = (f = F(), ctx = ctxAt(f.night)) => resolvePoints(P, f, ctx)
const ids = (r) => r.visible.map(p => p.id)
const onlyKind = (r, kind) => r.visible.filter(p => p.kind === kind).map(p => p.id)

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
  assert.deepEqual(onlyKind(resolvePoints(P, F(), mapContext(null, late)), 'event'), ['e-early-today'])
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
const status = (f = F(), ctx) => run(f, ctx).status
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
  assert.equal(resolvePoints(P, F(), mapContext(null, late)).status['s-club'], 'open')
})
test('before 06:00 the status is read at the real moment of the next calendar day', () => {
  const late = at('2026-11-10T22:30:00Z') // Wed 00:30 Athens, still the night of Tue
  const r = resolvePoints(P, F(), mapContext(null, late))
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

console.log('groups: the map opens empty; lighting a layer')
test('default: no group is lit, so nothing is drawn', () => {
  assert.deepEqual(NO_FILTERS.shown, []); assert.deepEqual(run(NO_FILTERS).visible, [])
})
test('lighting one group draws only that group', () => {
  assert.equal(onlyKind(run(F({ shown: ['events'] })), 'event').length, 4); assert.equal(run(F({ shown: ['events'] })).visible.length, 4)
  assert.equal(run(F({ shown: ['spots'] })).visible.length, 6); assert.equal(run(F({ shown: ['wellness'] })).visible.length, 3)
})
test('all three lit draws everything', () => assert.equal(run(F()).visible.length, 13))
test('counts: per group, with the filters, whether the layer is lit or not (what lighting it would show)', () => {
  assert.deepEqual(run(NO_FILTERS).counts, { events: 4, spots: 6, wellness: 3 })
  assert.deepEqual(run(F()).counts, { events: 4, spots: 6, wellness: 3 })
  assert.deepEqual(run(F({ shown: ['events'], spotStatus: 'closed', evTypes: ['culture'] })).counts, { events: 1, spots: 3, wellness: 3 })
  assert.deepEqual(run({ ...NO_FILTERS, spotStatus: 'closed', evTypes: ['culture'] }).counts, { events: 1, spots: 3, wellness: 3 })
})
test('filters narrow a lit group and leave the others', () => assert.deepEqual(onlyKind(run(F({ shown: ['events', 'wellness'], evTypes: ['sports'] })), 'wellness').length, 3))
test('toggleGroupShown / showGroup', () => {
  assert.deepEqual(toggleGroupShown(NO_FILTERS, 'spots').shown, ['spots']); assert.deepEqual(toggleGroupShown(F({ shown: ['spots'] }), 'spots').shown, [])
  assert.deepEqual(toggleGroupShown(toggleGroupShown(NO_FILTERS, 'wellness'), 'events').shown, ['events', 'wellness'])   // display order
  assert.deepEqual(showGroup(NO_FILTERS, 'events').shown, ['events']); assert.deepEqual(showGroup(F({ shown: ['spots'] }), 'spots').shown, ['spots'])
})
test('a layer that is off keeps its filters', () => assert.deepEqual(toggleGroupShown(F({ shown: ['events'], evTypes: ['music'] }), 'events').evTypes, ['music']))
test('hasFilters / hasGroupFilters (lit layers and the date are not filters)', () => {
  assert.equal(hasFilters(F({ shown: ['spots'], night: '2026-11-13' })), false)
  assert.equal(hasGroupFilters(F({ evGenres: ['techno'] }), 'events'), true); assert.equal(hasGroupFilters(F({ evGenres: ['techno'] }), 'spots'), false)
  assert.equal(hasGroupFilters(F({ spotStatus: 'open' }), 'spots'), true); assert.equal(hasGroupFilters(F({ wellnessSubs: ['yoga'] }), 'wellness'), true)
})

console.log('picking a filter in a group that is off lights it')
const off = NO_FILTERS
test('event type and genre', () => {
  assert.deepEqual(toggleEventType(off, 'music').shown, ['events']); assert.deepEqual(toggleEventGenre(off, 'techno').shown, ['events'])
})
test('spots: status open / closed, category, subcategory', () => {
  assert.deepEqual(setSpotStatus(off, 'open').shown, ['spots']); assert.deepEqual(setSpotStatus(off, 'closed').shown, ['spots'])
  assert.deepEqual(toggleMapCategory(off, 'drink').shown, ['spots']); assert.deepEqual(toggleMapSub(off, 'cocktail_bar').shown, ['spots'])
})
test('wellness subcategory', () => assert.deepEqual(toggleWellnessSub(off, 'yoga').shown, ['wellness']))
test('only its own group is lit; the others stay as they were', () => {
  assert.deepEqual(toggleEventType(F({ shown: ['wellness'] }), 'music').shown, ['events', 'wellness'])
  assert.deepEqual(toggleMapCategory(F({ shown: ['events'] }), 'food').shown, ['events', 'spots'])
})
test('taking a filter off, or choosing «all», lights nothing', () => {
  const f = { ...off, evTypes: ['music'], evGenres: ['techno'], spotStatus: 'open', categories: ['drink'], wellnessSubs: ['yoga'] }
  assert.deepEqual(toggleEventType(f, 'music').shown, []); assert.deepEqual(toggleEventGenre(f, 'techno').shown, [])
  assert.deepEqual(setSpotStatus(f, 'all').shown, []); assert.deepEqual(toggleMapCategory(f, 'drink').shown, []); assert.deepEqual(toggleWellnessSub(f, 'yoga').shown, [])
  assert.deepEqual(setSpotStatus(off, 'all').shown, [])
})
test('picking a filter in a group that is already lit changes nothing else', () => assert.deepEqual(toggleEventType(F({ shown: ['events'] }), 'music').shown, ['events']))
test('an ignored pick (unknown or not a Spots sub) lights nothing', () => {
  assert.deepEqual(toggleMapSub(off, 'yoga'), off); assert.deepEqual(toggleMapSub(off, 'rooftop_bar'), off); assert.deepEqual(toggleMapCategory(off, 'wellness'), off)
  assert.deepEqual(toggleWellnessSub(off, 'club').shown, [])
})
test('clearing a group\'s filters never lights it', () => assert.deepEqual(clearGroupFilters(off, 'events').shown, []))

console.log('a tap on the NAME of a group: the panel opens and the group lights; closing leaves it as it is')
test('off group: the name opens its panel and lights it', () => {
  const r = toggleGroupPanel(NO_FILTERS, null, 'spots'); assert.equal(r.open, 'spots'); assert.deepEqual(r.filters.shown, ['spots'])
})
test('lit group: the name opens its panel, the layer stays as it was', () => {
  const f = F({ shown: ['events', 'spots'] }); const r = toggleGroupPanel(f, null, 'events'); assert.equal(r.open, 'events'); assert.deepEqual(r.filters.shown, ['events', 'spots'])
  assert.equal(r.filters, f, 'nothing to change: the same filters object comes back')
})
test('the same name again closes the panel and does not turn the group off', () => {
  const lit = toggleGroupPanel(NO_FILTERS, null, 'wellness'); const closed = toggleGroupPanel(lit.filters, lit.open, 'wellness')
  assert.equal(closed.open, null); assert.deepEqual(closed.filters.shown, ['wellness'])
})
test('closing a panel does not light a group the dot had switched off', () => {
  const off2 = toggleGroupShown(toggleGroupPanel(NO_FILTERS, null, 'events').filters, 'events')   // opened (lit), then the dot turned it off
  assert.deepEqual(off2.shown, []); const r = toggleGroupPanel(off2, 'events', 'events'); assert.equal(r.open, null); assert.deepEqual(r.filters.shown, [])
})
test('another name switches the panel and lights that group; the first one stays as it was', () => {
  const a = toggleGroupPanel(NO_FILTERS, null, 'events'); const b = toggleGroupPanel(a.filters, a.open, 'spots')
  assert.equal(b.open, 'spots'); assert.deepEqual(b.filters.shown, ['events', 'spots'])
})
test('the dot is still the only thing that switches a layer off, and it does not touch the panel', () => {
  const a = toggleGroupPanel(NO_FILTERS, null, 'spots'); assert.deepEqual(toggleGroupShown(a.filters, 'spots').shown, [])
  assert.deepEqual(toggleGroupShown(NO_FILTERS, 'events').shown, ['events'])   // the dot lights without opening anything (the panel state is not part of the filters)
})
test('only `shown` changes; filters and the night are kept', () => {
  const f = { ...NO_FILTERS, evTypes: ['music'], night: '2026-11-13' }; const r = toggleGroupPanel(f, null, 'events')
  assert.deepEqual({ ...r.filters, shown: [] }, f)
})

console.log('toggles and normalising')
test('event type / genre toggle, display order', () => {
  let f = toggleEventType(NO_FILTERS, 'sports'); f = toggleEventType(f, 'music'); assert.deepEqual(f.evTypes, ['music', 'sports'])
  f = toggleEventGenre(f, 'jazz'); f = toggleEventGenre(f, 'techno'); assert.deepEqual(f.evGenres, ['techno', 'jazz'])
  assert.deepEqual(toggleEventGenre(f, 'jazz').evGenres, ['techno'])
})
test('normalize drops unknown types, genres, statuses, groups and bad dates', () => {
  const f = normalizeFilters({ shown: ['spots', 'nope', 'spots'], night: '31/12/2026', evTypes: ['music', 'x'], evGenres: ['techno', 'nope', 'Techno'], spotStatus: 'maybe' })
  assert.deepEqual(f, { ...NO_FILTERS, shown: ['spots'], evTypes: ['music'], evGenres: ['techno'] })
})
test('legacy genre spellings become keys', () => assert.deepEqual(normalizeFilters({ evGenres: ['Ρεμπέτικα'] }).evGenres, ['rebetiko']))
test('wellness subs and spots subs stay apart', () => {
  assert.deepEqual(toggleWellnessSub(NO_FILTERS, 'yoga').wellnessSubs, ['yoga']); assert.deepEqual(toggleWellnessSub(NO_FILTERS, 'club').wellnessSubs, [])
  assert.deepEqual(toggleMapSub(NO_FILTERS, 'yoga'), NO_FILTERS)
})
test('setSpotStatus, setNight', () => { assert.equal(setSpotStatus(NO_FILTERS, 'open').spotStatus, 'open'); assert.equal(setNight(NO_FILTERS, '2026-11-13').night, '2026-11-13'); assert.equal(setNight(F({ night: '2026-11-13' }), null).night, null) })
test('clear one group or all: filters go, nothing is lit by it; the night stays', () => {
  const f = F({ evTypes: ['music'], evGenres: ['jazz'], spotStatus: 'open', categories: ['drink'], wellnessSubs: ['yoga'], shown: ['wellness'], night: '2026-11-13' })
  assert.deepEqual(clearGroupFilters(f, 'events'), { ...f, evTypes: [], evGenres: [] })
  assert.deepEqual(clearGroupFilters(f, 'spots'), { ...f, spotStatus: 'all', categories: [], subcategories: [] })
  assert.deepEqual(clearGroupFilters(f, 'wellness'), { ...f, wellnessSubs: [] })
  assert.deepEqual(clearAllFilters(f), { ...NO_FILTERS, shown: ['wellness'], night: '2026-11-13' })
  assert.deepEqual(clearAllFilters({ ...f, shown: [] }).shown, [])   // clearing never lights a group
})
test('GROUPS order', () => assert.deepEqual([...GROUPS], ['events', 'spots', 'wellness']))

console.log('URL: show c s ws et eg st date (+ open)')
const parse = (q) => parseFilters(new URLSearchParams(q))
test('nothing is written for the defaults (an empty map, no filter, tonight)', () => assert.equal(serializeFilters(NO_FILTERS), ''))
test('every parameter', () => {
  const f = F({ shown: ['events', 'spots', 'wellness'], categories: ['drink', 'nightlife'], subcategories: ['cocktail_bar', 'club'], wellnessSubs: ['yoga', 'sea_swim'], evTypes: ['music', 'culture'], evGenres: ['techno', 'jazz'], spotStatus: 'closed', night: '2026-11-13' })
  assert.equal(serializeFilters(f), 'c=drink,nightlife&s=cocktail_bar,club&ws=yoga,sea_swim&et=music,culture&eg=techno,jazz&st=closed&show=events,spots,wellness&date=2026-11-13')
})
test('show is written in display order, only the lit groups', () => {
  assert.equal(serializeFilters(F({ shown: ['wellness', 'events'] })), 'show=events,wellness'); assert.equal(serializeFilters(F({ shown: ['spots'] })), 'show=spots')
})
test('filters set but nothing lit: show= with no value, so the filters do not light anything on reload', () => {
  assert.equal(serializeFilters({ ...NO_FILTERS, evTypes: ['music'] }), 'et=music&show=')
  assert.equal(serializeFilters({ ...NO_FILTERS, night: '2026-11-13' }), 'date=2026-11-13')
})
test('parse every parameter', () =>
  assert.deepEqual(parse('show=events,wellness&c=drink&s=cocktail_bar&ws=yoga&et=music&eg=techno&st=open&date=2026-11-13'),
    F({ shown: ['events', 'wellness'], categories: ['drink'], subcategories: ['cocktail_bar'], wellnessSubs: ['yoga'], evTypes: ['music'], evGenres: ['techno'], spotStatus: 'open', night: '2026-11-13' })))
test('show decides what is lit; with it, filters light nothing by themselves', () => {
  assert.deepEqual(parse('show=events&st=open').shown, ['events']); assert.deepEqual(parse('show=&et=music').shown, []); assert.deepEqual(parse('show=spots&et=music').shown, ['spots'])
})
test('round trip, including a layer that is off but has filters', () => {
  for (const f of [
    F({ shown: ['spots', 'wellness'], categories: ['food'], subcategories: ['italian'], evTypes: ['sports'], evGenres: ['rock'], spotStatus: 'open', night: '2026-12-24', wellnessSubs: ['nature_walk'] }),
    F({ shown: ['events'], evTypes: ['music'], spotStatus: 'closed' }),     // Spots has a filter but is off
    { ...NO_FILTERS, evGenres: ['jazz'] },                                   // filters, nothing lit
    F({ shown: ['events'] }), NO_FILTERS, { ...NO_FILTERS, night: '2026-11-13' },
  ]) assert.deepEqual(parse(serializeFilters(f)), f, serializeFilters(f))
})
test('garbage gives the defaults', () => assert.deepEqual(parse('c=%3Cscript%3E&s=;;,&et=zzz&eg=,&st=maybe&show=all,none&date=tomorrow&ws=club'), NO_FILTERS))
test('the date is not written for tonight (null), only when one was picked', () => { assert.equal(serializeFilters(F({ shown: [], night: null })), ''); assert.equal(serializeFilters(F({ shown: [], night: '2026-11-13' })), 'date=2026-11-13') })
test('a sub whose category is not selected is dropped', () => assert.deepEqual(parse('s=cocktail_bar'), NO_FILTERS))
test('a date alone lights nothing', () => assert.deepEqual(parse('date=2026-11-13'), { ...NO_FILTERS, night: '2026-11-13' }))

console.log('URL: old links and the buttons keep working')
test('?events=1 (the button on /events, and the old switch): Events is lit, its panel opens, no filter', () => {
  assert.deepEqual(parse('events=1'), { ...NO_FILTERS, shown: ['events'] }); assert.equal(parseOpenGroup(new URLSearchParams('events=1')), 'events')
})
test('?show=spots&open=spots (the button on /spots): Spots lit, its panel opens', () => {
  assert.deepEqual(parse('show=spots&open=spots'), { ...NO_FILTERS, shown: ['spots'] }); assert.equal(parseOpenGroup(new URLSearchParams('show=spots&open=spots')), 'spots')
})
test('a spots filter (c, s, st) without show lights Spots', () => {
  for (const q of ['c=drink', 'c=drink&s=cocktail_bar', 'st=open', 'st=closed']) assert.deepEqual(parse(q).shown, ['spots'], q)
})
test('?ws= lights Wellness; ?et= and ?eg= light Events', () => {
  assert.deepEqual(parse('ws=yoga').shown, ['wellness']); assert.deepEqual(parse('et=music').shown, ['events']); assert.deepEqual(parse('eg=techno').shown, ['events'])
})
test('filters of several groups light all of them', () => assert.deepEqual(parse('c=drink&ws=yoga&et=music').shown, ['events', 'spots', 'wellness']))
test('an old link carries its filters along unchanged', () => assert.deepEqual(parse('c=drink&s=cocktail_bar&st=open'), F({ shown: ['spots'], categories: ['drink'], subcategories: ['cocktail_bar'], spotStatus: 'open' })))
test('?hide=… of the previous scheme is ignored, without an error', () => {
  assert.deepEqual(parse('hide=spots,wellness'), NO_FILTERS); assert.deepEqual(parse('hide=spots&c=drink').shown, ['spots']); assert.deepEqual(parse('hide=garbage,,'), NO_FILTERS)
  assert.deepEqual(parse('show=events&hide=events'), { ...NO_FILTERS, shown: ['events'] })
})
test('?c=wellness&s=yoga: wellness was a category; its subs go to Wellness, which is lit; Spots stay off', () =>
  assert.deepEqual(parse('c=wellness&s=yoga'), F({ shown: ['wellness'], wellnessSubs: ['yoga'] })))
test('?c=wellness alone lights Wellness', () => assert.deepEqual(parse('c=wellness'), F({ shown: ['wellness'] })))
test('?c=wellness,drink&s=yoga,cocktail_bar: both groups lit with their share', () =>
  assert.deepEqual(parse('c=wellness,drink&s=yoga,cocktail_bar'), F({ shown: ['spots', 'wellness'], categories: ['drink'], subcategories: ['cocktail_bar'], wellnessSubs: ['yoga'] })))
test('?open=… opens one group, bad values open none', () => {
  const o = (q) => parseOpenGroup(new URLSearchParams(q))
  assert.equal(o('open=spots'), 'spots'); assert.equal(o('open=wellness'), 'wellness'); assert.equal(o('open=events'), 'events')
  assert.equal(o('open=nope'), null); assert.equal(o(''), null); assert.equal(o('events=0'), null)
})
test('?open is never written back; the button links settle into a clean show= after the first change', () => {
  assert.equal(serializeFilters(parse('open=events&events=1')), 'show=events')
  assert.equal(serializeFilters(parse('show=spots&open=spots')), 'show=spots')
})

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
