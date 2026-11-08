#!/usr/bin/env node
/**
 * Offline tests for app/lib/spotCategories.ts (keys, legacy conversion,
 * validator, pickers, card label) and app/spots/night.ts. No network.
 *
 *   node scripts/test-spot-categories.mjs
 */
import assert from 'node:assert/strict'
import {
  SPOT_CATEGORIES, SPOT_CATEGORY_KEYS, normalizeSpotSub, validateSpotTaxonomy, primarySubLabel, primaryCategory,
  spotInCategory, spotSubsInCategory, spotCategoryLabel, spotSubLabel, subCategoryOf, isSpotSub,
  toggleSpotCategory, makePrimaryCategory, toggleSpotSub,
} from '../app/lib/spotCategories.ts'
import { pickSequence, moodSequence } from '../app/spots/night.ts'

let passed = 0, failed = 0
function test(name, fn) {
  try { fn(); passed++; console.log(`  ok   ${name}`) }
  catch (e) { failed++; console.log(`  FAIL ${name}\n       ${e.message}`) }
}

console.log('keys')
test('8 categories in the DB enum order set', () => {
  assert.deepEqual([...SPOT_CATEGORY_KEYS].sort(), ['activity', 'art', 'chill', 'drink', 'food', 'nightlife', 'show', 'wellness'])
})
test('subcategory keys are unique across categories', () => {
  const all = SPOT_CATEGORIES.flatMap(c => c.subs.map(s => s.key))
  assert.equal(new Set(all).size, all.length)
})
test('every key is lowercase snake_case', () => {
  for (const c of SPOT_CATEGORIES) for (const s of c.subs) assert.match(s.key, /^[a-z]+(_[a-z]+)*$/)
})
test('every label exists in Greek and English', () => {
  for (const c of SPOT_CATEGORIES) {
    assert.ok(c.label_el && c.label_en)
    for (const s of c.subs) assert.ok(s.label_el && s.label_en)
  }
})
test('subCategoryOf', () => { assert.equal(subCategoryOf('club'), 'nightlife'); assert.equal(subCategoryOf('paintball'), 'activity'); assert.equal(subCategoryOf('live_music'), undefined) })

console.log('final list')
const FINAL = {
  drink: ['cocktail_bar', 'wine_bar', 'beer_bar', 'raki_tsipouro', 'speakeasy'],
  food: ['italian', 'asian', 'mexican', 'restaurant', 'souvlaki', 'burger', 'seafood', 'vegan', 'meze', 'street_food', 'brunch'],
  nightlife: ['club', 'karaoke', 'bouzoukia', 'entechno', 'underground', 'disco', 'rock_metal', 'latin', 'hiphop_rnb'],
  show: ['stand_up', 'theatre', 'cinema', 'performance'],
  activity: ['escape_room', 'bowling', 'board_games', 'billiards', 'karting', 'arcade', 'paintball', 'laser_tag', 'airsoft'],
}
for (const [cat, keys] of Object.entries(FINAL)) {
  test(`${cat} has exactly ${keys.length} subcategories`, () => assert.deepEqual(SPOT_CATEGORIES.find(c => c.key === cat).subs.map(s => s.key).sort(), [...keys].sort()))
}
test('chill, art, wellness are untouched', () => {
  const by = Object.fromEntries(SPOT_CATEGORIES.map(c => [c.key, c.subs.map(s => s.key)]))
  assert.deepEqual(by.chill, ['specialty_coffee', 'all_day_cafe', 'dessert', 'tea'])
  assert.deepEqual(by.art, ['museum', 'art_gallery', 'bookstore'])
  assert.deepEqual(by.wellness, ['sunset_spot', 'yoga', 'sea_swim', 'nature_walk'])
})
test('removed keys are gone', () => {
  for (const k of ['rooftop_bar', 'all_day_bar', 'shots_bar', 'sushi', 'creative', 'mainstream', 'live_stage', 'live_music']) assert.equal(isSpotSub(k), false, k)
})
test('hints do not mention removed subcategories', () => {
  for (const c of SPOT_CATEGORIES) assert.doesNotMatch(`${c.hint_el} ${c.hint_en}`, /rooftop|κινέζικο|chinese|live music/i)
})

