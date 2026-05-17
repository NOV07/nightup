import { Metadata } from "next";
import { Suspense } from "react";
import { headers } from "next/headers";
import EventsClient from "./EventsClient";
import { getSupabase } from "../lib/supabase";

export const metadata: Metadata = {
  title: "Events",
  description: "Discover the best club nights, festivals, and live music events across Greece. Filter by city, genre, and date.",
};
export const dynamic = "force-dynamic";

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80";

const GREEK_CITIES = [
  "Athens", "Thessaloniki", "Patra", "Heraklion",
  "Larisa", "Volos", "Ioannina", "Chania", "Mykonos",
  "Santorini", "Ios", "Crete",
];

async function getNearbyCity(): Promise<string> {
  const h = await headers();
  const rawCity = h.get("x-vercel-ip-city");
  const decoded = rawCity ? decodeURIComponent(rawCity) : null;
  const matched = GREEK_CITIES.find((c) =>
    decoded?.toLowerCase().includes(c.toLowerCase())
  );
  return matched || "Athens";
}

export default async function EventsPage() {
  let eventsData: any[] = [];

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("events")
      .select("id, title, image_url, genre, price, date, time, venue, city, interested_count, going_count, featured_until, is_radar_pick")
      .eq("status", "approved")
      .order("date", { ascending: true });

    if (!error && data) {
      eventsData = data.map((e) => ({
        id: String(e.id),
        title: e.title,
        image: e.image_url || FALLBACK_IMAGE,
        genre: e.genre,
        price: e.price != null ? (e.price === 0 ? "Free" : `€${e.price}`) : "",
        date: e.date,
        time: e.time ?? "",
        venue: e.venue,
        city: e.city,
        interestedCount: e.interested_count ?? 0,
        goingCount: e.going_count ?? 0,
        featured: e.featured_until ? new Date(e.featured_until) > new Date() : false,
        isRadarPick: (e as any).is_radar_pick === true,
      }));
    }
  } catch (e) { console.error("Events fetch error:", e); }

  const nearbyCity = await getNearbyCity();

  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-8 text-gray-400">Loading events...</div>}>
      <EventsClient events={eventsData} nearbyCity={nearbyCity} />
    </Suspense>
  );
}
