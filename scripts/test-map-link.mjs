#!/usr/bin/env node
/**
 * Offline tests for the «See them on the map» rows of /spots and /events: the link they build
 * (app/lib/mapLink.ts) for every tab, category, subcategory and music genre, and that the map reads it back as
 * exactly that state (only the group shown, its filter row open, the filters set). No network, no database.
 *
 *   node scripts/test-map-link.mjs
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { spotsMapHref, eventsMapHref } from '../app/lib/mapLink.ts'
import { NO_FILTERS, SPOT_FILTER_CATEGORIES, EVENT_TYPES, parseFilters, parseOpenGroup, normalizeFilters } from '../app/lib/mapFilters.ts'
import { SPOT_CATEGORIES } from '../app/lib/spotCategories.ts'
import { GENRE_KEYS } from '../app/lib/genres.ts'

let passed = 0, failed = 0
function test(name, fn) {
  try { fn(); passed++; console.log(`  ok   ${name}`) }
  catch (e) { failed++; console.log(`  FAIL ${name}\n       ${e.message}`) }
}
const query = (href) => { assert.ok(href.startsWith('/map?'), href); return new URLSearchParams(href.slice('/map?'.length)) }
const read = (href) => { const q = query(href); return { filters: parseFilters(q), open: parseOpenGroup(q), q } }

console.log('/spots')
test('no category picked: only the Spots group, its row open, no filter', () => {
  const r = read(spotsMapHref(null, null))
  assert.deepEqual(r.filters, { ...NO_FILTERS, shown: ['spots'] }); assert.equal(r.open, 'spots')
  assert.equal(spotsMapHref(undefined, undefined), spotsMapHref(null, null))
})
test('every category the map has a Spots filter for', () => {
  for (const c of SPOT_FILTER_CATEGORIES) {
    const r = read(spotsMapHref(c, null))
    assert.deepEqual(r.filters, normalizeFilters({ ...NO_FILTERS, shown: ['spots'], categories: [c] }), c); assert.equal(r.open, 'spots', c)
  }
})
test('every subcategory of every category', () => {
  let n = 0
  for (const cat of SPOT_CATEGORIES.filter(c => c.key !== 'wellness')) for (const sub of cat.subs) {
    const r = read(spotsMapHref(cat.key, sub.key)); n++
    assert.deepEqual(r.filters, normalizeFilters({ ...NO_FILTERS, shown: ['spots'], categories: [cat.key], subcategories: [sub.key] }), `${cat.key}/${sub.key}`)
    assert.deepEqual(r.filters.subcategories, [sub.key]); assert.deepEqual(r.filters.categories, [cat.key]); assert.deepEqual(r.filters.shown, ['spots'])
  }
  assert.ok(n > 10, `only ${n} subs checked`)
})
test('wellness (no Spots filter on the map): only the group, no category, no sub, no error', () => {
  for (const sub of [null, 'yoga', 'sunset_spot']) assert.deepEqual(read(spotsMapHref('wellness', sub)).filters, { ...NO_FILTERS, shown: ['spots'] })
})
test('unknown category, or a subcategory of another category, is ignored', () => {
  assert.deepEqual(read(spotsMapHref('nope', 'cocktail_bar')).filters, { ...NO_FILTERS, shown: ['spots'] })
  assert.deepEqual(read(spotsMapHref('drink', 'club')).filters, { ...NO_FILTERS, shown: ['spots'], categories: ['drink'] })
  assert.deepEqual(read(spotsMapHref('drink', 'zzz')).filters, { ...NO_FILTERS, shown: ['spots'], categories: ['drink'] })
})
test('the exact link (built with serializeFilters)', () => {
  assert.equal(spotsMapHref('drink', 'cocktail_bar'), '/map?c=drink&s=cocktail_bar&hide=events,wellness&open=spots')
  assert.equal(spotsMapHref('drink', null), '/map?c=drink&hide=events,wellness&open=spots')
  assert.equal(spotsMapHref(null, null), '/map?hide=events,wellness&open=spots')
})

console.log('/events')
test('every tab: only the Events group, its row open, the type of the tab', () => {
  for (const t of EVENT_TYPES) {
    const r = read(eventsMapHref(t, null))
    assert.deepEqual(r.filters, { ...NO_FILTERS, shown: ['events'], evTypes: [t] }, t); assert.equal(r.open, 'events', t)
  }
})
test('every music genre on the Music tab', () => {
  for (const g of GENRE_KEYS) {
    const r = read(eventsMapHref('music', g))
    assert.deepEqual(r.filters, { ...NO_FILTERS, shown: ['events'], evTypes: ['music'], evGenres: [g] }, g)
  }
})
test('«All», empty or an unknown genre is no genre filter', () => {
  for (const g of ['All', '', null, undefined, 'nope']) assert.deepEqual(read(eventsMapHref('music', g)).filters, { ...NO_FILTERS, shown: ['events'], evTypes: ['music'] }, String(g))
})
test('a genre picked on the Music tab does not follow the visitor to the other tabs', () => {
  for (const t of ['culture', 'sports', 'other']) assert.deepEqual(read(eventsMapHref(t, 'techno')).filters.evGenres, [], t)
})
test('the genre chips of the page are «All» plus the map\'s own genre keys (so nothing is dropped on the way)', () => {
  // searchConstants.ts has no .ts import suffix and cannot be loaded here: read its line.
  assert.ok(/export const GENRE_FILTERS: string\[\] = \["All", \.\.\.GENRE_KEYS\];/.test(readFileSync(new URL('../app/lib/searchConstants.ts', import.meta.url), 'utf8')))
})
test('an unknown tab is no type filter', () => assert.deepEqual(read(eventsMapHref('zzz', null)).filters, { ...NO_FILTERS, shown: ['events'] }))
test('the exact link', () => {
  assert.equal(eventsMapHref('music', 'techno'), '/map?et=music&eg=techno&hide=spots,wellness&open=events')
  assert.equal(eventsMapHref('culture', null), '/map?et=culture&hide=spots,wellness&open=events')
})

console.log('both')
test('no city, search, date, coordinates or the old show= ever in a link', () => {
  const all = [spotsMapHref('drink', 'cocktail_bar'), spotsMapHref(null, null), eventsMapHref('music', 'techno'), eventsMapHref('sports', null)]
  for (const h of all) assert.ok(!/city|[?&]q=|date=|show=|near=|lat|lng|37\.|23\./.test(h), h)
})
test('the link never says «open» for anything but the group it shows', () => {
  assert.equal(read(spotsMapHref('food', null)).q.get('open'), 'spots'); assert.equal(read(eventsMapHref('music', null)).q.get('open'), 'events')
})
test('serialize → parse is stable: what the map reads, written again, is the same link', () => {
  for (const h of [spotsMapHref('nightlife', 'club'), eventsMapHref('music', 'house')]) {
    const r = read(h)
    assert.deepEqual(parseFilters(new URLSearchParams(h.slice(5))), r.filters)
  }
})

console.log('the pages')
test('the rows replace the hero buttons: no leftover button, no unused text, both languages for the new ones', () => {
  const ev = readFileSync(new URL('../app/events/EventsClient.tsx', import.meta.url), 'utf8'), sp = readFileSync(new URL('../app/spots/SpotsClient.tsx', import.meta.url), 'utf8')
  for (const src of [ev, sp]) { assert.ok(!src.includes('map_open')); assert.ok(!/Discreet entry to the map/.test(src)); assert.equal((src.match(/<MapLinkRow/g) || []).length, src === ev ? 2 : 1) }
  const tr = readFileSync(new URL('../app/lib/translations.ts', import.meta.url), 'utf8')
  assert.ok(!/^  map_open:/m.test(tr))
  for (const k of ['map_row_title', 'map_row_events', 'map_row_spots']) assert.ok(new RegExp(`^  ${k}:\\s*\\{ el: "[^"]+", en: "[^"]+" \\}`, 'm').test(tr), k)
})

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
