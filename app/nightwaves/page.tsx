import { Metadata } from "next";
import NightwavesClient from "./NightwavesClient";
import { getSupabase } from "../lib/supabase";

export const metadata: Metadata = {
  title: "Nightwaves – Live Radio, Mixes & Releases",
  description: "Listen to Nightup's live radio stations, top DJ mixes, new music releases, and curated playlists from the Greek nightlife scene.",
};
export const dynamic = "force-dynamic";

export default async function NightwavesPage() {
  let mixes: any[] = [];
  let releases: any[] = [];
  let playlists: any[] = [];
  let recentItems: any[] = [];

  try {
    const supabase = getSupabase();
    const [mixRes, relRes, playRes, relFeedRes, mixFeedRes, playFeedRes] = await Promise.all([
      supabase.from("mixes").select("*").eq("status", "approved").order("created_at", { ascending: false }).limit(8),
      supabase.from("music_releases").select("*").eq("status", "approved").order("created_at", { ascending: false }).limit(12),
      supabase.from("playlists").select("*").eq("status", "approved").order("created_at", { ascending: false }).limit(6),
      // For combined recent feed
      supabase.from("music_releases").select("id, title, artist, type, cover_image, created_at, is_promoted").eq("status", "approved").order("created_at", { ascending: false }).limit(5),
      supabase.from("mixes").select("id, title, artist, genre, cover_image, created_at").eq("status", "approved").order("created_at", { ascending: false }).limit(5),
      supabase.from("playlists").select("id, title, platform, embed_url, cover_image, created_at").eq("status", "approved").order("created_at", { ascending: false }).limit(5),
    ]);

    if (mixRes.data) mixes = mixRes.data;
    if (relRes.data) releases = relRes.data;
    if (playRes.data) playlists = playRes.data;

    // Merge and sort combined recent items
    recentItems = [
      ...(relFeedRes.data ?? []).map((r) => ({ ...r, _contentType: "release", typeBadge: r.type ?? "Release", href: `/nightwaves/release/${r.id}` })),
      ...(mixFeedRes.data ?? []).map((m) => ({ ...m, _contentType: "mix", typeBadge: "Mix", href: `/nightwaves/mix/${m.id}` })),
      ...(playFeedRes.data ?? []).map((p) => ({ ...p, _contentType: "playlist", typeBadge: "Playlist", href: p.embed_url ?? "#", external: true })),
    ]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
  } catch {}

  return <NightwavesClient mixes={mixes} releases={releases} playlists={playlists} recentItems={recentItems} />;
}
