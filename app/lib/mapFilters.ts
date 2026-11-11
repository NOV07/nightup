// Pure logic of the public map: what a point is, how the three groups (Events,
// Spots, Wellness), the date and the status filter narrow the points, and how
// all of it is saved in the URL. No React and no runtime imports except small
// pure modules, so scripts/test-map-filters.mjs can load it in plain Node.
//
// Groups
//   Events    a night (see athensTime.ts) x event type x music genre.
//             Inside one row: OR. Between the two rows: AND.
//   Spots     status (all / open / closed), then categories and subcategories.
//             No category selected -> every spot; several -> OR; inside one
//             category, if some of its subcategories are on, a spot must carry
//             one of them. «Ευεξία» is not a Spots category (it has its own group),
//             so a spot that also has it is filtered by its other categories.
//   Wellness  its four subcategories (OR). No date, no hours: always there.
// No layer is on at first: the map opens empty and the user lights the groups (the dot of each
// one). A group that is off keeps its filters, and picking a filter in it lights it.
// The picked night only matters to Events and to the open/closed status of Spots.

import {
  SPOT_CATEGORIES, SPOT_CATEGORY_KEYS, isSpotCategory, isSpotSub, subCategoryOf, type SpotCategory,
} from './spotCategories.ts'
import { GENRE_KEYS, normalizeGenre } from './genres.ts'
import { isDateKey } from './dateKey.ts'
import { eventInNight, nightOf, clampNight, statusMoment } from './athensTime.ts'
import { spotStatusAt, type SpotStatus } from './openingHours.ts'

import { EVENT_TYPES, type EventType } from './eventTypes.ts'
export { EVENT_TYPES, type EventType }

export type GroupKey = 'events' | 'spots' | 'wellness'
export const GROUPS: readonly GroupKey[] = ['events', 'spots', 'wellness']

export type SpotStatusFilter = 'all' | 'open' | 'closed'

export type MapPoint = {
  /** 'wellness' = wellness_spots row, 'spot' = a venue from spots, 'event' = an event with a confirmed pin. */
  kind: 'wellness' | 'spot' | 'event'
  id: string
  slug: string
  name: string
  /** Neighbourhood / area, shown under the name. */
  area: string | null
  lat: number
  lng: number
  /** Primary category first. A wellness point is always ['wellness']. An event has none. */
  categories: SpotCategory[]
  subcategories: string[]
  description: string | null
  /** Wellness only. */
  accessNote: string | null
  verifiedNight: boolean
  /** First photo, or null (the card shows a placeholder). */
  image: string | null
  /** Events only (slug is then the event id). */
  event?: {
    date: string
    time: string | null
    venue: string | null
    type: EventType
    /** Genre keys (app/lib/genres.ts), may be empty. */
    genres: string[]
    /** Picked for Nightup Radar by the admin (events.is_radar_pick). */
    radar: boolean
  }
  /** Spots only: the published opening hours (day name -> text), or null. */
  hours?: Record<string, string> | null
}

export type MapFilters = {
  /** Groups whose layer is on (what the map draws). Empty by default: an empty map. */
  shown: GroupKey[]
  /** The picked night (YYYY-MM-DD); null = tonight, whatever the clock says. */
  night: string | null
  evTypes: EventType[]
  /** Genre keys. */
  evGenres: string[]
  spotStatus: SpotStatusFilter
  /** Spots categories (never wellness). */
  categories: SpotCategory[]
  /** Subcategory keys of the selected spots categories. */
  subcategories: string[]
  /** Wellness subcategory keys. */
  wellnessSubs: string[]
}

export const NO_FILTERS: MapFilters = {
  shown: [], night: null, evTypes: [], evGenres: [], spotStatus: 'all', categories: [], subcategories: [], wellnessSubs: [],
}

/** The categories a Spots filter can pick: all of them but wellness. */
export const SPOT_FILTER_CATEGORIES: SpotCategory[] = SPOT_CATEGORY_KEYS.filter(c => c !== 'wellness')

/** True when any filter of a group is on (the date and the lit layers do not count). */
export const hasGroupFilters = (f: MapFilters, g: GroupKey): boolean =>
  g === 'events' ? f.evTypes.length > 0 || f.evGenres.length > 0
  : g === 'spots' ? f.spotStatus !== 'all' || f.categories.length > 0 || f.subcategories.length > 0
  : f.wellnessSubs.length > 0

