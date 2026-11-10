// Pure logic of the events layer of /map: which events become a point and how a
// row turns into one. No React, no Supabase, so scripts/test-map-filters.mjs can
// load it in plain Node.

import type { MapPoint } from './mapFilters.ts'
import { inRange } from './mapsCoords.ts'

/** Today as YYYY-MM-DD from LOCAL date parts, like app/events/page.tsx (a UTC date would cut off today's events). */
export function localToday(now: Date = new Date()): string {
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${m}-${d}`
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
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

/**
 * The map point of an event, or null when it must not be on the map: no (or
 * invalid) coordinates, no id/title, or a date before `today` (YYYY-MM-DD).
 * Status is checked by the query (approved only).
 */
export function eventToPoint(row: EventPointRow, today: string, image: string | null): MapPoint | null {
  if (!isNum(row.lat) || !isNum(row.lng) || !inRange(row.lat, row.lng)) return null
  if (typeof row.date !== 'string' || row.date.slice(0, 10) < today) return null
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
      date: row.date.slice(0, 10),
      time: typeof row.time === 'string' && row.time ? row.time : null,
      venue: typeof row.venue === 'string' && row.venue ? row.venue : null,
    },
  }
}