console.log('legacy value -> key (mirrors normalize_spot_sub in the migration)')
const LEGACY = [
  // [old stored value, category, key]
  ['σουβλάκι', 'food', 'souvlaki'], ['burger', 'food', 'burger'], ['σούσι', 'food', 'asian'], ['ιταλικό', 'food', 'italian'],
  ['μεζεδοπωλείο', 'food', 'meze'], ['brunch', 'food', 'brunch'], ['vegan', 'food', 'vegan'], ['θαλασσινά', 'food', 'seafood'],
  ['creative', 'food', 'restaurant'], ['street food', 'food', 'street_food'],
  ['cocktail bar', 'drink', 'cocktail_bar'], ['wine bar', 'drink', 'wine_bar'], ['rooftop bar', 'drink', 'cocktail_bar'],
  ['all-day bar', 'drink', 'cocktail_bar'], ['μπυραρία', 'drink', 'beer_bar'], ['σφηνάδικο', 'drink', 'cocktail_bar'],
  ['club', 'nightlife', 'club'], ['underground', 'nightlife', 'underground'], ['mainstream', 'nightlife', 'club'],
  ['live stage', 'nightlife', 'club'], ['μπουζούκια', 'nightlife', 'bouzoukia'], ['disco', 'nightlife', 'disco'],
  ['stand-up comedy', 'show', 'stand_up'], ['θέατρο', 'show', 'theatre'],
  ['σινεμά', 'show', 'cinema'], ['performance', 'show', 'performance'],
  ['specialty καφέ', 'chill', 'specialty_coffee'], ['all-day café', 'chill', 'all_day_cafe'], ['γλυκό', 'chill', 'dessert'], ['τσάι', 'chill', 'tea'],
  ['escape room', 'activity', 'escape_room'], ['bowling', 'activity', 'bowling'], ['board game café', 'activity', 'board_games'],
  ['μπιλιάρδο', 'activity', 'billiards'], ['καρτ', 'activity', 'karting'], ['arcade', 'activity', 'arcade'],
  ['μουσείο', 'art', 'museum'], ['art gallery', 'art', 'art_gallery'], ['βιβλιοπωλείο', 'art', 'bookstore'],
  ['sunset spot', 'wellness', 'sunset_spot'], ['yoga', 'wellness', 'yoga'], ['θαλάσσια', 'wellness', 'sea_swim'], ['φύση', 'wellness', 'nature_walk'],
]
for (const [old, cat, key] of LEGACY) {
  test(`${cat}: "${old}" -> ${key}`, () => assert.equal(normalizeSpotSub(old, cat), key))
}
test('every old SUBCATEGORIES value is covered (43 of them)', () => assert.equal(LEGACY.length, 43))
test('spelling variants: case, accents, spaces', () => {
  assert.equal(normalizeSpotSub('  ΜΕΖΕΔΟΠΩΛΕΊΟ ', 'food'), 'meze')
  assert.equal(normalizeSpotSub('Cocktail Bar'), 'cocktail_bar')
  assert.equal(normalizeSpotSub('Sushi'), 'asian')
})
test('a key stays a key', () => { assert.equal(normalizeSpotSub('street_food'), 'street_food'); assert.equal(normalizeSpotSub('karaoke'), 'karaoke') })
test('new labels resolve to their key', () => {
  for (const c of SPOT_CATEGORIES.filter(c => c.key in FINAL)) for (const sub of c.subs) { assert.equal(normalizeSpotSub(sub.label_el, c.key), sub.key, sub.label_el); assert.equal(normalizeSpotSub(sub.label_en, c.key), sub.key, sub.label_en) }
})
test('removed keys map to the closest key left', () => {
  for (const [old, now] of [['sushi', 'asian'], ['creative', 'restaurant'], ['rooftop_bar', 'cocktail_bar'], ['all_day_bar', 'cocktail_bar'], ['shots_bar', 'cocktail_bar'], ['mainstream', 'club'], ['live_stage', 'club']]) assert.equal(normalizeSpotSub(old), now)
  assert.equal(normalizeSpotSub('live_music', 'nightlife'), 'club')
})
test('live stage / live music with show is rejected, not remapped', () => { assert.equal(normalizeSpotSub('live stage', 'show'), 'live stage'); assert.equal(normalizeSpotSub('live_music', 'show'), 'live_music') })
test('unknown value comes back unchanged', () => assert.equal(normalizeSpotSub('foobar'), 'foobar'))
test('empty / null -> null', () => { assert.equal(normalizeSpotSub(''), null); assert.equal(normalizeSpotSub(null), null) })
test('the migration example: food/μεζεδοπωλείο -> meze', () => {
  const r = validateSpotTaxonomy({ category: 'food', subcategory: 'μεζεδοπωλείο' })
  assert.deepEqual(r.fields, { categories: ['food'], category: 'food', subcategories: ['meze'], subcategory: 'meze' })
})

