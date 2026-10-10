// Fallback geocoding for Google Maps links whose final URL carries no
// coordinates (`/maps/place/<name>, <address>/data=!1s0x…`). The address
// text in the path goes to OpenStreetMap Nominatim. Server-only: it reads
// NOMINATIM_USER_AGENT. Only erasable TS syntax, so the .mjs tests import it.
//
// Nominatim usage policy: at most 1 request/second for the whole server, an
// identifying User-Agent, no bulk use or autocomplete, results cached.

export const NOMINATIM_ENDPOINT = 'https://nominatim.openstreetmap.org/search'
export const NOMINATIM_MIN_INTERVAL_MS = 1100
export const NOMINATIM_TIMEOUT_MS = 5000
export const NOMINATIM_CACHE_TTL_MS = 24 * 60 * 60 * 1000
const CACHE_MAX = 500
// Callers beyond this wait in no queue: they get no result instead.
const QUEUE_MAX = 5

export interface PlaceText {
  /** The cleaned text from the link, e.g. `Τσιπουράδικο Tam Tiririm, Ag. Anargiron 6, Nea Ionia 142 31`. */
  text: string
  /** Business name, or null when the link holds an address only. */
  name: string | null
  /** Address parts without the name and without the postcode. */
  addressParts: string[]
  /** Greek postcode as written (`142 31`), or null. */
  postcode: string | null
}

const POSTCODE = /\b(\d{3})\s?(\d{2})\b/
// "Veaki 25", "Ag. Anargiron 6", "Λεωφ. Συγγρού 120Α", "Ermou 10-12"
const STREET_WITH_NUMBER = /^[^\d,]*\p{L}[^\d,]*\s\d+(?:\s?[-–]\s?\d+)?\s?\p{L}?$/u
const ONLY_COORDS = /^\s*-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?\s*$/

/**
 * Text of the `/maps/place/<…>/` segment of an expanded Maps URL, split into
 * name / address / postcode. `+` becomes a space, «» and quotes are dropped,
 * the `@lat,lng` and `data=!1s0x…:0x…` segments are ignored. Returns null
 * without `/place/`, or when the segment is just "lat,lng" (those links are
 * already resolved from the URL).
 */
