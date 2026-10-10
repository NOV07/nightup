// Pure helpers for Google Maps URLs. No imports and only erasable TS syntax, so
// the browser bundle, the API route and scripts/test-maps-resolve.mjs (plain
// Node, no network) all share one implementation.

export interface Coords { lat: number; lng: number }

const NUM = '-?\\d+(?:\\.\\d+)?'

export function inRange(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng)
    && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
}

function pair(a: string, b: string): Coords | null {
  const lat = parseFloat(a)
  const lng = parseFloat(b)
  return inRange(lat, lng) ? { lat, lng } : null
}

/** Rough bounding box of Greece. A UI warning only, never a rejection. */
export function isInGreece(lat: number, lng: number): boolean {
  return lat >= 34 && lat <= 42 && lng >= 19 && lng <= 30
}

export type CoordsCheck =
  | { ok: true; lat: number; lng: number; inGreece: boolean }
  | { ok: false }

/**
 * Validates coordinates coming from a client or a geocoder: real numbers in
 * [-90,90] / [-180,180]. Outside Greece is only flagged (`inGreece: false`),
 * never rejected.
 */
export function validateCoords(lat: unknown, lng: unknown): CoordsCheck {
  if (typeof lat !== 'number' || typeof lng !== 'number') return { ok: false }
  if (!inRange(lat, lng)) return { ok: false }
  return { ok: true, lat, lng, inGreece: isInGreece(lat, lng) }
}

/**
 * Coordinate check for a spot write. Returns an error message, or null when
 * the payload may be saved.
 *   required    lat and lng must both be valid numbers (create).
 *   allowEmpty  lat and lng may both be null (admin edit of an old spot with
 *               no pin); otherwise null is rejected, so an edit cannot wipe
 *               the `geo` column by accident.
 * A payload without lat/lng keys (and not `required`) leaves them untouched.
 */
export function spotCoordsError(
  body: Record<string, unknown>,
  { required = false, allowEmpty = false }: { required?: boolean; allowEmpty?: boolean } = {},
): string | null {
  const hasLat = 'lat' in body, hasLng = 'lng' in body
  if (!required && !hasLat && !hasLng) return null
  if (allowEmpty && !required && body.lat == null && body.lng == null) return null
  if (body.lat == null || body.lng == null) return 'Missing coordinates: put a pin on the map'
  if (!validateCoords(body.lat, body.lng).ok) return 'Invalid coordinates: lat must be in [-90, 90] and lng in [-180, 180]'
  return null
}

/**
 * 'exact'     the place itself, as Google stores it.
 * 'viewport'  only the centre of the map the user was looking at (`@lat,lng`),
 *             which can be hundreds of metres off; the UI asks for a check.
 */
export type CoordsPrecision = 'exact' | 'viewport'
export interface PlaceCoords extends Coords { precision: CoordsPrecision }

/**
 * Coordinates from a Google Maps URL. The one parser for both the wizard
 * (full links, parsed in the browser) and /api/maps/resolve (short links,
 * after expansion). Most precise first:
 *   1. `!3d<lat>!4d<lng>`   the place; the pair inside `!8m2` wins, else the first
 *   2. `?q=` / `?ll=` / `?query=` holding "lat,lng"
 *   3. `/place/<lat>,<lng>`  a dropped pin
 *   4. `@<lat>,<lng>`        the viewport centre, only when nothing above exists
 * Out-of-range pairs are skipped, so a bad pattern falls through to the next.
 */
export function extractCoords(url: string): PlaceCoords | null {
  let s = url
  try { s = decodeURIComponent(url) } catch { /* malformed escapes: use the raw string */ }
  const exact = (c: Coords | null): PlaceCoords | null => (c ? { ...c, precision: 'exact' } : null)

  const inPlace = s.match(new RegExp(`!8m2!3d(${NUM})!4d(${NUM})`))
  const placeCoords = inPlace && pair(inPlace[1], inPlace[2])
  if (placeCoords) return exact(placeCoords)
  for (const m of s.matchAll(new RegExp(`!3d(${NUM})!4d(${NUM})`, 'g'))) {
    const c = pair(m[1], m[2])
    if (c) return exact(c)
  }

  let params: URLSearchParams | null = null
  try { params = new URL(url).searchParams } catch { /* not an absolute URL */ }
  if (params) {
    for (const key of ['q', 'll', 'query']) {
      const v = params.get(key)
      const m = v?.match(new RegExp(`^\\s*(${NUM})\\s*,\\s*(${NUM})\\s*$`))
      if (m) {
        const c = pair(m[1], m[2])
        if (c) return exact(c)
      }
    }
  }

  const pin = s.match(new RegExp(`/place/(${NUM})\\s*,\\s*(${NUM})(?=[/?#]|$)`))
  if (pin) {
    const c = pair(pin[1], pin[2])
    if (c) return exact(c)
  }

  const at = s.match(new RegExp(`@(${NUM}),(${NUM})`))
  if (at) {
    const c = pair(at[1], at[2])
    if (c) return { ...c, precision: 'viewport' }
  }
  return null
}

/** First http(s) URL in pasted text. Share sheets often prepend the place name. */
export function firstUrl(text: string): string | null {
  const m = text.match(/https?:\/\/[^\s<>"']+/i)
  return m ? m[0] : null
}

/** Mobile-app share links, which carry no coordinates themselves. */
export function isShortMapsLink(text: string): boolean {
  const raw = firstUrl(text)
  if (!raw) return false
  let u: URL
  try { u = new URL(raw) } catch { return false }
  if (u.protocol !== 'https:') return false
  const h = u.hostname.toLowerCase()
  if (h === 'maps.app.goo.gl') return true
  if (h === 'goo.gl') return u.pathname === '/maps' || u.pathname.startsWith('/maps/')
  if (h === 'g.co') return u.pathname === '/kgs' || u.pathname.startsWith('/kgs/')
  return false
}
