// Single source of truth for spot categories and subcategories.
//
// The DB stores the stable `key` (snake_case) in spots.categories[] and
// spots.subcategories[]. The screen shows label_el (or label_en when the site
// is in English). Nobody writes a category string by hand: forms, filters,
// admin, the API validator and the Tonight builder all read from this file.
//
// spots.categories[1] is the PRIMARY category (icon + card); spots.category
// mirrors it and spots.subcategory mirrors subcategories[1] (trigger
// sync_spot_taxonomy in the spot_categories migration).
//
// No runtime imports and only erasable TS syntax: the API validator and
// scripts/test-admin-add-spot.mjs (plain Node) load this file directly.

export const MAX_SPOT_CATEGORIES = 3
export const MAX_SPOT_SUBCATEGORIES = 3

// Display order = order of the sections on /spots.
export const SPOT_CATEGORIES = [
  {
    key: 'drink', emoji: '🍸', label_el: 'Ποτό', label_en: 'Drinks',
    hint_el: 'cocktails · rooftop bar · wine & spirits · μπύρα', hint_en: 'cocktails · rooftop bar · wine & spirits · beer',
    subs: [
      { key: 'cocktail_bar', label_el: 'Cocktail bar', label_en: 'Cocktail bar' },
      { key: 'wine_bar', label_el: 'Wine bar', label_en: 'Wine bar' },
      { key: 'rooftop_bar', label_el: 'Rooftop', label_en: 'Rooftop' },
      { key: 'all_day_bar', label_el: 'All-day bar', label_en: 'All-day bar' },
      { key: 'beer_bar', label_el: 'Μπυραρία', label_en: 'Beer bar' },
      { key: 'shots_bar', label_el: 'Σφηνάδικο', label_en: 'Shots bar' },
    ],
  },
  {
    key: 'food', emoji: '🍽', label_el: 'Φαγητό', label_en: 'Food',
    hint_el: 'street food · κινέζικο · brunch', hint_en: 'street food · chinese · brunch',
    subs: [
      { key: 'souvlaki', label_el: 'Σουβλάκι', label_en: 'Souvlaki' },
      { key: 'burger', label_el: 'Μπέργκερ', label_en: 'Burger' },
      { key: 'sushi', label_el: 'Σούσι', label_en: 'Sushi' },
      { key: 'italian', label_el: 'Ιταλικό', label_en: 'Italian' },
      { key: 'meze', label_el: 'Μεζεδοπωλείο', label_en: 'Meze' },
      { key: 'brunch', label_el: 'Brunch', label_en: 'Brunch' },
      { key: 'vegan', label_el: 'Vegan', label_en: 'Vegan' },
      { key: 'seafood', label_el: 'Θαλασσινά', label_en: 'Seafood' },
      { key: 'creative', label_el: 'Creative', label_en: 'Creative' },
      { key: 'street_food', label_el: 'Street food', label_en: 'Street food' },
    ],
  },
  {
    key: 'nightlife', emoji: '🎵', label_el: 'Νύχτα', label_en: 'Nightlife',
    hint_el: 'club · bar hopping · live music', hint_en: 'club · bar hopping · live music',
    subs: [
      { key: 'club', label_el: 'Club', label_en: 'Club' },
      { key: 'underground', label_el: 'Underground / Techno', label_en: 'Underground / Techno' },
      { key: 'mainstream', label_el: 'Mainstream', label_en: 'Mainstream' },
      { key: 'live_stage', label_el: 'Live stage', label_en: 'Live stage' },
      { key: 'bouzoukia', label_el: 'Μπουζούκια', label_en: 'Bouzoukia' },
      { key: 'disco', label_el: 'Disco / Retro', label_en: 'Disco / Retro' },
    ],
  },
  {
    key: 'show', emoji: '🎬', label_el: 'Διασκέδαση', label_en: 'Entertainment',
    hint_el: 'stand-up comedy · σινεμά · θέατρο', hint_en: 'stand-up comedy · cinema · theatre',
    subs: [
      { key: 'stand_up', label_el: 'Stand-up', label_en: 'Stand-up' },
      { key: 'live_music', label_el: 'Live μουσική', label_en: 'Live music' },
      { key: 'theatre', label_el: 'Θέατρο', label_en: 'Theatre' },
      { key: 'cinema', label_el: 'Σινεμά', label_en: 'Cinema' },
      { key: 'performance', label_el: 'Performance', label_en: 'Performance' },
    ],
  },
  {
    key: 'chill', emoji: '☕', label_el: 'Χαλαρά', label_en: 'Chill',
    hint_el: 'καφές · γλυκό · τσάι', hint_en: 'coffee · dessert · tea',
    subs: [
      { key: 'specialty_coffee', label_el: 'Specialty καφέ', label_en: 'Specialty coffee' },
      { key: 'all_day_cafe', label_el: 'All-day café', label_en: 'All-day café' },
      { key: 'dessert', label_el: 'Γλυκό', label_en: 'Dessert' },
      { key: 'tea', label_el: 'Τσάι / Brunch', label_en: 'Tea / Brunch' },
    ],
  },
  {
    key: 'activity', emoji: '🎯', label_el: 'Δραστηριότητα', label_en: 'Activity',
    hint_el: 'bowling · escape room · επιτραπέζια', hint_en: 'bowling · escape room · board games',
    subs: [
      { key: 'escape_room', label_el: 'Escape room', label_en: 'Escape room' },
      { key: 'bowling', label_el: 'Bowling', label_en: 'Bowling' },
      { key: 'board_games', label_el: 'Board games', label_en: 'Board games' },
      { key: 'billiards', label_el: 'Μπιλιάρδο', label_en: 'Billiards' },
      { key: 'karting', label_el: 'Καρτ', label_en: 'Karting' },
      { key: 'arcade', label_el: 'Mini golf / Arcade', label_en: 'Mini golf / Arcade' },
    ],
  },
  {
    key: 'art', emoji: '🎨', label_el: 'Τέχνη & Κουλτούρα', label_en: 'Art & Culture',
    hint_el: 'μουσείο · art gallery · βιβλιοπωλείο / reading', hint_en: 'museum · art gallery · bookstore / reading',
    subs: [
      { key: 'museum', label_el: 'Μουσείο', label_en: 'Museum' },
      { key: 'art_gallery', label_el: 'Art Gallery', label_en: 'Art Gallery' },
      { key: 'bookstore', label_el: 'Βιβλιοπωλείο / Reading', label_en: 'Bookstore / Reading' },
    ],
  },
  {
    key: 'wellness', emoji: '🌿', label_el: 'Ευεξία', label_en: 'Wellness',
    hint_el: 'sunset spot · yoga / meditation · θαλάσσιο μπάνιο · βόλτα στη φύση', hint_en: 'sunset spot · yoga / meditation · sea swim · nature walk',
    subs: [
      { key: 'sunset_spot', label_el: 'Sunset Spot', label_en: 'Sunset Spot' },
      { key: 'yoga', label_el: 'Yoga / Meditation', label_en: 'Yoga / Meditation' },
      { key: 'sea_swim', label_el: 'Θαλάσσιο Μπάνιο', label_en: 'Sea Swim' },
      { key: 'nature_walk', label_el: 'Βόλτα στη Φύση', label_en: 'Nature Walk' },
    ],
  },
] as const

