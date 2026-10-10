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
 * Pulls coordinates out of an expanded Google Maps URL, most precise first:
 *   1. `!3d<lat>!4d<lng>`  the place itself (path or `data=`)
 *   2. `@<lat>,<lng>`      the viewport centre
 *   3. `q=` / `ll=` / `query=` holding a "lat,lng" pair
 * Out-of-range pairs are skipped, so a bad pattern falls through to the next.
 */
export function extractCoords(url: string): Coords | null {
  let s = url
  try { s = decodeURIComponent(url) } catch { /* malformed escapes: use the raw string */ }

  const place = s.match(new RegExp(`!3d(${NUM})!4d(${NUM})`))
  if (place) {
    const c = pair(place[1], place[2])
    if (c) return c
  }

  const at = s.match(new RegExp(`@(${NUM}),(${NUM})`))
  if (at) {
    const c = pair(at[1], at[2])
    if (c) return c
  }

  let params: URLSearchParams | null = null
  try { params = new URL(url).searchParams } catch { /* not an absolute URL */ }
  if (params) {
    for (const key of ['q', 'll', 'query']) {
      const v = params.get(key)
      const m = v?.match(new RegExp(`^\\s*(${NUM})\\s*,\\s*(${NUM})\\s*$`))
      if (m) {
        const c = pair(m[1], m[2])
        if (c) return c
      }
    }
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