console.log('validateSpotTaxonomy')
const bad = (i, o) => { const r = validateSpotTaxonomy(i, o); assert.equal(r.ok, false); return r.error }
test('duplicates are dropped', () => {
  const r = validateSpotTaxonomy({ categories: ['food', 'food', 'drink'], subcategories: ['burger', 'burger'] })
  assert.deepEqual(r.fields.categories, ['food', 'drink'])
  assert.deepEqual(r.fields.subcategories, ['burger'])
})
test('category names are case/space tolerant', () => assert.deepEqual(validateSpotTaxonomy({ category: ' Drink ' }).fields.categories, ['drink']))
test('exactly 3 categories and 3 subcategories pass', () => {
  const r = validateSpotTaxonomy({ categories: ['food', 'drink', 'show'], subcategories: ['burger', 'wine_bar', 'cinema'] })
  assert.equal(r.ok, true)
})
test('live stage with show only is rejected', () => assert.match(bad({ categories: ['show'], subcategories: ['live stage'] }), /not in the list for show/))
test('live stage with nightlife means club', () => assert.deepEqual(validateSpotTaxonomy({ categories: ['nightlife', 'show'], subcategories: ['live stage'] }).fields.subcategories, ['club']))
test('a removed key sent by an old client is converted', () => assert.deepEqual(validateSpotTaxonomy({ categories: ['drink'], subcategories: ['rooftop_bar', 'cocktail_bar'] }).fields.subcategories, ['cocktail_bar']))
test('missing category when required', () => assert.match(bad({}), /Category must be one of/))
test('edit without taxonomy writes nothing', () => assert.equal(validateSpotTaxonomy({ name: 'x' }, { required: false }).fields, null))
test('edit with subcategories only is checked against the stored categories', () => {
  assert.equal(validateSpotTaxonomy({ subcategories: ['burger'] }, { required: false, existingCategories: ['food'] }).ok, true)
  assert.match(bad({ subcategories: ['club'] }, { required: false, existingCategories: ['food'] }), /not in the list for food/)
})
test('subcategories not a list', () => assert.match(bad({ categories: ['food'], subcategories: 5 }), /subcategories must be a list/))
test('legacy subcategory null clears', () => assert.deepEqual(validateSpotTaxonomy({ category: 'food', subcategory: null }).fields.subcategories, []))

console.log('pickers')
test('toggle adds, removes, and stops at 3', () => {
  let s = { categories: [], subcategories: [] }
  for (const c of ['food', 'drink', 'show', 'chill']) s = toggleSpotCategory(s, c)
  assert.deepEqual(s.categories, ['food', 'drink', 'show'])
  s = toggleSpotCategory(s, 'drink')
  assert.deepEqual(s.categories, ['food', 'show'])
})
test('removing a category drops its subcategories only', () => {
  let s = { categories: ['food', 'drink'], subcategories: ['burger', 'wine_bar'] }
  s = toggleSpotCategory(s, 'food')
  assert.deepEqual(s, { categories: ['drink'], subcategories: ['wine_bar'] })
})
test('make primary moves to the front', () => assert.deepEqual(makePrimaryCategory({ categories: ['food', 'drink', 'show'], subcategories: [] }, 'show').categories, ['show', 'food', 'drink']))
test('subcategory needs its category and stops at 3', () => {
  let s = { categories: ['food'], subcategories: [] }
  assert.equal(toggleSpotSub(s, 'club').subcategories.length, 0)
  for (const k of ['burger', 'asian', 'meze', 'vegan']) s = toggleSpotSub(s, k)
  assert.deepEqual(s.subcategories, ['burger', 'asian', 'meze'])
})

