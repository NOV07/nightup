import { getSupabase } from "../lib/supabase";
import type { Spot } from "./types";
import type { SpotCategory } from "../lib/spotCategories";
import { SPOT_COLS, SPOT_MAP_COLS, mapSpot } from "./mapSpot";

export { mapSpot };

export async function getAllSpots(): Promise<Spot[]> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("spots")
      .select(SPOT_COLS)
      .eq("is_published", true)
      .order("is_sponsored", { ascending: false })
      .order("rating", { ascending: false });
    if (error || !data) return [];
    return data.map(mapSpot);
  } catch (e) {
    console.error("Spots fetch error:", e);
    return [];
  }
}

/** Published spots with their opening hours, for the public map. Same rows as getAllSpots; never throws. */
export async function getAllSpotsForMap(): Promise<Spot[]> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("spots")
      .select(SPOT_MAP_COLS)
      .eq("is_published", true)
      .order("is_sponsored", { ascending: false })
      .order("rating", { ascending: false });
    if (error || !data) return [];
    return data.map(mapSpot);
  } catch (e) {
    console.error("Map spots fetch error:", e);
    return [];
  }
}

/** Spots that have `category` among their categories (not only as primary). */
export async function getSpotsByCategory(category: SpotCategory): Promise<Spot[]> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("spots")
      .select(SPOT_COLS)
      .eq("is_published", true)
      .contains("categories", [category])
      .order("is_sponsored", { ascending: false })
      .order("rating", { ascending: false });
    if (error || !data) return [];
    return data.map(mapSpot);
  } catch (e) {
    console.error("Spots fetch error:", e);
    return [];
  }
}
