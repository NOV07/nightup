// The emoji shown inside the round pin of each point on /map. Kept apart from
// spotCategories.ts (whose `emoji` field is used by the admin and the filters)
// so the map can have its own set. A spot with several categories takes the
// emoji of its FIRST one, a wellness point that of its first subcategory.

import type { MapPoint } from './mapFilters.ts'

export const SPOT_EMOJI: Record<string, string> = {
  drink: '🍸',
  food: '🍴',
  nightlife: '🪩',
  show: '🎭',
  chill: '☕',
  activity: '🎯',
  art: '🎨',
}

export const EVENT_EMOJI: Record<string, string> = {
  music: '🎵',
  culture: '🎭',
  sports: '⚽',
  other: '✨',
}

export const WELLNESS_EMOJI: Record<string, string> = {
  sunset_spot: '🌅',
  yoga: '🧘',
  sea_swim: '🌊',
  nature_walk: '🌿',
}

export const WELLNESS_FALLBACK_EMOJI = '🌿'
export const SPOT_FALLBACK_EMOJI = '📍'
export const EVENT_FALLBACK_EMOJI = '✨'

const own = (table: Record<string, string>, key: string | undefined): string | undefined =>
  key !== undefined && Object.prototype.hasOwnProperty.call(table, key) ? table[key] : undefined

export function mapEmojiOf(p: Pick<MapPoint, 'kind' | 'categories' | 'subcategories'> & { event?: { type: string } }): string {
  if (p.kind === 'event') return own(EVENT_EMOJI, p.event?.type) ?? EVENT_FALLBACK_EMOJI
  if (p.kind === 'wellness') return own(WELLNESS_EMOJI, p.subcategories[0]) ?? WELLNESS_FALLBACK_EMOJI
  return own(SPOT_EMOJI, p.categories[0]) ?? SPOT_FALLBACK_EMOJI
}
