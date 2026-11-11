// The «See them on the map» rows of /spots and /events: the link to /map that carries the filters the visitor has
// picked on the page. Built with the map's own filter code (normalizeFilters, serializeFilters), never by hand, so the
// map reads it back exactly as the page filters were. Pure: scripts/test-map-link.mjs loads it in plain Node.
//
// Only what the map has an equivalent for is passed: a category and a subcategory for Spots; the event type (the tab)
// and the music genre for Events. The city, the search text and the date of /events do not go to the map.

import { NO_FILTERS, normalizeFilters, serializeFilters, type GroupKey } from './mapFilters.ts'
import { isSpotCategory, subCategoryOf } from './spotCategories.ts'
import { EVENT_TYPES, type EventType } from './eventTypes.ts'
import { SPOT_FILTER_CATEGORIES } from './mapFilters.ts'

/** /map with only `group` shown and its filter row open, plus the group's filters. */
function mapHref(group: GroupKey, filters: Parameters<typeof normalizeFilters>[0]): string {
  const n = normalizeFilters({ ...NO_FILTERS, ...filters, shown: [group] })
  const qs = [serializeFilters(n), `open=${group}`].filter(Boolean).join('&')
  return `/map?${qs}`
}

/**
 * /spots: only the Spots group, with the category in view on the page and the subcategory picked in it. A category the
 * map has no Spots filter for (wellness) or a subcategory of another category is left out, without an error.
 */
export function spotsMapHref(category: string | null | undefined, sub: string | null | undefined): string {
  const cat = category && isSpotCategory(category) && (SPOT_FILTER_CATEGORIES as readonly string[]).includes(category) ? category : null
  const subOk = cat && sub && subCategoryOf(sub) === cat ? sub : null
  return mapHref('spots', { categories: cat ? [cat] : [], subcategories: subOk ? [subOk] : [] })
}

/**
 * /events: only the Events group, with the type of the active tab and, on the music tab, the music genre picked
 * ('All', empty and unknown genres are no filter).
 */
export function eventsMapHref(type: string | null | undefined, genre: string | null | undefined): string {
  const t = (EVENT_TYPES as readonly string[]).includes(type ?? '') ? (type as EventType) : null
  const g = t === 'music' && genre && genre !== 'All' ? genre : null
  return mapHref('events', { evTypes: t ? [t] : [], evGenres: g ? [g] : [] })
}
