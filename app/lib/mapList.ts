// Order of the list view of /map. With a position: nearest first. Without: events
// by time (the night runs from 06:00, so 01:00 comes after 23:00), then venues,
// then wellness, each by name. Pure, so scripts/test-map-list.mjs can load it in Node.

import type { MapPoint } from './mapFilters.ts'
import { haversineKm, type LatLng } from './mapNear.ts'
import { timeToMinutes, NIGHT_START_MINUTES } from './athensTime.ts'

export type ListEntry = { point: MapPoint; distanceKm: number | null }

const KIND_ORDER: Record<MapPoint['kind'], number> = { event: 0, spot: 1, wellness: 2 }
const byName = (a: MapPoint, b: MapPoint) => a.name.localeCompare(b.name, 'el')

function nightMinutes(p: MapPoint): number {
  const m = timeToMinutes(p.event?.time)
  if (m == null) return Number.MAX_SAFE_INTEGER
  return m < NIGHT_START_MINUTES ? m + 1440 : m
}

export function sortForList(points: readonly MapPoint[], here: LatLng | null): ListEntry[] {
  const entries: ListEntry[] = points.map(point => ({ point, distanceKm: here ? haversineKm(here, point) : null }))
  entries.sort((a, b) => {
    if (here && a.distanceKm !== null && b.distanceKm !== null) {
      return a.distanceKm - b.distanceKm || byName(a.point, b.point)
    }
    const k = KIND_ORDER[a.point.kind] - KIND_ORDER[b.point.kind]
    if (k) return k
    if (a.point.kind === 'event') return nightMinutes(a.point) - nightMinutes(b.point) || byName(a.point, b.point)
    return byName(a.point, b.point)
  })
  return entries
}
