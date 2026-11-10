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
// A group can be hidden (its layer is off) without losing its filters.
// The picked night only matters to Events and to the open/closed status of Spots.

import {
  SPOT_CATEGORIES, SPOT_CATEGORY_KEYS, isSpotCategory, isSpotSub, subCategoryOf, type SpotCategory,
} from './spotCategories.ts'
import { GENRE_KEYS, normalizeGenre } from './genres.ts'
import { isDateKey } from './dateKey.ts'
import { eventInNight, nightOf, clampNight, statusMoment } from './athensTime.ts'
import { spotStatusAt, type SpotStatus } from './openingHours.ts'

export type EventType = 'music' | 'culture' | 'sports' | 'other'
export const EVENT_TYPES: readonly EventType[] = ['music', 'culture', 'sports', 'other']

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
  }
  /** Spots only: the published opening hours (day name -> text), or null. */
  hours?: Record<string, string> | null
}

export type MapFilters = {
  /** Groups whose layer is off. */
  hidden: GroupKey[]
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
  hidden: [], night: null, evTypes: [], evGenres: [], spotStatus: 'all', categories: [], subcategories: [], wellnessSubs: [],
}

/** The categories a Spots filter can pick: all of them but wellness. */
export const SPOT_FILTER_CATEGORIES: SpotCategory[] = SPOT_CATEGORY_KEYS.filter(c => c !== 'wellness')

/** True when any filter of a group is on (the date and the hidden layers do not count). */
export const hasGroupFilters = (f: MapFilters, g: GroupKey): boolean =>
  g === 'events' ? f.evTypes.length > 0 || f.evGenres.length > 0
  : g === 'spots' ? f.spotStatus !== 'all' || f.categories.length > 0 || f.subcategories.length > 0
  : f.wellnessSubs.length > 0

export const hasFilters = (f: MapFilters): boolean => GROUPS.some(g => hasGroupFilters(f, g))

// ── Normalising ─────────────────────────────────────────────────────────────

type Raw = {
  hidden?: readonly string[]
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
  const hiddenSet = new Set(input.hidden ?? [])
  const hidden = GROUPS.filter(g => hiddenSet.has(g))

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

  return { hidden, night: isDateKey(input.night) ? input.night : null, evTypes, evGenres, spotStatus, categories, subcategories, wellnessSubs }
}

/** The wellness subcategory keys in display order. */
export function wellnessSubKeys(): string[] {
  return SPOT_CATEGORIES.find(c => c.key === 'wellness')?.subs.map(s => s.key) ?? []
}

// ── Toggles (every one returns normalised filters) ──────────────────────────

const flip = <T,>(list: readonly T[], v: T): T[] => (list.includes(v) ? list.filter(x => x !== v) : [...list, v])

export function toggleGroupHidden(f: MapFilters, g: GroupKey): MapFilters {
  return normalizeFilters({ ...f, hidden: flip(f.hidden, g) })
}
export function showGroup(f: MapFilters, g: GroupKey): MapFilters {
  return normalizeFilters({ ...f, hidden: f.hidden.filter(x => x !== g) })
}
export const toggleEventType = (f: MapFilters, t: EventType): MapFilters => normalizeFilters({ ...f, evTypes: flip(f.evTypes, t) })
export const toggleEventGenre = (f: MapFilters, k: string): MapFilters => normalizeFilters({ ...f, evGenres: flip(f.evGenres, k) })
export const setSpotStatus = (f: MapFilters, s: SpotStatusFilter): MapFilters => normalizeFilters({ ...f, spotStatus: s })
export const toggleWellnessSub = (f: MapFilters, k: string): MapFilters => normalizeFilters({ ...f, wellnessSubs: flip(f.wellnessSubs, k) })
export const setNight = (f: MapFilters, night: string | null): MapFilters => normalizeFilters({ ...f, night })

/** Selecting a Spots category on/off. Turning one off also drops its subcategories. */
export function toggleMapCategory(f: MapFilters, key: SpotCategory): MapFilters {
  return normalizeFilters({ ...f, categories: flip(f.categories, key) })
}

/** Selecting a subcategory on/off. Selecting one also selects its category. */
export function toggleMapSub(f: MapFilters, key: string): MapFilters {
  const owner = subCategoryOf(key)
  if (!owner || owner === 'wellness') return f
  if (f.subcategories.includes(key)) return normalizeFilters({ ...f, subcategories: f.subcategories.filter(s => s !== key) })
  return normalizeFilters({ ...f, categories: [...f.categories, owner], subcategories: [...f.subcategories, key] })
}

/** "Clear" of one group: its filters go, nothing else changes. */
export function clearGroupFilters(f: MapFilters, g: GroupKey): MapFilters {
  if (g === 'events') return { ...f, evTypes: [], evGenres: [] }
  if (g === 'spots') return { ...f, spotStatus: 'all', categories: [], subcategories: [] }
  return { ...f, wellnessSubs: [] }
}

/** Everything off: all layers, no filters. The picked night stays. */
export const clearAllFilters = (f: MapFilters): MapFilters => ({ ...NO_FILTERS, night: f.night })

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
  /** What the map draws: the points of the visible groups that pass their filters. */
  visible: MapPoint[]
  /** Open / closed / unknown of every spot (all spots, not only the visible ones). */
  status: Record<string, SpotStatus>
  /** Points per group with the current filters, whether the layer is on or off. */
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
    if (!f.hidden.includes(group)) visible.push(p)
  }
  return { visible, status, counts }
}

// ── URL ─────────────────────────────────────────────────────────────────────
//   ?c=drink,food  &s=cocktail_bar  &ws=yoga  &et=music  &eg=techno,house
//   &st=open|closed  &hide=spots,wellness  &date=2026-11-13   (+ ?open=events, read only)
// Nothing is written for a default: all layers on, no filter, tonight.
// Old links keep working: ?c=wellness&s=yoga (wellness was a category) turns
// into the Wellness filter, and ?events=1 opens the Events panel.

const list = (v: string | null | undefined) => (v ? v.split(',').map(x => x.trim()).filter(Boolean) : [])

type Params = { get(name: string): string | null }

export function parseFilters(params: Params): MapFilters {
  const rawC = list(params.get('c'))
  const rawS = list(params.get('s'))
  let hidden = list(params.get('hide'))
  const ws = [...list(params.get('ws'))]

  // Legacy: «wellness» used to be a category. Its subcategories move to Wellness;
  // when it was the only category, the old view showed just that, so Spots go off.
  if (rawC.includes('wellness')) {
    for (const s of rawS) if (isSpotSub(s) && subCategoryOf(s) === 'wellness') ws.push(s)
    if (rawC.every(c => c === 'wellness')) hidden = [...hidden, 'spots']
  }

  const st = params.get('st')
  return normalizeFilters({
    hidden,
    night: params.get('date'),
    evTypes: list(params.get('et')),
    evGenres: list(params.get('eg')),
    spotStatus: st,
    categories: rawC.filter(c => c !== 'wellness'),
    subcategories: rawS,
    wellnessSubs: ws,
  })
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
  if (n.hidden.length) parts.push(`hide=${n.hidden.join(',')}`)
  if (n.night) parts.push(`date=${n.night}`)
  return parts.join('&')
}

// ── Directions ──────────────────────────────────────────────────────────────

export const directionsUrl = (lat: number, lng: number) =>
  `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
