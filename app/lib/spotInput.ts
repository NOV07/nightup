// Input rules for spot writes. No runtime imports beyond other pure helpers
// and only erasable TS syntax, so the API routes and
// scripts/test-admin-add-spot.mjs (plain Node, no network) share one copy.

import { SUBCATEGORIES, type SpotCategory } from '../spots/types.ts'
import { spotCoordsError } from './mapsCoords.ts'
import { slugify } from './slug.ts'

// Kept in sync with the spot_category enum in Postgres.
export const SPOT_CATEGORY_KEYS: SpotCategory[] = ['food', 'drink', 'nightlife', 'show', 'chill', 'activity', 'art', 'wellness']

/** Columns an owner may write through /api/spots and /api/spots/[id]. */
export const SPOT_FIELDS = [
  'name', 'category', 'subcategory', 'city', 'neighborhood', 'address',
  'lat', 'lng', 'description', 'cover_image',
  'crop_x', 'crop_y', 'crop_width', 'crop_height',
  'gallery', 'price_level', 'price_text', 'phone', 'website', 'instagram', 'opening_hours',
]

/**
 * What the admin Add form may send. `slug` is an input only: it goes through
 * slugify + uniqueSlug in the route and is never written as given. owner_id,
 * claimed_by_profile_id, geo, id and created_at are deliberately absent.
 */
export const ADMIN_SPOT_INPUT_FIELDS = [...SPOT_FIELDS, 'rating', 'is_sponsored', 'featured', 'is_published', 'slug']

const MAX_GALLERY = 8

// Upper bounds for free text. price_text matches the DB check constraint.
const TEXT_LIMITS: Record<string, number> = {
  name: 120, city: 60, neighborhood: 120, address: 200, description: 3000,
  cover_image: 1000, price_text: 40, phone: 40, website: 500, instagram: 120, slug: 120,
}

export type AdminSpotCheck =
  | { ok: true; row: Record<string, unknown>; slugRoot: string }
  | { ok: false; error: string }

function isUrl(s: string): boolean {
  try {
    const u = new URL(s)
    return u.protocol === 'https:' || u.protocol === 'http:'
  } catch {
    return false
  }
}

/**
 * Validates the admin Add Spot payload and returns the exact row to insert,
 * minus `slug` (the caller makes it unique against the table) and the
 * ownership columns (always null for an admin-created spot).
 */
export function checkAdminSpotInput(input: unknown): AdminSpotCheck {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false, error: 'Invalid request' }
  const body = input as Record<string, unknown>

  const unknown = Object.keys(body).filter(k => !ADMIN_SPOT_INPUT_FIELDS.includes(k))
  if (unknown.length) return { ok: false, error: `Unknown field(s): ${unknown.join(', ')}` }

  const row: Record<string, unknown> = {}

  // Text: trimmed, empty means null, length-capped.
  for (const k of Object.keys(TEXT_LIMITS)) {
    const v = body[k]
    if (v == null) continue
    if (typeof v !== 'string') return { ok: false, error: `${k} must be text` }
    const s = v.trim()
    if (s.length > TEXT_LIMITS[k]) return { ok: false, error: `${k} is too long (max ${TEXT_LIMITS[k]} characters)` }
    row[k] = s || null
  }

  if (!row.name) return { ok: false, error: 'Name is required' }
  if (!row.city) return { ok: false, error: 'City is required' }

  const category = body.category
  if (typeof category !== 'string' || !SPOT_CATEGORY_KEYS.includes(category as SpotCategory)) {
    return { ok: false, error: `Category must be one of: ${SPOT_CATEGORY_KEYS.join(', ')}` }
  }
  row.category = category

  const sub = body.subcategory
  if (sub == null || sub === '') {
    row.subcategory = null
  } else if (typeof sub !== 'string' || !SUBCATEGORIES[category as SpotCategory].some(s => s.value === sub)) {
    return { ok: false, error: `Subcategory "${String(sub)}" is not in the list for ${category}` }
  } else {
    row.subcategory = sub
  }

  for (const k of ['cover_image', 'website']) {
    if (row[k] && !isUrl(row[k] as string)) return { ok: false, error: `${k} must be an http(s) URL` }
  }

  const coordsError = spotCoordsError(body, { required: true })
  if (coordsError) return { ok: false, error: coordsError }
  row.lat = body.lat
  row.lng = body.lng

  for (const k of ['crop_x', 'crop_y', 'crop_width', 'crop_height']) {
    const v = body[k]
    if (v == null) { row[k] = null; continue }
    if (typeof v !== 'number' || !Number.isFinite(v)) return { ok: false, error: `${k} must be a number` }
    row[k] = v
  }

  const level = body.price_level
  if (level == null) row.price_level = null
  else if (typeof level !== 'number' || !Number.isInteger(level) || level < 1 || level > 4) {
    return { ok: false, error: 'price_level must be a whole number from 1 to 4' }
  } else row.price_level = level

  const rating = body.rating
  if (rating == null) row.rating = null
  else if (typeof rating !== 'number' || !Number.isFinite(rating) || rating < 0 || rating > 5) {
    return { ok: false, error: 'rating must be a number from 0 to 5' }
  } else row.rating = rating

  if (body.gallery != null) {
    if (!Array.isArray(body.gallery) || body.gallery.length > MAX_GALLERY) {
      return { ok: false, error: `gallery must be a list of at most ${MAX_GALLERY} items` }
    }
    row.gallery = body.gallery
  }

  if (body.opening_hours != null) {
    const h = body.opening_hours
    if (typeof h !== 'object' || Array.isArray(h) || Object.values(h).some(v => typeof v !== 'string')) {
      return { ok: false, error: 'opening_hours must map days to text' }
    }
    row.opening_hours = h
  }

  for (const k of ['is_sponsored', 'featured', 'is_published']) {
    const v = body[k]
    if (v != null && typeof v !== 'boolean') return { ok: false, error: `${k} must be true or false` }
  }
  row.is_sponsored = body.is_sponsored === true
  row.featured = body.featured === true
  // Always explicit: the column defaults to true in Postgres, and an admin
  // spot is only public when the "publish now" box was ticked.
  row.is_published = body.is_published === true

  // A given slug is a request, not a value: it is normalised the same way as
  // the name and still made unique by the caller.
  const slugRoot = slugify(String(row.slug ?? '')) || slugify(String(row.name)) || 'spot'
  delete row.slug

  row.owner_id = null
  row.claimed_by_profile_id = null

  return { ok: true, row, slugRoot }
}
