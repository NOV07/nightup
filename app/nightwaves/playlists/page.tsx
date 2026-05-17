import { Metadata } from "next";
import { getSupabase } from "../../lib/supabase";
import PlaylistsClient from "./PlaylistsClient";

export const metadata: Metadata = {
  title: "All Playlists – Nightwaves",
  description: "Browse all curated playlists from the Greek nightlife scene on Nightup.",
};

export const dynamic = "force-dynamic";

export default async function PlaylistsPage() {
  let playlists: any[] = [];
  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from("playlists")
      .select("id, title, platform, embed_url, cover_image, is_sponsored")
      .eq("status", "approved")
      .order("created_at", { ascending: false });
    if (data) playlists = data;
  } catch {}
  return <PlaylistsClient playlists={playlists} />;
}