export function extractPlaceText(finalUrl: string): PlaceText | null {
  let path: string
  try { path = new URL(finalUrl).pathname } catch { return null }
  const m = path.match(/\/maps\/place\/([^/]+)/)
  if (!m) return null

  let raw = m[1].replace(/\+/g, ' ')
  try { raw = decodeURIComponent(raw) } catch { /* malformed escapes: keep as is */ }
  const text = raw.replace(/[«»"“”]/g, '').replace(/\s+/g, ' ').trim()
  if (!text || ONLY_COORDS.test(text)) return null

  const parts = text.split(',').map(p => p.trim()).filter(Boolean)
  const pc = text.match(POSTCODE)
  const postcode = pc ? `${pc[1]} ${pc[2]}` : null

  const hasName = parts.length > 1 && !STREET_WITH_NUMBER.test(parts[0])
  const name = hasName ? parts[0] : null
  const addressParts = (hasName ? parts.slice(1) : parts)
    .map(p => p.replace(POSTCODE, '').replace(/\s+/g, ' ').trim())
    .filter(Boolean)

  // A single part that is not an address ("Some Bar") leaves nothing to look up.
  if (!hasName && parts.length === 1 && !STREET_WITH_NUMBER.test(parts[0])) {
    return { text, name: parts[0], addressParts: [], postcode }
  }
  return { text, name, addressParts, postcode }
}

export type Precision = 'street' | 'building'

export interface GeocodeHit {
  lat: number
  lng: number
  precision: Precision
  /** True when the link had no postcode, so the area could not be checked. */
  unverified: boolean
}

interface NominatimRow {
  lat: string
  lon: string
  category?: string
  type?: string
  addresstype?: string
  address?: { postcode?: string; house_number?: string }
}

// Results coarser than a street (suburb, city, postcode area…) are not a
// place for a pin, so they are dropped like a postcode mismatch.
const STREET_TYPES = new Set(['road'])
const COARSE_TYPES = new Set([
  'country', 'state', 'region', 'province', 'county', 'municipality', 'city', 'town', 'village',
  'hamlet', 'suburb', 'quarter', 'neighbourhood', 'city_district', 'district', 'borough',
  'postcode', 'island', 'islet', 'continent',
])

/** 'building' for a house, building or POI; 'street' for a road; null when coarser. */
export function precisionOf(row: { category?: string; type?: string; addresstype?: string }): Precision | null {
  const kind = row.addresstype ?? ''
  if (row.category === 'highway' || STREET_TYPES.has(kind)) return 'street'
  if (COARSE_TYPES.has(kind) || row.category === 'boundary' || (row.category === 'place' && row.type !== 'house')) return null
  return 'building'
}

const normPostcode = (s: string | undefined) => (s ?? '').replace(/\s+/g, '')

// ── Global 1 req/s queue + 24h cache (in-memory, per server instance) ──────
let chain: Promise<unknown> = Promise.resolve()
let lastRequestAt = 0
let pending = 0
const cache = new Map<string, { at: number; rows: NominatimRow[] | null }>()

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

function throttled<T>(fn: () => Promise<T>): Promise<T> | null {
  if (pending >= QUEUE_MAX) return null
  pending++
  const run = chain.then(async () => {
    const wait = lastRequestAt + NOMINATIM_MIN_INTERVAL_MS - Date.now()
    if (wait > 0) await sleep(wait)
    lastRequestAt = Date.now()
    return fn()
  })
  chain = run.catch(() => undefined).finally(() => { pending-- })
  return run
}

export function resetNominatimState(): void {
  chain = Promise.resolve()
  lastRequestAt = 0
  pending = 0
  cache.clear()
}

type FetchLike = (input: string, init: RequestInit) => Promise<Response>

export interface GeocodeOptions {
  fetchImpl?: FetchLike
  userAgent?: string
}

/** One Nominatim search, through the queue and the cache. null on failure. */
async function search(params: Record<string, string>, opts: Required<GeocodeOptions>): Promise<NominatimRow[] | null> {
  const qs = new URLSearchParams({
    ...params,
    format: 'jsonv2', limit: '3', countrycodes: 'gr', 'accept-language': 'el', addressdetails: '1',
  })
  const key = qs.toString()
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < NOMINATIM_CACHE_TTL_MS) return hit.rows

  const job = throttled(async () => {
    const res = await opts.fetchImpl(`${NOMINATIM_ENDPOINT}?${key}`, {
      method: 'GET',
      signal: AbortSignal.timeout(NOMINATIM_TIMEOUT_MS),
      headers: { 'user-agent': opts.userAgent, 'accept-language': 'el' },
    })
    if (!res.ok) { try { await res.body?.cancel() } catch { /* ignore */ } return null }
    const body = await res.json()
    return Array.isArray(body) ? body as NominatimRow[] : null
  })
  if (!job) return null

  let rows: NominatimRow[] | null
  try { rows = await job } catch { return null }
  // Failures are not cached, so a timeout does not stick for 24 hours.
  if (rows) {
    cache.set(key, { at: Date.now(), rows })
    if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value as string)
  }
  return rows
}

function pick(rows: NominatimRow[] | null, postcode: string | null): GeocodeHit | null {
  for (const r of rows ?? []) {
    const lat = parseFloat(r.lat), lng = parseFloat(r.lon)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
    const precision = precisionOf(r)
    if (!precision) continue
    if (postcode && normPostcode(r.address?.postcode) !== normPostcode(postcode)) continue
    return { lat, lng, precision, unverified: !postcode }
  }
  return null
}

/**
 * Address-only lookup (names never matched in testing). Free-text query first;
 * when nothing passes the postcode filter, one structured search. At most two
 * requests per call. A result from another postcode is never returned.
 */
export async function geocodeNominatim(place: PlaceText, options: GeocodeOptions = {}): Promise<GeocodeHit | null> {
  const userAgent = options.userAgent ?? process.env.NOMINATIM_USER_AGENT ?? ''
  if (!userAgent) return null
  const opts = { fetchImpl: options.fetchImpl ?? fetch, userAgent }
  if (place.addressParts.length === 0) return null

  const first = pick(await search({ q: place.addressParts.join(', ') }, opts), place.postcode)
  if (first) return first

  const street = place.addressParts[0]
  const city = place.addressParts.length > 1 ? place.addressParts[place.addressParts.length - 1] : ''
  if (!city && !place.postcode) return null
  const structured: Record<string, string> = { street, country: 'gr' }
  if (city) structured.city = city
  if (place.postcode) structured.postalcode = place.postcode
  return pick(await search(structured, opts), place.postcode)
}
