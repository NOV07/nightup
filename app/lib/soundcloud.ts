// SoundCloud URL handling for the profile Featured Track. The embed player only
// accepts soundcloud.com/artist/track, but the share button hands out
// on.soundcloud.com short links. resolveSoundcloudUrl() expands those on the
// server. It fetches a URL the user typed, so every hop is checked against an
// exact-hostname allowlist and redirects are followed by hand.
// Only erasable TS syntax, so scripts/test-soundcloud.mjs can import it.

export const MAX_REDIRECTS = 3
export const REQUEST_TIMEOUT_MS = 4000
export const RATE_LIMIT_MAX = 20
export const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000

export type SoundcloudErrorCode =
  | 'invalid_url'
  | 'blocked_redirect'
  | 'too_many_redirects'
  | 'not_embeddable'
  | 'fetch_failed'

export class SoundcloudError extends Error {
  code: SoundcloudErrorCode
  constructor(code: SoundcloudErrorCode) {
    super(code)
    this.code = code
  }
}

// Exact hostnames only. No suffix or substring matching: `soundcloud.com.evil.com`
// and `on.soundcloud.com.evil.com` must not pass.
const SHORT_HOST = 'on.soundcloud.com'
const CANONICAL_HOSTS = new Set(['soundcloud.com', 'www.soundcloud.com'])

// First path segments on soundcloud.com that are site pages, not an artist.
const RESERVED_FIRST_SEGMENTS = new Set([
  'discover', 'stream', 'you', 'search', 'upload', 'charts', 'pages', 'messages',
  'notifications', 'settings', 'feed', 'login', 'signin', 'signup', 'terms-of-use',
])

/** Returns the parsed URL when it may be fetched, else null. */
export function checkSoundcloudUrl(raw: string): URL | null {
  let u: URL
  try { u = new URL(raw) } catch { return null }
  if (u.protocol !== 'https:') return null
  if (u.username || u.password) return null
  if (u.port !== '') return null // https default only; `:443` is normalised to ''
  const h = u.hostname.toLowerCase()
  if (h === SHORT_HOST || CANONICAL_HOSTS.has(h)) return u
  return null
}

function isShortLink(u: URL): boolean {
  return u.hostname.toLowerCase() === SHORT_HOST
}

/** Strips query and fragment and normalises the host to soundcloud.com. */
function canonicalize(u: URL): string {
  const path = u.pathname.replace(/\/+$/, '')
  return `https://soundcloud.com${path}`
}

/** True when `u` is a soundcloud.com/artist/track style URL the embed player accepts. */
function isEmbeddableUrl(u: URL): boolean {
  if (!CANONICAL_HOSTS.has(u.hostname.toLowerCase())) return false
  const segments = u.pathname.split('/').filter(Boolean)
  if (segments.length < 2) return false
  return !RESERVED_FIRST_SEGMENTS.has(segments[0].toLowerCase())
}

/** True when the stored URL can be handed to the SoundCloud embed player as is. */
export function isEmbeddableSoundcloud(raw: unknown): boolean {
  if (typeof raw !== 'string') return false
  const u = checkSoundcloudUrl(raw.trim())
  return !!u && isEmbeddableUrl(u)
}

/**
 * The iframe src for a stored featured track, or null when the URL is not
 * embeddable (short link, other host, junk). Callers show a plain link instead.
 */
export function featuredTrackEmbedSrc(raw: unknown, showUser = true): string | null {
  if (!isEmbeddableSoundcloud(raw)) return null
  const url = (raw as string).trim()
  const user = showUser ? '&show_user=true&show_reposts=false&show_teaser=false' : ''
  return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23E8A020&auto_play=false&hide_related=true&show_comments=false${user}`
}

/** For the fallback link: the stored URL when it is a plain https URL, else null. */
export function safeExternalHref(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  try {
    const u = new URL(raw.trim())
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : null
  } catch {
    return null
  }
}

type FetchLike = (input: string, init: RequestInit) => Promise<Response>

/**
 * Returns the canonical soundcloud.com/artist/track URL (no query, no fragment)
 * for `input`, following on.soundcloud.com short links by hand. Response bodies
 * are never read: the `Location` header is all we use.
 */
export async function resolveSoundcloudUrl(
  input: string,
  fetchImpl: FetchLike = fetch,
): Promise<string> {
  let current = checkSoundcloudUrl(input.trim())
  if (!current) throw new SoundcloudError('invalid_url')

  const seen = new Set<string>()
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (!isShortLink(current)) {
      if (!isEmbeddableUrl(current)) throw new SoundcloudError('not_embeddable')
      return canonicalize(current)
    }
    if (seen.has(current.href)) throw new SoundcloudError('too_many_redirects')
    seen.add(current.href)
    if (hop === MAX_REDIRECTS) throw new SoundcloudError('too_many_redirects')

    let res: Response
    try {
      res = await fetchImpl(current.href, {
        redirect: 'manual',
        method: 'GET',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        headers: { 'user-agent': 'Mozilla/5.0 (compatible; NightupLinkCheck/1.0)' },
      })
    } catch {
      throw new SoundcloudError('fetch_failed')
    }
    // Drop the body unread; it is never needed and never returned.
    try { await res.body?.cancel() } catch { /* ignore */ }

    if (res.status < 300 || res.status >= 400) throw new SoundcloudError('fetch_failed')
    const location = res.headers.get('location')
    if (!location) throw new SoundcloudError('fetch_failed')

    let next: URL
    try { next = new URL(location, current) } catch { throw new SoundcloudError('blocked_redirect') }
    const allowed = checkSoundcloudUrl(next.href)
    if (!allowed) throw new SoundcloudError('blocked_redirect')
    current = allowed
  }
  throw new SoundcloudError('too_many_redirects')
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
  return true
}

export function resetRateLimit(): void { hits.clear() }
