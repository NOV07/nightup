import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/app/lib/supabase";
import { getAllSpots, mapSpot } from "@/app/spots/data";
import { moodSequence, pickSequence } from "@/app/spots/night";
import type { Spot } from "@/app/spots/types";
import type { SpotCategory } from "@/app/lib/spotCategories";

const RADII_KM = [3, 6, 12];

async function buildNightNearby(
  seq: SpotCategory[],
  lat: number,
  lng: number
): Promise<{ spots: Spot[]; usedRadius: number }> {
  const supabase = getSupabase();
  let lastSpots: Spot[] = [];
  let lastRadius = RADII_KM[RADII_KM.length - 1];

  for (const radius of RADII_KM) {
    const { data, error } = await supabase.rpc("spots_nearby", {
      user_lat: lat,
      user_lng: lng,
      radius_km: radius,
      filter_category: null,
    });
    if (error || !data) continue;

    const pool = data.map(mapSpot);
    const spots = pickSequence(pool, seq);
    lastSpots = spots;
    lastRadius = radius;
    if (spots.length >= 3) break;
  }

  return { spots: lastSpots, usedRadius: lastRadius };
}

async function buildNightFallback(seq: SpotCategory[]): Promise<Spot[]> {
  return pickSequence(await getAllSpots(), seq, true);
}

export async function POST(req: NextRequest) {
  let body: { mood?: string; lat?: number; lng?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { mood, lat, lng } = body;
  if (!mood) return NextResponse.json({ error: "mood required" }, { status: 400 });

  const seq = moodSequence(mood);

  if (typeof lat === "number" && typeof lng === "number") {
    const { spots, usedRadius } = await buildNightNearby(seq, lat, lng);
    return NextResponse.json({ spots, usedRadius });
  }

  const spots = await buildNightFallback(seq);
  return NextResponse.json({ spots, usedRadius: null });
}