export type SpotCategory = (typeof SPOT_CATEGORIES)[number]['key']
export type SpotSubKey = (typeof SPOT_CATEGORIES)[number]['subs'][number]['key']
export type SpotCategoryDef = (typeof SPOT_CATEGORIES)[number]
export type SpotSubDef = { key: string; label_el: string; label_en: string }

export const SPOT_CATEGORY_KEYS: SpotCategory[] = SPOT_CATEGORIES.map(c => c.key)

const CATEGORY_BY_KEY: Record<string, SpotCategoryDef> = Object.fromEntries(SPOT_CATEGORIES.map(c => [c.key, c]))

// Subcategory keys are unique across ALL categories (live_stage vs live_music),
// so one flat lookup is enough.
const SUB_BY_KEY: Record<string, SpotSubDef & { category: SpotCategory }> = Object.fromEntries(
  SPOT_CATEGORIES.flatMap(c => c.subs.map(s => [s.key, { ...s, category: c.key }])),
)

const pick = (lang: string, el: string, en: string) => (lang === 'en' ? en : el)

export function isSpotCategory(value: unknown): value is SpotCategory {
  return typeof value === 'string' && Object.hasOwn(CATEGORY_BY_KEY, value)
}

export function isSpotSub(value: unknown): value is SpotSubKey {
  return typeof value === 'string' && Object.hasOwn(SUB_BY_KEY, value)
}

