import { Metadata } from "next";
import { getSupabase } from "../../lib/supabase";
import ReleasesClient from "./ReleasesClient";

export const metadata: Metadata = {
  title: "All Releases – Nightwaves",
  description: "Browse all music releases from the Greek nightlife scene on Nightup.",
};

export const dynamic = "force-dynamic";

export default async function ReleasesPage() {
  let releases: any[] = [];
  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from("music_releases")
      .select("id, title, artist, type, genre, cover_image, release_date, is_promoted")
      .eq("status", "approved")
      .order("created_at", { ascending: false });
    if (data) releases = data;
  } catch {}
  return <ReleasesClient releases={releases} />;
}