export const hasFilters = (f: MapFilters): boolean => GROUPS.some(g => hasGroupFilters(f, g))

// ── Normalising ─────────────────────────────────────────────────────────────

type Raw = {
  shown?: readonly string[]
  night?: unknown
  evTypes?: readonly string[]
  evGenres?: readonly string[]
  spotStatus?: unknown
  categories?: readonly string[]
  subcategories?: readonly string[]
  wellnessSubs?: readonly string[]
}

/** Drops what cannot stand (unknown keys, duplicates, subs whose category is off) and puts the rest in display order. */
export function normalizeFilters(input: Raw): MapFilters {
  const shownSet = new Set(input.shown ?? [])
  const shown = GROUPS.filter(g => shownSet.has(g))

  const typeSet = new Set(input.evTypes ?? [])
  const evTypes = EVENT_TYPES.filter(t => typeSet.has(t))

  const genreSet = new Set<string>()
  for (const g of input.evGenres ?? []) { const k = normalizeGenre(g); if (k) genreSet.add(k) }
  const evGenres = GENRE_KEYS.filter(k => genreSet.has(k)) as string[]

  const spotStatus: SpotStatusFilter = input.spotStatus === 'open' || input.spotStatus === 'closed' ? input.spotStatus : 'all'

  const wanted = new Set((input.categories ?? []).filter(isSpotCategory))
  const categories = SPOT_FILTER_CATEGORIES.filter(c => wanted.has(c))
  const subs = new Set<string>()
  for (const s of input.subcategories ?? []) {
    if (!isSpotSub(s)) continue
    const owner = subCategoryOf(s)
    if (owner && owner !== 'wellness' && categories.includes(owner)) subs.add(s)
  }
  // Grouped by category (display order), so the same filters always give the same URL.
  const subcategories = categories.flatMap(c => [...subs].filter(k => subCategoryOf(k) === c))

  const wsWanted = new Set((input.wellnessSubs ?? []).filter(s => isSpotSub(s) && subCategoryOf(s) === 'wellness'))
  const wellnessSubs = wellnessSubKeys().filter(k => wsWanted.has(k))

  return { shown, night: isDateKey(input.night) ? input.night : null, evTypes, evGenres, spotStatus, categories, subcategories, wellnessSubs }
}

/** The wellness subcategory keys in display order. */
export function wellnessSubKeys(): string[] {
  return SPOT_CATEGORIES.find(c => c.key === 'wellness')?.subs.map(s => s.key) ?? []
}

// ── Toggles (every one returns normalised filters) ──────────────────────────

const flip = <T,>(list: readonly T[], v: T): T[] => (list.includes(v) ? list.filter(x => x !== v) : [...list, v])

/** The layer of a group on or off (the dot). Its filters are kept. */
export function toggleGroupShown(f: MapFilters, g: GroupKey): MapFilters {
  return normalizeFilters({ ...f, shown: flip(f.shown, g) })
}
export function showGroup(f: MapFilters, g: GroupKey): MapFilters {
  return f.shown.includes(g) ? f : normalizeFilters({ ...f, shown: [...f.shown, g] })
}
// Picking a filter in a group lights it; taking one off, or choosing «all», changes nothing about the layer.
/**
 * A tap on the NAME of a group: its panel opens or closes, and opening it lights the group if it is off.
 * Closing the panel leaves the group as it is (it never turns a layer off). The dot is the only way to
 * switch a layer off; see toggleGroupShown.
 */
export function toggleGroupPanel(f: MapFilters, open: GroupKey | null, g: GroupKey): { filters: MapFilters; open: GroupKey | null } {
  if (open === g) return { filters: f, open: null }
  return { filters: showGroup(f, g), open: g }
}
export const toggleEventType = (f: MapFilters, t: EventType): MapFilters => {
  const n = normalizeFilters({ ...f, evTypes: flip(f.evTypes, t) })
  return n.evTypes.length > f.evTypes.length ? showGroup(n, 'events') : n
}
export const toggleEventGenre = (f: MapFilters, k: string): MapFilters => {
  const n = normalizeFilters({ ...f, evGenres: flip(f.evGenres, k) })
  return n.evGenres.length > f.evGenres.length ? showGroup(n, 'events') : n
}
export const setSpotStatus = (f: MapFilters, s: SpotStatusFilter): MapFilters => {
  const n = normalizeFilters({ ...f, spotStatus: s })
  return n.spotStatus !== 'all' ? showGroup(n, 'spots') : n
}
export const toggleWellnessSub = (f: MapFilters, k: string): MapFilters => {
  const n = normalizeFilters({ ...f, wellnessSubs: flip(f.wellnessSubs, k) })
  return n.wellnessSubs.length > f.wellnessSubs.length ? showGroup(n, 'wellness') : n
}
export const setNight = (f: MapFilters, night: string | null): MapFilters => normalizeFilters({ ...f, night })