export function spotCategoryDef(key: string): SpotCategoryDef | undefined {
  return isSpotCategory(key) ? CATEGORY_BY_KEY[key] : undefined
}

export function spotCategoryLabel(key: string | null | undefined, lang: string): string {
  if (!key) return ''
  const def = spotCategoryDef(key)
  return def ? pick(lang, def.label_el, def.label_en) : key
}

/** Subcategories offered for one category. */
export function subsOf(category: string): readonly SpotSubDef[] {
  return spotCategoryDef(category)?.subs ?? []
}

/** Subcategories offered for a set of categories, in category order. */
export function subsOfCategories(categories: readonly string[]): SpotSubDef[] {
  const seen = new Set<string>()
  const out: SpotSubDef[] = []
  for (const c of categories) {
    for (const s of subsOf(c)) {
      if (!seen.has(s.key)) { seen.add(s.key); out.push(s) }
    }
  }
  return out
}

/** Category a subcategory key belongs to. */
export function subCategoryOf(sub: string): SpotCategory | undefined {
  return SUB_BY_KEY[sub]?.category
}

/** Label of a subcategory key; an unknown value is shown as it is. */
export function spotSubLabel(key: string | null | undefined, lang: string): string {
  if (!key) return ''
  const def = SUB_BY_KEY[key]
  return def ? pick(lang, def.label_el, def.label_en) : key
}

// ── Legacy values → keys ────────────────────────────────────────────────────
// Mirrors normalize_spot_sub() in the spot_categories migration: lowercase,
// strip accents, keep letters and digits only, look the result up. Keep the
// two in sync.

const SUB_ALIASES: Record<string, string> = {
  'σουβλακι': 'souvlaki', 'μπεργκερ': 'burger', 'σουσι': 'sushi', 'ιταλικο': 'italian',
  'μεζεδοπωλειο': 'meze', 'θαλασσινα': 'seafood',
  'rooftop': 'rooftop_bar', 'μπυραρια': 'beer_bar', 'σφηναδικο': 'shots_bar',
  'undergroundtechno': 'underground', 'μπουζουκια': 'bouzoukia', 'discoretro': 'disco',
  'standupcomedy': 'stand_up', 'liveμουσικη': 'live_music', 'θεατρο': 'theatre', 'σινεμα': 'cinema',
  'specialtyκαφε': 'specialty_coffee', 'γλυκο': 'dessert', 'τσαι': 'tea', 'teabrunch': 'tea', 'τσαιbrunch': 'tea',
  'boardgamecafe': 'board_games', 'μπιλιαρδο': 'billiards', 'καρτ': 'karting', 'minigolfarcade': 'arcade',
  'μουσειο': 'museum', 'βιβλιοπωλειο': 'bookstore', 'bookstorereading': 'bookstore',
  'yogameditation': 'yoga', 'θαλασσια': 'sea_swim', 'φυση': 'nature_walk',
}

// Every key also matches itself without underscores ('streetfood', 'alldaybar').
const SUB_LOOKUP: Record<string, string> = {
  ...Object.fromEntries(Object.keys(SUB_BY_KEY).map(k => [k.replace(/_/g, ''), k])),
  ...SUB_ALIASES,
}

/**
 * Converts a stored or typed subcategory ('μεζεδοπωλείο', 'Cocktail bar',
 * 'meze') to its key. `category` only matters for 'live stage' (show →
 * live_music, anything else → live_stage). An unknown value comes back exactly
 * as it was given, so callers can tell it is not on the list.
 */
