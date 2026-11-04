// Pure helper (no imports, erasable TS only) so client components, API routes
// and plain-Node tests share one copy.

/**
 * Reduces whatever a person typed for an Instagram account to the bare
 * username: "@name", "name", "instagram.com/name", "https://www.instagram.com/name/?hl=el"
 * all become "name". Returns null for empty input.
 */
export function normalizeInstagram(input: string | null | undefined): string | null {
  if (typeof input !== 'string') return null
  let s = input.trim()
  s = s.replace(/^(?:https?:\/\/)?(?:www\.|m\.)?instagram\.com\//i, '')
  s = s.split(/[/?#]/)[0]
  s = s.replace(/^@+/, '').trim()
  return s || null
}
