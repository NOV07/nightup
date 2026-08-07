import { Metadata } from "next";
import { getSupabase } from "../../lib/supabase";
import { getEventCoverImage, getEventCrop } from "../../lib/getEventCoverImage";
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

export default async function EventsAllPage() {
  let events: any[] = [];

  const _now = new Date();
  // Use local date parts to avoid UTC-shift cutting off today's events
  const _y = _now.getFullYear();
  const _m = String(_now.getMonth() + 1).padStart(2, "0");
  const _d = String(_now.getDate()).padStart(2, "0");
  const today = `${_y}-${_m}-${_d}`;

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("events")
      .select("id, title, image_url, has_copyright_restriction, crop_x, crop_y, crop_width, crop_height, genre, price, date, time, venue, city, interested_count, going_count, type")
      .eq("status", "approved")
      .gte("date", today)
      .order("date", { ascending: true });

    if (data && data.length > 0) {
      events = data.map((e) => ({
        id: String(e.id),
        title: e.title,
        image: getEventCoverImage(e),
        crop: getEventCrop(e),
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