console.log('reading a spot')
const spot = (o) => ({ id: 'x', category: 'food', categories: ['food', 'nightlife'], subcategories: ['club', 'meze'], ...o })
test('primary is the first category', () => assert.equal(primaryCategory(spot()), 'food'))
test('shows in every one of its categories, not in others', () => {
  assert.equal(spotInCategory(spot(), 'nightlife'), true)
  assert.equal(spotInCategory(spot(), 'drink'), false)
})
test('subs per category', () => {
  assert.deepEqual(spotSubsInCategory(spot(), 'food'), ['meze'])
  assert.deepEqual(spotSubsInCategory(spot(), 'nightlife'), ['club'])
})
test('card label: first sub that belongs to the primary category', () => assert.equal(primarySubLabel(spot(), 'el'), 'Μεζεδοπωλείο'))
test('card label falls back to the first sub', () => assert.equal(primarySubLabel(spot({ subcategories: ['club'] }), 'en'), 'Club'))
test('card label is null without subs', () => assert.equal(primarySubLabel(spot({ subcategories: [], subcategory: null }), 'el'), null))
test('old row (single columns only) still reads', () => {
  const old = { category: 'food', subcategory: 'μεζεδοπωλείο' }
  assert.equal(primarySubLabel(old, 'el'), 'Μεζεδοπωλείο')
  assert.equal(spotInCategory(old, 'food'), true)
})
test('labels in both languages; unknown value shown as is', () => {
  assert.equal(spotCategoryLabel('show', 'el'), 'Διασκέδαση')
  assert.equal(spotCategoryLabel('show', 'en'), 'Entertainment')
  assert.equal(spotSubLabel('raki_tsipouro', 'en'), 'Raki / Tsipouro bar')
  assert.equal(spotSubLabel('raki_tsipouro', 'el'), 'Ρακάδικο / Τσιπουράδικο')
  assert.equal(spotSubLabel('rooftop_bar', 'en'), 'rooftop_bar')
  assert.equal(spotSubLabel('whatever', 'el'), 'whatever')
})

console.log('night builder')
const pool = [
  { id: 'a', category: 'food', categories: ['food', 'drink'] },
  { id: 'b', category: 'drink', categories: ['drink'] },
  { id: 'c', category: 'nightlife', categories: ['nightlife', 'drink'] },
]
test('matches any category and never repeats a spot', () => {
  const r = pickSequence(pool, ['food', 'drink', 'nightlife'])
  assert.deepEqual(r.map(s => s.id), ['a', 'b', 'c'])
  assert.deepEqual(r.map(s => s.nightSlot), ['food', 'drink', 'nightlife'])
})
test('a spot in two categories is used once', () => {
  const r = pickSequence([{ id: 'a', category: 'food', categories: ['food', 'drink'] }], ['food', 'drink'])
  assert.equal(r.length, 1)
})
test('a stop with no match is skipped', () => assert.equal(pickSequence(pool, ['chill', 'food']).length, 1))
test('random mode still respects the rules', () => {
  for (let i = 0; i < 20; i++) {
    const r = pickSequence(pool, ['drink', 'drink', 'drink'], true)
    assert.equal(new Set(r.map(s => s.id)).size, r.length)
  }
})
test('mood sequences', () => { assert.deepEqual(moodSequence('wild'), ['food', 'drink', 'nightlife']); assert.deepEqual(moodSequence('x'), ['food', 'drink', 'nightlife']) })

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
