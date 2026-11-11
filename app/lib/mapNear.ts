// "Near me" on /map: distances, the radius filter and the URL part (?near=1&r=3).
// Pure functions, so scripts/test-map-near.mjs can load them in plain Node.
// The user's position is NEVER part of the URL or of any stored state: the URL
// only says that the mode is on and which radius is picked. The coordinates live
// in React state of the page for as long as the mode is on.

export type NearRadius = 1 | 3 | 5 | 'all'
export const NEAR_RADII: readonly NearRadius[] = [1, 3, 5, 'all']
export const DEFAULT_NEAR_RADIUS: NearRadius = 3

/** Farther than this from every point of the map = the person is not in the area the map covers. */
export const FAR_FROM_DATA_KM = 100

export type NearState = { on: boolean; radius: NearRadius }
export const NO_NEAR: NearState = { on: false, radius: DEFAULT_NEAR_RADIUS }

export type LatLng = { lat: number; lng: number }

type Params = { get(name: string): string | null }

/** `?near=1&r=1|3|5|all`. Anything else is off / the default radius. */
export function parseNear(params: Params): NearState {
  const on = params.get('near') === '1'
  const r = params.get('r')
  const radius: NearRadius = r === 'all' ? 'all' : r === '1' ? 1 : r === '3' ? 3 : r === '5' ? 5 : DEFAULT_NEAR_RADIUS
  return { on, radius }
}

/** `near=1&r=3`, or '' when the mode is off. Takes no coordinates, so none can be written. */
export const serializeNear = (n: NearState): string => (n.on ? `near=1&r=${n.radius}` : '')

/** Query strings glued with `&`, empty parts left out. */
export const joinQuery = (...parts: string[]): string => parts.filter(Boolean).join('&')

const rad = (d: number) => (d * Math.PI) / 180

/** Great-circle distance in km (haversine). */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * 6371.0088 * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** The points within `radius` km of `center` ('all' keeps every point). */
export function filterByRadius<T extends LatLng>(points: readonly T[], center: LatLng, radius: NearRadius): T[] {
  if (radius === 'all') return [...points]
  return points.filter(p => haversineKm(center, p) <= radius)
}

/** Distance to the closest point, or null when there are none. */
export function nearestDistanceKm(points: readonly LatLng[], center: LatLng): number | null {
  let best: number | null = null
  for (const p of points) {
    const d = haversineKm(center, p)
    if (best === null || d < best) best = d
  }
  return best
}

export const isFarFromData = (points: readonly LatLng[], center: LatLng): boolean => {
  const d = nearestDistanceKm(points, center)
  return d !== null && d > FAR_FROM_DATA_KM
}

/** "850 m" under a kilometre (rounded to 10 m), else "1,2 km". */
export function formatDistance(km: number, units: { km: string; m: string }, locale: string): string {
  if (km < 1) return `${Math.max(10, Math.round((km * 1000) / 10) * 10)} ${units.m}`
  return `${km.toLocaleString(locale, { maximumFractionDigits: 1, minimumFractionDigits: km < 10 ? 1 : 0 })} ${units.km}`
}