export function normalizeSpotSub(raw: string | null | undefined, category?: string | null): string | null {
  if (raw == null) return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (Object.hasOwn(SUB_BY_KEY, trimmed)) return trimmed
  const c = trimmed
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9α-ω]/g, '')
  if (c === 'livestage') return category === 'show' ? 'live_music' : 'live_stage'
  return Object.hasOwn(SUB_LOOKUP, c) ? SUB_LOOKUP[c] : raw
}

// ── Reading a spot ──────────────────────────────────────────────────────────

type SpotTaxonomy = {
  category?: string | null
  categories?: readonly string[] | null
  subcategory?: string | null
  subcategories?: readonly string[] | null
}

/** Primary category: first of categories, else the legacy single column. */
export function primaryCategory(spot: SpotTaxonomy): SpotCategory | null {
  const first = spot.categories?.[0] ?? spot.category
  return isSpotCategory(first) ? first : null
}

/** Every category of the spot, primary first. */
export function spotCategoriesOf(spot: SpotTaxonomy): SpotCategory[] {
  const list = (spot.categories ?? []).filter(isSpotCategory)
  if (list.length) return list
  return isSpotCategory(spot.category) ? [spot.category] : []
}

export function spotSubcategoriesOf(spot: SpotTaxonomy): string[] {
  const list = (spot.subcategories ?? []).filter(s => typeof s === 'string' && s)
  if (list.length) return [...list]
  const legacy = normalizeSpotSub(spot.subcategory, spot.category)
  return legacy ? [legacy] : []
}

export function spotInCategory(spot: SpotTaxonomy, category: string): boolean {
  return spotCategoriesOf(spot).includes(category as SpotCategory)
}

/** The spot's subcategories that belong to one category. */
export function spotSubsInCategory(spot: SpotTaxonomy, category: string): string[] {
  return spotSubcategoriesOf(spot).filter(s => subCategoryOf(s) === category)
}

/**
 * The one subcategory label a card shows: the first subcategory that belongs
 * to the primary category, otherwise the first one. Null when there is none.
 */
export function primarySubLabel(spot: SpotTaxonomy, lang: string): string | null {
  const subs = spotSubcategoriesOf(spot)
  if (!subs.length) return null
  const primary = primaryCategory(spot)
  const key = subs.find(s => subCategoryOf(s) === primary) ?? subs[0]
  return spotSubLabel(key, lang) || null
}

// ── Picking (wizard, admin) ─────────────────────────────────────────────────
// Pure state transitions shared by every picker, so the 3 + 3 limits, the
// "primary = first" rule and the "a subcategory needs its category" rule live
// in one place.

export type TaxonomyPick = { categories: SpotCategory[]; subcategories: string[] }

/** Add or remove a category. Removing one also drops its subcategories. A 4th pick is ignored. */
export function toggleSpotCategory(state: TaxonomyPick, key: SpotCategory): TaxonomyPick {
  if (state.categories.includes(key)) {
    const categories = state.categories.filter(c => c !== key)
    const subcategories = state.subcategories.filter(s => {
      const owner = subCategoryOf(s)
      return owner != null && categories.includes(owner)
    })
    return { categories, subcategories }
  }
  if (state.categories.length >= MAX_SPOT_CATEGORIES) return state
  return { ...state, categories: [...state.categories, key] }
}

/** Move a picked category to the front: it becomes the primary one. */
export function makePrimaryCategory(state: TaxonomyPick, key: SpotCategory): TaxonomyPick {
  if (!state.categories.includes(key)) return state
  return { ...state, categories: [key, ...state.categories.filter(c => c !== key)] }
}

/** Add or remove a subcategory. Only subcategories of a picked category can be added; a 4th is ignored. */
export function toggleSpotSub(state: TaxonomyPick, key: string): TaxonomyPick {
  if (state.subcategories.includes(key)) {
    return { ...state, subcategories: state.subcategories.filter(s => s !== key) }
  }
  const owner = subCategoryOf(key)
  if (!owner || !state.categories.includes(owner)) return state
  if (state.subcategories.length >= MAX_SPOT_SUBCATEGORIES) return state
  return { ...state, subcategories: [...state.subcategories, key] }
}

// ── Validation (API, admin, wizard) ─────────────────────────────────────────

export type TaxonomyInput = {
  categories?: unknown
  category?: unknown
  subcategories?: unknown
  subcategory?: unknown
}

