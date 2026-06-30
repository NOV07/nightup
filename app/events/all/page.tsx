import { Metadata } from "next";
import { getSupabase } from "../../lib/supabase";
import EventsAllClient from "./EventsAllClient";

export const metadata: Metadata = {
  title: "All Events",
  description: "Browse all nightlife events across Greece. Filter by city, date, genre, and price.",
  twitter: {
    card: "summary_large_image",
    title: "All Events | Nightup.gr",
    description: "Browse all nightlife events across Greece. Filter by city, date, genre, and price.",
    images: ["https://nightup.gr/og-image.png"],
  },
};
export const dynamic = "force-dynamic";
export const revalidate = 0;

const FALLBACK = "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80";

export default async function EventsAllPage() {
  let events: any[] = [];

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("events")
      .select("id, title, image_url, genre, price, date, time, venue, city, interested_count, going_count, organizer_id, type")
      .eq("status", "approved")
      .order("date", { ascending: true });

    if (data && data.length > 0) {
      events = data.map((e) => ({
        id: String(e.id),
        title: e.title,
        image: e.image_url || FALLBACK,
        genre: e.genre,
        price: e.price ?? "",
        date: e.date,
        time: e.time ?? "",
        venue: e.venue,
        city: e.city,
        interestedCount: e.interested_count ?? 0,
        goingCount: e.going_count ?? 0,
        type: e.type ?? 'music',
      }));
    }
  } catch {}

  return <EventsAllClient initialEvents={events} />;
}
