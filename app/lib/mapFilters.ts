// Pure logic of the public map: what a point is, how the filters narrow the
// points, how they are saved in the URL. No React and no runtime imports except
// the category list, so scripts/test-map-filters.mjs can load it in plain Node.
//
// Filter rules:
//  * no category selected  -> every point shows;
//  * several categories    -> OR between them (a point shows if it matches ANY);
//  * inside one category, if some of its subcategories are selected, a point
//    must carry at least one of them (OR); with none selected, the whole
//    category shows.
// A point with several categories matches as soon as ONE of them matches.

import {
  SPOT_CATEGORY_KEYS, isSpotCategory, isSpotSub, subCategoryOf, type SpotCategory,
} from './spotCategories.ts'

export type MapPoint = {
  /** 'wellness' = wellness_spots row, 'spot' = a venue from spots. */
  kind: 'wellness' | 'spot'
  id: string
  slug: string
  name: string
  /** Neighbourhood / area, shown under the name. */
  area: string | null
  lat: number
  lng: number
  /** Primary category first. A wellness point is always ['wellness']. */
  categories: SpotCategory[]
  subcategories: string[]
  description: string | null
  /** Wellness only. */
  accessNote: string | null
  verifiedNight: boolean
  /** First photo, or null (the card shows a placeholder). */
  image: string | null
}

export type MapFilters = {
  /** Selected categories, in display order. */
  categories: SpotCategory[]
  /** Selected subcategory keys. Each belongs to a selected category. */
  subcategories: string[]
}

export const NO_FILTERS: MapFilters = { categories: [], subcategories: [] }

export const hasFilters = (f: MapFilters) => f.categories.length > 0 || f.subcategories.length > 0

/** Drops what cannot stand: unknown keys, duplicates, subs whose category is not selected. Display order. */
export function normalizeFilters(input: { categories?: readonly string[]; subcategories?: readonly string[] }): MapFilters {
  const wanted = new Set((input.categories ?? []).filter(isSpotCategory))
  const categories = SPOT_CATEGORY_KEYS.filter(c => wanted.has(c))
  const subs = new Set<string>()
  for (const s of input.subcategories ?? []) {
    if (!isSpotSub(s)) continue
    const owner = subCategoryOf(s)
    if (owner && categories.includes(owner)) subs.add(s)
  }
  return { categories, subcategories: [...subs] }
}

/** Selecting a category on/off. Turning one off also drops its subcategories. */
export function toggleMapCategory(f: MapFilters, key: SpotCategory): MapFilters {
  const categories = f.categories.includes(key) ? f.categories.filter(c => c !== key) : [...f.categories, key]
  return normalizeFilters({ categories, subcategories: f.subcategories })
}

/** Selecting a subcategory on/off. Selecting one also selects its category. */
export function toggleMapSub(f: MapFilters, key: string): MapFilters {
  const owner = subCategoryOf(key)
  if (!owner) return f
  if (f.subcategories.includes(key)) {
    return normalizeFilters({ categories: f.categories, subcategories: f.subcategories.filter(s => s !== key) })
  }
  return normalizeFilters({ categories: [...f.categories, owner], subcategories: [...f.subcategories, key] })
}

export function pointMatches(p: Pick<MapPoint, 'categories' | 'subcategories'>, f: MapFilters): boolean {
  if (f.categories.length === 0) return true
  return f.categories.some(c => {
    if (!p.categories.includes(c)) return false
    const chosen = f.subcategories.filter(s => subCategoryOf(s) === c)
    return chosen.length === 0 || chosen.some(s => p.subcategories.includes(s))
  })
}

export function filterPoints<T extends Pick<MapPoint, 'categories' | 'subcategories'>>(points: readonly T[], f: MapFilters): T[] {
  return points.filter(p => pointMatches(p, f))
}

// ── URL: ?c=drink,wellness&s=cocktail_bar,sunset_spot ───────────────────────

const list = (v: string | null | undefined) => (v ? v.split(',').map(x => x.trim()).filter(Boolean) : [])

export function parseFilters(params: { get(name: string): string | null }): MapFilters {
  return normalizeFilters({ categories: list(params.get('c')), subcategories: list(params.get('s')) })
}

/** Query string (without '?'), empty when no filter is on. */
export function serializeFilters(f: MapFilters): string {
  const n = normalizeFilters(f)
  const parts: string[] = []
  if (n.categories.length) parts.push(`c=${n.categories.join(',')}`)
  if (n.subcategories.length) parts.push(`s=${n.subcategories.join(',')}`)
  return parts.join('&')
}

// ── Directions ──────────────────────────────────────────────────────────────

export const directionsUrl = (lat: number, lng: number) =>
  `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