/** Selecting a Spots category on/off. Turning one off also drops its subcategories. */
export function toggleMapCategory(f: MapFilters, key: SpotCategory): MapFilters {
  const n = normalizeFilters({ ...f, categories: flip(f.categories, key) })
  return n.categories.length > f.categories.length ? showGroup(n, 'spots') : n
}

/** Selecting a subcategory on/off. Selecting one also selects its category. */
export function toggleMapSub(f: MapFilters, key: string): MapFilters {
  const owner = subCategoryOf(key)
  if (!owner || owner === 'wellness') return f
  if (f.subcategories.includes(key)) return normalizeFilters({ ...f, subcategories: f.subcategories.filter(s => s !== key) })
  return showGroup(normalizeFilters({ ...f, categories: [...f.categories, owner], subcategories: [...f.subcategories, key] }), 'spots')
}

/** "Clear" of one group: its filters go, nothing else changes (it does not light the group). */
export function clearGroupFilters(f: MapFilters, g: GroupKey): MapFilters {
  if (g === 'events') return { ...f, evTypes: [], evGenres: [] }
  if (g === 'spots') return { ...f, spotStatus: 'all', categories: [], subcategories: [] }
  return { ...f, wellnessSubs: [] }
}

/** Every filter off. The lit layers and the picked night stay: clearing never lights a group. */
export const clearAllFilters = (f: MapFilters): MapFilters => ({ ...NO_FILTERS, shown: f.shown, night: f.night })

// ── Which points show ───────────────────────────────────────────────────────

/** Is a spot with these categories / subcategories matched by the Spots category filter? */
export function pointMatches(p: Pick<MapPoint, 'categories' | 'subcategories'>, f: Pick<MapFilters, 'categories' | 'subcategories'>): boolean {
  if (f.categories.length === 0) return true
  return f.categories.some(c => {
    if (!p.categories.includes(c)) return false
    const chosen = f.subcategories.filter(s => subCategoryOf(s) === c)
    return chosen.length === 0 || chosen.some(s => p.subcategories.includes(s))
  })
}

export function filterPoints<T extends Pick<MapPoint, 'categories' | 'subcategories'>>(points: readonly T[], f: Pick<MapFilters, 'categories' | 'subcategories'>): T[] {
  return points.filter(p => pointMatches(p, f))
}

/** The night in force and the moment spots are judged at; see athensTime.ts. */
export type MapContext = { night: string; tonight: string; moment: { date: string; minutes: number } }

/** `picked` null = tonight. A picked night is kept inside tonight .. tonight + 60. */
export function mapContext(picked: string | null, now: Date): MapContext {
  const tonight = nightOf(now)
  const night = picked == null ? tonight : clampNight(picked, now)
  return { night, tonight, moment: statusMoment(night, now) }
}

export const eventMatches = (p: MapPoint, f: MapFilters, ctx: Pick<MapContext, 'night'>): boolean => {
  const e = p.event
  if (p.kind !== 'event' || !e) return false
  if (!eventInNight(e, ctx.night)) return false
  if (f.evTypes.length && !f.evTypes.includes(e.type)) return false
  if (f.evGenres.length && !e.genres.some(g => f.evGenres.includes(g))) return false
  return true
}

export const spotStatusOf = (p: MapPoint, ctx: Pick<MapContext, 'moment'>): SpotStatus =>
  spotStatusAt(p.hours, ctx.moment.date, ctx.moment.minutes)

export type Resolved = {
  /** What the map draws: the points of the lit groups that pass their filters. */
  visible: MapPoint[]
  /** Open / closed / unknown of every spot (all spots, not only the visible ones). */
  status: Record<string, SpotStatus>
  /** Points per group with the current filters, whether the layer is lit or not (what lighting it would show). */
  counts: Record<GroupKey, number>
}

