// Pure logic of the events layer of /map: which events become a point and how a
// row turns into one. No React, no Supabase, so scripts/test-map-filters.mjs can
// load it in plain Node.

import type { MapPoint } from './mapFilters.ts'
import { inRange } from './mapsCoords.ts'
import { normalizeGenre } from './genres.ts'

export type EventType = 'music' | 'culture' | 'sports' | 'other'

/**
 * The map's event type of a stored `events.type`: music, culture, sports and
 * other as they are; anything else, or null, is 'other'.
 *
 * TODO(decision pending): the organiser form still offers legacy values such
 * as 'Club Night' and 'Live Show'. Whether those rows exist in production and
 * should count as 'music' waits for the distribution of events.type; when it
 * is known, that mapping goes here and nowhere else.
 */
export function eventTypeOf(raw: unknown): EventType {
  return raw === 'music' || raw === 'culture' || raw === 'sports' || raw === 'other' ? raw : 'other'
}

/** Genre keys of an event, legacy spellings converted, unknown values dropped, no duplicates. */
export function eventGenresOf(row: { genres?: unknown; genre?: unknown }): string[] {
  const raw = Array.isArray(row.genres) && row.genres.length ? row.genres : row.genre ? [row.genre] : []
  const keys: string[] = []
  for (const g of raw) {
    const k = typeof g === 'string' ? normalizeGenre(g) : null
    if (k && !keys.includes(k)) keys.push(k)
  }
  return keys
}

export type EventPointRow = {
  id: unknown
  title?: unknown
  date?: unknown
  time?: unknown
  venue?: unknown
  city?: unknown
  lat?: unknown
  lng?: unknown
  type?: unknown
  genres?: unknown
  genre?: unknown
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

/**
 * The map point of an event, or null when it must not be on the map: no (or
 * invalid) coordinates, no id/title, or a date outside `window` (YYYY-MM-DD,
 * both ends included; see eventLoadWindow). Which night is shown is decided in
 * the browser. Status is checked by the query (approved only).
 */
export function eventToPoint(row: EventPointRow, window: { from: string; to: string }, image: string | null): MapPoint | null {
  if (!isNum(row.lat) || !isNum(row.lng) || !inRange(row.lat, row.lng)) return null
  if (typeof row.date !== 'string') return null
  const date = row.date.slice(0, 10)
  if (date < window.from || date > window.to) return null
  if (row.id == null || typeof row.title !== 'string' || !row.title.trim()) return null
  return {
    kind: 'event',
    id: `e-${row.id}`,
    slug: String(row.id),
    name: row.title,
    area: typeof row.city === 'string' && row.city ? row.city : null,
    lat: row.lat,
    lng: row.lng,
    categories: [],
    subcategories: [],
    description: null,
    accessNote: null,
    verifiedNight: false,
    image,
    event: {
      date,
      time: typeof row.time === 'string' && row.time ? row.time : null,
      venue: typeof row.venue === 'string' && row.venue ? row.venue : null,
      type: eventTypeOf(row.type),
      genres: eventGenresOf(row),
    },
  }
}
