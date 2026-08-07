import { Metadata } from "next";
import { getSupabase } from "../../lib/supabase";
import ReleasesClient from "./ReleasesClient";

export const metadata: Metadata = {
  title: "All Releases – Nightwaves",
  description: "Browse all music releases from the Greek nightlife scene on Nightup.",
  twitter: {
    card: "summary_large_image",
    title: "All Releases – Nightwaves | Nightup.gr",
    description: "Browse all music releases from the Greek nightlife scene on Nightup.",
    images: ["https://nightup.gr/og-image.png"],
  },
};

export const revalidate = 300;

export default async function ReleasesPage() {
  let releases: any[] = [];
  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from("music_releases")
      .select("id, title, artist, type, genre, primary_genre, cover_image, release_date, is_promoted")
      .eq("status", "approved")
      .order("created_at", { ascending: false });
    // primary_genre is the column every submit/edit form writes; genre is the
    // legacy single-string column only older admin-created rows still carry.
    if (data) releases = data.map(r => ({ ...r, genre: r.primary_genre ?? r.genre }));
  } catch {}
  return <ReleasesClient releases={releases} />;
}
