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

export const mapColorOf = (category: SpotCategory | undefined): string =>
  (category && MAP_CATEGORY_COLORS[category]) || '#A9ABC0'