export function resolvePoints(points: readonly MapPoint[], f: MapFilters, ctx: MapContext): Resolved {
  const visible: MapPoint[] = []
  const status: Record<string, SpotStatus> = {}
  const counts: Record<GroupKey, number> = { events: 0, spots: 0, wellness: 0 }
  for (const p of points) {
    let ok = false
    let group: GroupKey
    if (p.kind === 'event') {
      group = 'events'
      ok = eventMatches(p, f, ctx)
    } else if (p.kind === 'wellness') {
      group = 'wellness'
      ok = f.wellnessSubs.length === 0 || f.wellnessSubs.some(s => p.subcategories.includes(s))
    } else {
      group = 'spots'
      const st = spotStatusOf(p, ctx)
      status[p.id] = st
      ok = pointMatches(p, f) && (f.spotStatus === 'all' || st === f.spotStatus)
    }
    if (!ok) continue
    counts[group]++
    if (f.shown.includes(group)) visible.push(p)
  }
  return { visible, status, counts }
}

// ── URL ─────────────────────────────────────────────────────────────────────
//   ?show=events,spots  &c=drink,food  &s=cocktail_bar  &ws=yoga  &et=music  &eg=techno,house
//   &st=open|closed  &date=2026-11-13   (+ ?open=events, read only)
// `show` is what is lit. Nothing is written for the default (an empty map, no filter, tonight).
// A link that carries filters but no `show` (every link made before the empty default, and the
// buttons of /events and /spots) lights the groups its filters belong to, so it still opens on
// what it points at. `show=` with no value means "filters set, nothing lit".
// Old links keep working: ?c=wellness&s=yoga (wellness was a category) turns into the Wellness
// filter, ?events=1 lights Events and opens its panel, and ?hide=… (the previous scheme) is ignored.

const list = (v: string | null | undefined) => (v ? v.split(',').map(x => x.trim()).filter(Boolean) : [])

type Params = { get(name: string): string | null }

export function parseFilters(params: Params): MapFilters {
  const rawC = list(params.get('c'))
  const rawS = list(params.get('s'))
  const ws = [...list(params.get('ws'))]

  // Legacy: «wellness» used to be a category. Its subcategories move to Wellness.
  if (rawC.includes('wellness')) {
    for (const s of rawS) if (isSpotSub(s) && subCategoryOf(s) === 'wellness') ws.push(s)
  }

  const filters = normalizeFilters({
    night: params.get('date'),
    evTypes: list(params.get('et')),
    evGenres: list(params.get('eg')),
    spotStatus: params.get('st'),
    categories: rawC.filter(c => c !== 'wellness'),
    subcategories: rawS,
    wellnessSubs: ws,
  })

  const show = params.get('show')
  if (show !== null) return normalizeFilters({ ...filters, shown: list(show) })

  // No `show`: an older link, or a button. Light what it filters (and what it names).
  const lit: GroupKey[] = GROUPS.filter(g => hasGroupFilters(filters, g))
  if (params.get('events') === '1' && !lit.includes('events')) lit.push('events')
  if (rawC.includes('wellness') && !lit.includes('wellness')) lit.push('wellness')
  return normalizeFilters({ ...filters, shown: lit })
}

/** Which group's panel the link wants open (?open=events, or the old ?events=1). */
export function parseOpenGroup(params: Params): GroupKey | null {
  const o = params.get('open')
  if (o === 'events' || o === 'spots' || o === 'wellness') return o
  return params.get('events') === '1' ? 'events' : null
}

/** Query string (without '?'), empty when everything is at its default. */
export function serializeFilters(f: MapFilters): string {
  const n = normalizeFilters(f)
  const parts: string[] = []
  if (n.categories.length) parts.push(`c=${n.categories.join(',')}`)
  if (n.subcategories.length) parts.push(`s=${n.subcategories.join(',')}`)
  if (n.wellnessSubs.length) parts.push(`ws=${n.wellnessSubs.join(',')}`)
  if (n.evTypes.length) parts.push(`et=${n.evTypes.join(',')}`)
  if (n.evGenres.length) parts.push(`eg=${n.evGenres.join(',')}`)
  if (n.spotStatus !== 'all') parts.push(`st=${n.spotStatus}`)
  if (n.shown.length) parts.push(`show=${n.shown.join(',')}`)
  else if (hasFilters(n)) parts.push('show=')
  if (n.night) parts.push(`date=${n.night}`)
  return parts.join('&')
}

// ── Directions ──────────────────────────────────────────────────────────────

export const directionsUrl = (lat: number, lng: number) =>
  `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
