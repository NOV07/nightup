import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/app/lib/supabase";
import { getAllSpots, mapSpot } from "@/app/spots/data";
import type { Spot, SpotCategory } from "@/app/spots/types";

const RADII_KM = [3, 6, 12];

function moodSequence(mood: string): SpotCategory[] {
  return mood === "food" ? ["food", "drink", "show"]
    : mood === "wild" ? ["food", "drink", "nightlife"]
    : mood === "diff" ? ["chill", "show", "drink"]
    : ["food", "drink", "nightlife"];
}

function pickSequence(pool: Spot[], seq: SpotCategory[]): Spot[] {
  const used = new Set<string>();
  const result: Spot[] = [];
  for (const category of seq) {
    const match = pool.find((s) => s.category === category && !used.has(s.id));
    if (match) {
      used.add(match.id);
      result.push(match);
    }
  }
  return result;
}

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
  const all = await getAllSpots();
  const pickFrom = (c: SpotCategory): Spot | null => {
    const pool = all.filter((s) => s.category === c);
    return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
  };
  return seq.map(pickFrom).filter(Boolean) as Spot[];
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
