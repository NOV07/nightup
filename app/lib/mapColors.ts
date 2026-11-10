// The one place that decides the pin / dot colour of each category on the public
// map (/map). A spot with several categories takes the colour of its FIRST one.
// The values are indicative: change them here and every pin, filter dot and
// badge follows.

import type { SpotCategory } from './spotCategories.ts'

export const MAP_CATEGORY_COLORS: Record<SpotCategory, string> = {
  drink: '#E8A020',
  food: '#E8704A',
  nightlife: '#5B8DEF',
  show: '#E066A8',
  chill: '#8FB8DE',
  activity: '#A3D65C',
  art: '#D9C7A0',
  wellness: '#4FC3A1',
}

/** Colours of the three group boxes and their dots in the filter bar (not of the pins: those follow the category). */
export const MAP_GROUP_COLORS = { events: '#E8A020', spots: '#C084FC', wellness: '#34D399' } as const

/** A spot that is closed at the picked moment. Open spots keep their category colour; spots with no readable hours are an empty outline in it. */
export const MAP_CLOSED_COLOR = '#6B6B80'

/** The events layer: one gold for every event pin (drawn as a diamond, so it reads apart from spots and wellness). */
export const MAP_EVENT_COLOR = '#E8A020'

/** Pin colour of a point: events are gold, the rest follow their first category. */
export const mapPointColor = (p: { kind: string; categories: readonly SpotCategory[] }): string =>
  p.kind === 'event' ? MAP_EVENT_COLOR : mapColorOf(p.categories[0])

export const mapColorOf = (category: SpotCategory | undefined): string =>
  (category && MAP_CATEGORY_COLORS[category]) || '#A9ABC0'
