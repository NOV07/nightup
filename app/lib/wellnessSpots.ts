// Shared rules for wellness_spots (admin API + admin UI). The allowlist and the
// checks live here so no route can write a column that is not listed.

import { MAX_SPOT_SUBCATEGORIES, spotCategoryDef } from './spotCategories.ts'

export const WELLNESS_KINDS = ['viewpoint', 'hill', 'park', 'square'] as const
export const WELLNESS_BEST_TIMES = ['day', 'sunset', 'night', 'all'] as const
export const WELLNESS_BUCKET = 'wellness-spots'
export const MAX_WELLNESS_PHOTOS = 6

/** The four Wellness subcategories (sunset_spot, yoga, sea_swim, nature_walk): the only values a wellness spot may carry. */
export const WELLNESS_SUBS = spotCategoryDef('wellness')?.subs ?? []
export const MAX_WELLNESS_SUBCATEGORIES = MAX_SPOT_SUBCATEGORIES

/** The only columns a request may write. Anything else is dropped. */
export const WELLNESS_FIELDS = [
  'name', 'slug', 'area', 'kind', 'description', 'best_time', 'has_bench',
  'access_note', 'lat', 'lng', 'coords_verified', 'verified_night',
  'photo_urls', 'subcategories', 'source_url', 'published',
] as const

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/
export const isValidSlug = (s: unknown): s is string =>
  typeof s === 'string' && s.length <= 80 && SLUG_RE.test(s)

export function photoUrlPrefix(): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${WELLNESS_BUCKET}/`
}

/** Storage path of a photo URL in our bucket, or null if it is not one of ours. */
export function photoPath(url: string): string | null {
  const prefix = photoUrlPrefix()
  return url.startsWith(prefix) ? decodeURIComponent(url.slice(prefix.length)) : null
}

type Row = Record<string, unknown>
type Result = { ok: true; row: Row } | { ok: false; error: string }

const optText = (v: unknown, max: number): string | null | undefined => {
  if (v === undefined) return undefined
  if (v === null) return null
  if (typeof v !== 'string') return undefined
  const t = v.trim()
  return t === '' ? null : t.slice(0, max)
}

/**
 * Picks the allowlisted fields out of `input` and validates each one. Only the
 * keys present in the input appear in the result, so it serves both create and
 * PATCH. The cross-field rule (published needs coordinates) is checked by the
 * caller against the merged row.
 */
export function parseWellnessInput(input: unknown): Result {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, error: 'Μη έγκυρα δεδομένα.' }
  }
  const src = input as Row
  const row: Row = {}

  if ('name' in src) {
    const n = optText(src.name, 120)
    if (!n) return { ok: false, error: 'Το όνομα είναι υποχρεωτικό.' }
    row.name = n
  }
  if ('slug' in src && src.slug !== '' && src.slug != null) {
    if (!isValidSlug(src.slug)) {
      return { ok: false, error: 'Το slug πρέπει να έχει μόνο λατινικά πεζά, αριθμούς και παύλες.' }
    }
    row.slug = src.slug
  }
  for (const [k, max] of [['area', 120], ['description', 2000], ['access_note', 500]] as const) {
    if (k in src) row[k] = optText(src[k], max) ?? null
  }
  if ('kind' in src) {
    if (!(WELLNESS_KINDS as readonly unknown[]).includes(src.kind)) return { ok: false, error: 'Μη έγκυρο είδος.' }
    row.kind = src.kind
  }
  if ('best_time' in src) {
    if (!(WELLNESS_BEST_TIMES as readonly unknown[]).includes(src.best_time)) return { ok: false, error: 'Μη έγκυρη ώρα.' }
    row.best_time = src.best_time
  }
  if ('has_bench' in src) {
    if (src.has_bench !== null && typeof src.has_bench !== 'boolean') return { ok: false, error: 'Μη έγκυρη τιμή για παγκάκι.' }
    row.has_bench = src.has_bench
  }
  for (const [k, lo, hi, label] of [['lat', -90, 90, 'γεωγραφικό πλάτος'], ['lng', -180, 180, 'γεωγραφικό μήκος']] as const) {
    if (k in src) {
      const v = src[k]
      if (v === null || v === '') row[k] = null
      else if (typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi) row[k] = v
      else return { ok: false, error: `Μη έγκυρο ${label}.` }
    }
  }
  for (const k of ['coords_verified', 'verified_night', 'published'] as const) {
    if (k in src) {
      if (typeof src[k] !== 'boolean') return { ok: false, error: `Μη έγκυρη τιμή: ${k}.` }
      row[k] = src[k]
    }
  }
  if ('subcategories' in src) {
    const raw = src.subcategories
    if (!Array.isArray(raw)) return { ok: false, error: 'Οι υποκατηγορίες πρέπει να είναι λίστα.' }
    const allowed = new Set<string>(WELLNESS_SUBS.map(s => s.key))
    const subs: string[] = []
    for (const v of raw) {
      if (typeof v !== 'string' || !allowed.has(v)) return { ok: false, error: 'Μη έγκυρη υποκατηγορία (μόνο της Ευεξίας).' }
      if (!subs.includes(v)) subs.push(v)
    }
    if (subs.length > MAX_WELLNESS_SUBCATEGORIES) {
      return { ok: false, error: `Μέχρι ${MAX_WELLNESS_SUBCATEGORIES} υποκατηγορίες.` }
    }
    row.subcategories = subs
  }
  if ('photo_urls' in src) {
    const p = src.photo_urls
    if (!Array.isArray(p) || p.length > MAX_WELLNESS_PHOTOS) {
      return { ok: false, error: `Μέχρι ${MAX_WELLNESS_PHOTOS} φωτογραφίες.` }
    }
    if (!p.every(u => typeof u === 'string' && photoPath(u) !== null)) {
      return { ok: false, error: 'Οι φωτογραφίες πρέπει να είναι από το bucket του wellness.' }
    }
    row.photo_urls = p
  }
  if ('source_url' in src) {
    const u = optText(src.source_url, 500)
    if (u) {
      try {
        const parsed = new URL(u)
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error('protocol')
      } catch {
        return { ok: false, error: 'Το source_url πρέπει να είναι έγκυρος σύνδεσμος http(s).' }
      }
    }
    row.source_url = u ?? null
  }
  return { ok: true, row }
}

export const PUBLISH_NEEDS_PIN = 'Δεν μπορεί να δημοσιευτεί σημείο χωρίς pin (συντεταγμένες).'
