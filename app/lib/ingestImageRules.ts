/**
 * Shared rules for pulling an externally hosted image into our own Storage
 * bucket.
 *
 * Deliberately import-free: `scripts/fix-external-images.mjs` loads this module
 * directly under Node's TypeScript type-stripping, so the batch script and the
 * admin write path stay on one definition of "is this URL already ours" instead
 * of two copies that drift apart.
 */

/** Bucket that event covers live in — the same one `/api/events/upload` writes to. */
export const IMAGE_BUCKET = 'events'

/** content-type -> extension, for the formats we are willing to re-host. */
export const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
}

export const MAX_IMAGE_BYTES = 15 * 1024 * 1024
export const FETCH_TIMEOUT_MS = 20_000

/** Browsers get served these posters fine, while a bare fetch UA gets a 403
 *  from some WordPress/Cloudflare setups, so introduce ourselves like one. */
const USER_AGENT = 'Mozilla/5.0 (compatible; NightupImageIngest/1.0; +https://nightup.gr)'

export type UrlVerdict = { ingest: true } | { ingest: false; reason: string }

/** Host of our own Supabase project, or null when the env var is missing. */
export function storageHost(): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base) return null
  try {
    return new URL(base).host.toLowerCase()
  } catch {
    return null
  }
}

export function isOwnStorageUrl(url: string): boolean {
  const own = storageHost()
  if (!own) return false
  try {
    return new URL(url).host.toLowerCase() === own
  } catch {
    return false
  }
}

/**
 * Loopback / private / link-local literals, so an admin-supplied URL cannot be
 * aimed at something only the server can reach.
 *
 * Takes a `URL.hostname`, never a `URL.host`: the latter carries the port, which
 * stops every one of the address patterns below from matching.
 */
function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[/, '').replace(/\]$/, '')
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')) return true

  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h)
  if (v4) {
    const a = Number(v4[1])
    const b = Number(v4[2])
    if (a === 0 || a === 10 || a === 127 || a >= 224) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    if (a === 169 && b === 254) return true
  }
  if (h === '::' || h === '::1') return true
  if (/^f[cd][0-9a-f]{2}:/.test(h)) return true // fc00::/7 unique-local
  if (/^fe[89ab][0-9a-f]:/.test(h)) return true // fe80::/10 link-local
  return false
}

/**
 * Whether `url` should be downloaded and re-hosted. Anything we already serve
 * ourselves, inline data, and site-relative paths are left exactly as they are.
 */
export function classifyImageUrl(url: string | null | undefined): UrlVerdict {
  if (!url || !url.trim()) return { ingest: false, reason: 'empty' }
  const trimmed = url.trim()
  if (trimmed.startsWith('data:')) return { ingest: false, reason: 'data-uri' }
  if (trimmed.startsWith('/')) return { ingest: false, reason: 'relative-path' }

  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    return { ingest: false, reason: 'unparseable-url' }
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { ingest: false, reason: `unsupported-protocol:${parsed.protocol}` }
  }
  if (isPrivateHost(parsed.hostname)) return { ingest: false, reason: 'private-host' }
  if (isOwnStorageUrl(trimmed)) return { ingest: false, reason: 'already-ours' }
  return { ingest: true }
}

/** A content-type header can lie; the first bytes are harder to fake by
 *  accident, and this is what keeps an HTML error page out of the bucket. */
function sniffExtension(bytes: Uint8Array): string | null {
  if (bytes.length < 12) return null
  const ascii = (start: number, text: string) => {
    for (let i = 0; i < text.length; i++) {
      if (bytes[start + i] !== text.charCodeAt(i)) return false
    }
    return true
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpg'
  if (bytes[0] === 0x89 && ascii(1, 'PNG')) return 'png'
  if (ascii(0, 'GIF8')) return 'gif'
  if (ascii(0, 'RIFF') && ascii(8, 'WEBP')) return 'webp'
  if (ascii(4, 'ftyp')) return 'avif'
  return null
}

export type FetchImageResult =
  | { ok: true; bytes: Uint8Array; contentType: string; ext: string }
  | { ok: false; error: string }

/**
 * Downloads a remote image, refusing anything that is not plausibly an image in
 * a format we accept and of a size we are willing to store.
 */
export async function fetchRemoteImage(url: string): Promise<FetchImageResult> {
  let res: Response
  try {
    res = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { 'User-Agent': USER_AGENT, Accept: 'image/*,*/*;q=0.8' },
    })
  } catch (err) {
    return { ok: false, error: `fetch failed: ${err instanceof Error ? err.message : String(err)}` }
  }

  if (!res.ok) return { ok: false, error: `HTTP ${res.status}` }

  // A redirect can land somewhere the original host check never saw.
  if (res.url && res.url !== url) {
    const after = classifyImageUrl(res.url)
    if (!after.ingest && after.reason !== 'already-ours') {
      return { ok: false, error: `redirected to ${after.reason}` }
    }
  }

  const contentType = (res.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase()
  if (!ALLOWED_IMAGE_TYPES[contentType]) {
    return { ok: false, error: `unsupported content-type: ${contentType || 'none'}` }
  }

  let bytes: Uint8Array
  try {
    bytes = new Uint8Array(await res.arrayBuffer())
  } catch (err) {
    return { ok: false, error: `read failed: ${err instanceof Error ? err.message : String(err)}` }
  }

  if (bytes.length === 0) return { ok: false, error: 'empty body' }
  if (bytes.length > MAX_IMAGE_BYTES) {
    const mb = (bytes.length / 1024 / 1024).toFixed(1)
    return { ok: false, error: `too large: ${mb}MB > ${MAX_IMAGE_BYTES / 1024 / 1024}MB` }
  }

  const sniffed = sniffExtension(bytes)
  if (!sniffed) return { ok: false, error: `body is not a recognised image (declared ${contentType})` }

  // Trust the bytes over the header when the two disagree.
  return { ok: true, bytes, contentType, ext: sniffed }
}

/**
 * Storage key for an ingested image. Keeps a readable slice of the source
 * filename for debugging, ASCII-only because Storage keys with Greek characters
 * are a needless source of encoding bugs, and prefixed with a timestamp plus
 * random suffix so two posters both named `poster.jpg` never collide.
 */
export function storageKeyFor(sourceUrl: string, ext: string): string {
  let base = 'image'
  try {
    const last = new URL(sourceUrl).pathname.split('/').filter(Boolean).pop() ?? ''
    const decoded = decodeURIComponent(last).replace(/\.[a-z0-9]+$/i, '')
    const ascii = decoded
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '')
      .slice(0, 60)
    if (ascii) base = ascii
  } catch {
    // keep the default
  }
  return `external/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${base}.${ext}`
}

/** Public URL for a key in one of our public buckets. */
export function publicStorageUrl(bucket: string, key: string): string {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/$/, '')
  return `${base}/storage/v1/object/public/${bucket}/${key}`
}
