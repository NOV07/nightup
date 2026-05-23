import { getSupabase } from "../lib/supabase";
import type { Spot, SpotCategory } from "./types";

function mapSpot(s: any): Spot {
  return {
    id: String(s.id),
    name: s.name,
    slug: s.slug,
    category: s.category,
    subcategory: s.subcategory,
    city: s.city,
    neighborhood: s.neighborhood,
    address: s.address,
    lat: s.lat,
    lng: s.lng,
    description: s.description,
    coverImage: s.cover_image,
    priceLevel: s.price_level,
    rating: s.rating,
    instagram: s.instagram,
    isSponsored: s.is_sponsored === true,
  };
}

const COLS =
  "id, name, slug, category, subcategory, city, neighborhood, address, lat, lng, description, cover_image, price_level, rating, instagram, is_sponsored";

export async function getAllSpots(): Promise<Spot[]> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("spots")
      .select(COLS)
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

export async function getSpotsByCategory(category: SpotCategory): Promise<Spot[]> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("spots")
      .select(COLS)
      .eq("is_published", true)
      .eq("category", category)
      .order("is_sponsored", { ascending: false })
      .order("rating", { ascending: false });
    if (error || !data) return [];
    return data.map(mapSpot);
  } catch (e) {
    console.error("Spots fetch error:", e);
    return [];
  }
}

export async function buildNight(mood: string): Promise<Spot[]> {
  const all = await getAllSpots();
  const pickFrom = (c: SpotCategory): Spot | null => {
    const pool = all.filter((s) => s.category === c);
    return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
  };
  const seq: SpotCategory[] =
    mood === "food" ? ["food", "drink", "show"]
    : mood === "wild" ? ["food", "drink", "nightlife"]
    : mood === "diff" ? ["chill", "show", "drink"]
    : ["food", "drink", "nightlife"];
  return seq.map(pickFrom).filter(Boolean) as Spot[];
}
