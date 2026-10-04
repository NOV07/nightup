// Server-side expansion of Google Maps short links (maps.app.goo.gl, ...) into
// coordinates. This fetches a URL the user typed, so every hop is checked
// against an exact-hostname allowlist and redirects are followed by hand.
// Only erasable TS syntax, so scripts/test-maps-resolve.mjs can import it.

import { extractCoords, type Coords } from './mapsCoords.ts'

export const MAX_REDIRECTS = 5
export const REQUEST_TIMEOUT_MS = 5000
export const RATE_LIMIT_MAX = 20
export const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000

export type ResolveErrorCode =
  | 'invalid_url'
  | 'blocked_redirect'
  | 'too_many_redirects'
  | 'no_coords'
  | 'fetch_failed'

export class MapsResolveError extends Error {
  code: ResolveErrorCode
  constructor(code: ResolveErrorCode) {
    super(code)
    this.code = code
  }
}

// Exact hostnames only. No suffix or substring matching: `google.com.evil.com`
// and `maps.app.goo.gl.evil.com` must not pass.
const OPEN_HOSTS = new Set([
  'maps.app.goo.gl', 'www.google.com', 'google.com', 'maps.google.com', 'google.gr', 'www.google.gr',
])
const CONSENT_HOSTS = new Set(['consent.google.com', 'consent.google.gr'])

/** Returns the parsed URL when it may be fetched, else null. */
export function checkMapsUrl(raw: string): URL | null {
  let u: URL
  try { u = new URL(raw) } catch { return null }
  if (u.protocol !== 'https:') return null
  if (u.username || u.password) return null
  if (u.port !== '') return null // https default only; `:443` is normalised to ''
  const h = u.hostname.toLowerCase()
  if (OPEN_HOSTS.has(h)) return u
  if (h === 'goo.gl') return u.pathname === '/maps' || u.pathname.startsWith('/maps/') ? u : null
  if (h === 'g.co') return u.pathname === '/kgs' || u.pathname.startsWith('/kgs/') ? u : null
  return null
}

export interface ResolveResult extends Coords { finalUrl: string }

type FetchLike = (input: string, init: RequestInit) => Promise<Response>

/**
 * Follows `startUrl` through up to MAX_REDIRECTS redirects and returns the
 * first coordinates found in any URL on the way. Response bodies are never
 * read: the `Location` header and the URL itself are all we use.
 */
export async function resolveMapsUrl(
  startUrl: string,
  fetchImpl: FetchLike = fetch,
): Promise<ResolveResult> {
  let current = checkMapsUrl(startUrl)
  if (!current) throw new MapsResolveError('invalid_url')

  const seen = new Set<string>()
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const coords = extractCoords(current.href)
    if (coords) return { ...coords, finalUrl: current.href }
    if (seen.has(current.href)) throw new MapsResolveError('no_coords')
    seen.add(current.href)

    let res: Response
    try {
      res = await fetchImpl(current.href, {
        redirect: 'manual',
        method: 'GET',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        headers: {
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
          'accept-language': 'el,en;q=0.8',
        },
      })
    } catch {
      throw new MapsResolveError('fetch_failed')
    }
    // Drop the body unread; it is never needed and never returned.
    try { await res.body?.cancel() } catch { /* ignore */ }

    if (res.status < 300 || res.status >= 400) throw new MapsResolveError('no_coords')

    const location = res.headers.get('location')
    if (!location) throw new MapsResolveError('no_coords')
    if (hop === MAX_REDIRECTS) throw new MapsResolveError('too_many_redirects')

    let next: URL
    try { next = new URL(location, current) } catch { throw new MapsResolveError('blocked_redirect') }

    // consent.google.*?continue=<original url>: unwrap and re-check `continue`.
    if (next.protocol === 'https:' && CONSENT_HOSTS.has(next.hostname.toLowerCase())) {
      const cont = next.searchParams.get('continue')
      const target = cont ? checkMapsUrl(cont) : null
      if (!target) throw new MapsResolveError('blocked_redirect')
      next = target
    }

    const allowed = checkMapsUrl(next.href)
    if (!allowed) throw new MapsResolveError('blocked_redirect')
    current = allowed
  }
  throw new MapsResolveError('too_many_redirects')
}

// ── Per-user rate limit (in-memory; per server instance) ──────────────────
const hits = new Map<string, number[]>()

/** True when the call is allowed. Records the attempt. */
export function takeRateLimit(userId: string, now = Date.now()): boolean {
  const recent = (hits.get(userId) ?? []).filter(t => now - t < RATE_LIMIT_WINDOW_MS)
  if (recent.length >= RATE_LIMIT_MAX) {
    hits.set(userId, recent)
    return false
  }
  recent.push(now)
  hits.set(userId, recent)
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (!v.some(t => now - t < RATE_LIMIT_WINDOW_MS)) hits.delete(k)
  }
  return true
}

export function resetRateLimit(): void { hits.clear() }

