import type { Spot } from "./types";
import type { SpotCategory } from "../lib/spotCategories";
import { spotInCategory } from "../lib/spotCategories";

/** Categories of the three stops, per mood. One copy for the API and the modal. */
export function moodSequence(mood: string): SpotCategory[] {
  return mood === "food" ? ["food", "drink", "show"]
    : mood === "wild" ? ["food", "drink", "nightlife"]
    : mood === "diff" ? ["chill", "show", "drink"]
    : ["food", "drink", "nightlife"];
}

/**
 * One spot per stop. A spot matches a stop when ANY of its categories is the
 * stop's category, and the same spot is never used twice. `random` picks among
 * the matches (no location); otherwise the first match wins (the pool is
 * already ordered by distance). A stop with no match is skipped. The returned
 * copy carries `nightSlot`, the category the spot was picked for.
 */
export function pickSequence(pool: Spot[], seq: SpotCategory[], random = false): Spot[] {
  const used = new Set<string>();
  const result: Spot[] = [];
  for (const category of seq) {
    const matches = pool.filter((s) => !used.has(s.id) && spotInCategory(s, category));
    if (!matches.length) continue;
    const match = random ? matches[Math.floor(Math.random() * matches.length)] : matches[0];
    used.add(match.id);
    result.push({ ...match, nightSlot: category });
  }
  return result;
}
