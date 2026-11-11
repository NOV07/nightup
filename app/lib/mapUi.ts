// Small pure helpers of the /map controls (the filter button and the "see N places" button), so
// scripts/test-map-v3.mjs can load them in plain Node.

/**
 * The number on the filter button: lit groups, plus one when the picked night is not tonight, plus
 * one when "Near me" is on. 0 = nothing chosen (the button then says "Choose what to see").
 * `night` is null for tonight (the filters never keep tonight as a date).
 */
export function activeFilterCount(f: { shown: readonly unknown[]; night: string | null }, nearActive: boolean): number {
  return f.shown.length + (f.night != null ? 1 : 0) + (nearActive ? 1 : 0)
}

/** "See 1 place" / "See 12 places": `one` has no number, `many` has `{n}`. Both languages follow the same rule. */
export function pluralLabel(n: number, tpl: { one: string; many: string }): string {
  return n === 1 ? tpl.one : tpl.many.replace('{n}', String(n))
}
