// Single source of truth for music genres.
//
// The DB stores the stable `key` (lowercase, snake_case). The screen shows
// `label_el`. Nobody writes a genre string by hand: forms, filters, admin and
// the mood heuristic all read from this file.

export const GENRES = [
  { key: 'techno', label_el: 'Techno' },
  { key: 'house', label_el: 'House' },
  { key: 'deep_house', label_el: 'Deep House' },
  { key: 'minimal', label_el: 'Minimal' },
  { key: 'drum_and_bass', label_el: 'Drum & Bass' },
  { key: 'trance', label_el: 'Trance' },
  { key: 'hip_hop', label_el: 'Hip-Hop' },
  { key: 'rnb', label_el: 'R&B' },
  { key: 'afrobeats', label_el: 'Afrobeats' },
  { key: 'reggaeton', label_el: 'Reggaeton' },
  { key: 'latin', label_el: 'Latin' },
  { key: 'pop', label_el: 'Pop' },
  { key: 'rock', label_el: 'Rock' },
  { key: 'jazz', label_el: 'Jazz' },
  { key: 'classical', label_el: 'Κλασική' },
  { key: 'blues', label_el: 'Blues' },
  { key: 'electronic', label_el: 'Electronic' },
  { key: 'ambient', label_el: 'Ambient' },
  { key: 'experimental', label_el: 'Experimental' },
  { key: 'reggae', label_el: 'Reggae' },
  { key: 'laika', label_el: 'Λαϊκά' },
  { key: 'entechno', label_el: 'Έντεχνο' },
  { key: 'rebetiko', label_el: 'Ρεμπέτικα' },
  { key: 'dimotika', label_el: 'Δημοτικά' },
  { key: 'open_air', label_el: 'Open Air' },
  { key: 'other', label_el: 'Άλλο' },
] as const

export type GenreKey = (typeof GENRES)[number]['key']

export const GENRE_KEYS: GenreKey[] = GENRES.map(g => g.key)

const LABELS: Record<string, string> = Object.fromEntries(GENRES.map(g => [g.key, g.label_el]))

// Legacy spellings that existed before the shared file. They only matter for
// reading old rows / old URLs; new data is always written as a key. Keep this
// table in sync with normalize_genre() in the genres migration.
const ALIASES: Record<string, GenreKey> = {
  'laïká': 'laika',
  'rebetika': 'rebetiko',
  'ρεμπέτικα': 'rebetiko',
  'λαϊκά': 'laika',
  'έντεχνο': 'entechno',
  'δημοτικά': 'dimotika',
  'drum & bass': 'drum_and_bass',
  'r&b': 'rnb',
  'hip-hop': 'hip_hop',
  'deep house': 'deep_house',
  'open air': 'open_air',
}

// Lowercase, strip diacritics, keep only letters/digits so "Laïká", "laika"
// and "Deep House"/"deep_house" all collapse to one comparable form.
function canon(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9α-ω]/g, '')
}

const CANON_TO_KEY: Record<string, GenreKey> = {}
for (const g of GENRES) {
  CANON_TO_KEY[canon(g.key)] = g.key
  CANON_TO_KEY[canon(g.label_el)] = g.key
}
for (const [alias, key] of Object.entries(ALIASES)) CANON_TO_KEY[canon(alias)] = key

/** Maps a key or any known legacy spelling to its key; null if unknown. */
export function normalizeGenre(raw: string | null | undefined): GenreKey | null {
  if (!raw) return null
  return CANON_TO_KEY[canon(raw)] ?? null
}

/** Greek label for a key. Unknown / legacy free-text values fall back to the raw string. */
export function genreLabel(raw: string | null | undefined): string {
  if (!raw) return ''
  const key = normalizeGenre(raw)
  return key ? LABELS[key] : raw
}

/** True when the event carries the genre key in `genres[]`, falling back to the legacy `genre`. */
export function eventHasGenre(
  event: { genres?: string[] | null; genre?: string | null },
  key: string,
): boolean {
  const target = normalizeGenre(key) ?? key
  const list = [...(event.genres ?? []), ...(event.genre ? [event.genre] : [])]
  return list.some(g => (normalizeGenre(g) ?? g) === target)
}

/**
 * Server-side: validates a `genres` array from a request body and returns the
 * stable keys plus the legacy singular `genre` (first key). Legacy spellings
 * are accepted and converted; unknown values return an error so no free text
 * reaches the column.
 */
export function parseEventGenres(
  input: unknown,
): { ok: true; genres: GenreKey[]; genre: GenreKey | null } | { ok: false; error: string } {
  if (input == null) return { ok: true, genres: [], genre: null }
  if (!Array.isArray(input)) return { ok: false, error: 'genres must be an array' }
  const keys: GenreKey[] = []
  for (const raw of input) {
    const key = typeof raw === 'string' ? normalizeGenre(raw) : null
    if (!key) return { ok: false, error: `Unknown genre: ${String(raw)}` }
    if (!keys.includes(key)) keys.push(key)
  }
  return { ok: true, genres: keys, genre: keys[0] ?? null }
}
