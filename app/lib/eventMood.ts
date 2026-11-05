// Heuristic type/genre -> mood mapping, not an exact classification.
// Purpose-built for the "Βρες τη νύχτα σου" preview panel so events surface there
// without asking organizers for a manual field. If precise targeting is ever
// needed, that will require a real manual mood field on the event.

import { normalizeGenre, type GenreKey } from './genres'

type EventMood = 'chill' | 'wild' | 'diff'

const WILD_GENRES: GenreKey[] = ['techno', 'house', 'deep_house', 'drum_and_bass', 'hip_hop', 'rnb', 'afrobeats', 'reggaeton', 'electronic']
const CHILL_GENRES: GenreKey[] = ['jazz', 'classical', 'ambient', 'entechno', 'blues', 'laika', 'rebetiko', 'dimotika']
const DIFF_GENRES: GenreKey[] = ['experimental', 'minimal', 'trance', 'rock', 'other', 'open_air']

const WILD_TYPES = ['club night', 'festival', 'private party']
const DIFF_TYPES = ['live show', 'open air', 'other']

export function getEventMood(event: { type?: string | null; genres?: string[] | null }): EventMood | null {
  const genres = (event.genres ?? []).map(g => normalizeGenre(g)).filter((g): g is GenreKey => g !== null)

  if (genres.some(g => WILD_GENRES.includes(g))) return 'wild'
  if (genres.some(g => CHILL_GENRES.includes(g))) return 'chill'
  if (genres.some(g => DIFF_GENRES.includes(g))) return 'diff'

  const type = event.type?.toLowerCase() ?? ''

  if (WILD_TYPES.includes(type)) return 'wild'
  if (DIFF_TYPES.includes(type)) return 'diff'

  return null
}