/** The four columns, ready to write. category/subcategory mirror the first element. */
export type TaxonomyFields = {
  categories: SpotCategory[]
  category: SpotCategory
  subcategories: string[]
  subcategory: string | null
}

export type TaxonomyCheck =
  | { ok: true; fields: TaxonomyFields | null }
  | { ok: false; error: string }

const CATEGORY_ERROR = `Category must be one of: ${SPOT_CATEGORY_KEYS.join(', ')}`

/**
 * Checks what a client sent for categories/subcategories and returns the exact
 * columns to write. Accepts the new arrays or the legacy single
 * category/subcategory (a single value becomes a one-element list; the legacy
 * subcategory spelling is converted to its key). `categories` wins when both
 * are sent.
 *
 *  - required (default true): a category must be present (create).
 *  - not required (edit): when neither category nor categories is sent, the
 *    result is `fields: null` and nothing should be written. If only
 *    subcategories are sent they are checked against `existingCategories`.
 *
 * Rules: 1–3 categories from the list, at most 3 subcategories, each
 * subcategory belonging to one of the chosen categories, no duplicates (they
 * are dropped).
 */
export function validateSpotTaxonomy(
  input: TaxonomyInput,
  opts: { required?: boolean; existingCategories?: readonly string[] } = {},
): TaxonomyCheck {
  const required = opts.required !== false

  const subsSent = input.subcategories !== undefined || input.subcategory !== undefined

  let rawCats: unknown[]
  if (input.categories != null) {
    if (!Array.isArray(input.categories)) return { ok: false, error: 'categories must be a list' }
    rawCats = input.categories
  } else if (input.category != null) {
    rawCats = [input.category]
  } else if (required) {
    return { ok: false, error: CATEGORY_ERROR }
  } else if (!subsSent) {
    return { ok: true, fields: null }
  } else {
    rawCats = [...(opts.existingCategories ?? [])]
  }

  const categories: SpotCategory[] = []
  for (const c of rawCats) {
    const key = typeof c === 'string' ? c.trim().toLowerCase() : ''
    if (!isSpotCategory(key)) return { ok: false, error: CATEGORY_ERROR }
    if (!categories.includes(key)) categories.push(key)
  }
  if (categories.length === 0) return { ok: false, error: CATEGORY_ERROR }
  if (categories.length > MAX_SPOT_CATEGORIES) {
    return { ok: false, error: `Pick at most ${MAX_SPOT_CATEGORIES} categories` }
  }

  // Edit sending only categories (old clients): the existing subcategories
  // cannot be re-checked here, so they are cleared rather than left dangling.
  const rawSubsInput = input.subcategories !== undefined ? input.subcategories : input.subcategory
  let rawSubs: unknown[]
  if (rawSubsInput == null || rawSubsInput === '') rawSubs = []
  else if (Array.isArray(rawSubsInput)) rawSubs = rawSubsInput
  else if (typeof rawSubsInput === 'string') rawSubs = [rawSubsInput]
  else return { ok: false, error: 'subcategories must be a list' }

  // 'live stage' means live_music only when show is chosen without nightlife.
  const hint = categories.includes('show') && !categories.includes('nightlife') ? 'show' : categories[0]
  const subcategories: string[] = []
  for (const s of rawSubs) {
    if (typeof s !== 'string') return { ok: false, error: 'subcategories must be a list of text' }
    if (!s.trim()) continue
    const key = normalizeSpotSub(s, hint)
    const owner = key ? subCategoryOf(key) : undefined
    if (!key || !owner || !categories.includes(owner)) {
      return { ok: false, error: `Subcategory "${s}" is not in the list for ${categories.join(', ')}` }
    }
    if (!subcategories.includes(key)) subcategories.push(key)
  }
  if (subcategories.length > MAX_SPOT_SUBCATEGORIES) {
    return { ok: false, error: `Pick at most ${MAX_SPOT_SUBCATEGORIES} subcategories` }
  }

  return {
    ok: true,
    fields: {
      categories,
      category: categories[0],
      subcategories,
      subcategory: subcategories[0] ?? null,
    },
  }
}
