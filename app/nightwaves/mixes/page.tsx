import { Metadata } from "next";
import { getSupabase } from "../../lib/supabase";
import MixesClient from "./MixesClient";

export const metadata: Metadata = {
  title: "All Mixes – Nightwaves",
  description: "Browse all DJ mixes from the Greek nightlife scene on Nightup.",
};

export const dynamic = "force-dynamic";

export default async function MixesPage() {
  let mixes: any[] = [];

  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from("mixes")
      .select("id, title, artist, genre, cover_image, soundcloud_url, duration")
      .eq("status", "approved")
      .order("created_at", { ascending: false });
    if (data) mixes = data;
  } catch {}

  return <MixesClient mixes={mixes} />;
}
