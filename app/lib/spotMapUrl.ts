// Google Maps link for a spot's "open in maps" button. Pure, erasable TS only,
// so scripts/test-spot-map-url.mjs can run it under plain Node.

const BASE = 'https://www.google.com/maps/search/?api=1&query='

export interface SpotMapInput {
  name?: string | null
  address?: string | null
  city?: string | null
  lat?: number | null
  lng?: number | null
}

const clean = (s?: string | null) => (s ?? '').trim()

// A scheme, or a Google/short-link host, anywhere in the text. An address that
// holds a pasted link is not an address, so the whole value is dropped.
const URL_IN_TEXT = /(?:https?:\/\/|\b(?:maps\.app\.goo\.gl|goo\.gl|(?:[\w-]+\.)*google\.[a-z.]+)(?:[/?#:\s]|$))/i

export const containsUrl = (s?: string | null) => URL_IN_TEXT.test(s ?? '')

/**
 * A text query (name + address + city, whatever exists) opens the place card;
 * bare coordinates only drop an empty pin, so they are the last resort.
 * Without an address the query is name + city. Returns null when nothing usable.
 */
export function spotMapUrl(spot: SpotMapInput): string | null {
  const name = clean(spot.name)
  const address = containsUrl(spot.address) ? '' : clean(spot.address)
  const city = clean(spot.city)
  const parts = (address ? [name, address, city] : [name, city]).filter(Boolean)
  if (name || address) return BASE + encodeURIComponent(parts.join(' '))
  if (typeof spot.lat === 'number' && typeof spot.lng === 'number'
    && Number.isFinite(spot.lat) && Number.isFinite(spot.lng)) {
    return `${BASE}${spot.lat},${spot.lng}`
  }
  return null
}
