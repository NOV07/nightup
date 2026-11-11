// Small pure helpers of the /map controls (the number on the filter button), so
// scripts/test-map-v3.mjs can load them in plain Node.

import { GROUPS, hasFilters, type MapFilters } from './mapFilters.ts'

/**
 * The number on the filter button: how many things differ from the default. Hidden groups, plus one when
 * the picked night is not tonight, plus one when "Near me" is on, plus one when any group has a filter
 * (event type or genre, spot status, category or subcategory, wellness subcategory). 0 = the default (the
 * number is not drawn). `night` is null for tonight (the filters never keep tonight as a date).
 */
export function activeFilterCount(f: Pick<MapFilters, 'shown' | 'night' | 'evTypes' | 'evGenres' | 'spotStatus' | 'categories' | 'subcategories' | 'wellnessSubs'>, nearActive: boolean): number {
  return (GROUPS.length - f.shown.length) + (f.night != null ? 1 : 0) + (nearActive ? 1 : 0) + (hasFilters(f as MapFilters) ? 1 : 0)
}

/** "See 1 place" / "See 12 places": `one` has no number, `many` has `{n}`. Both languages follow the same rule. */
export function pluralLabel(n: number, tpl: { one: string; many: string }): string {
  return n === 1 ? tpl.one : tpl.many.replace('{n}', String(n))
}
