import { Metadata } from "next";
import { getSupabase } from "../lib/supabase";
import NetworkClient from "./NetworkClient";
import { NetworkProfilesProvider } from "../components/NetworkProfilesContext";

export const metadata: Metadata = {
  title: "Network",
  description: "Find venues, DJs, sound engineers, photographers, studios and every professional you need for your event or music career in Greece.",
  openGraph: {
    title: "Network | Nightup.gr",
    description: "Every music professional you need in Greece.",
    images: [{ url: "https://nightup.gr/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Network | Nightup.gr",
    description: "Every music professional you need in Greece.",
    images: ["https://nightup.gr/og-image.png"],
  },
};

export const dynamic = "force-dynamic";

const TAB_SLUGS: Record<string, string> = {
  "artists": "Artists",
  "venues": "Venues",
  "professionals": "Professionals",
};

interface Props {
  searchParams: Promise<{
    tab?: string;
    category?: string;
    subcategory?: string;
    city?: string;
  }>;
}

export default async function NetworkPage({ searchParams }: Props) {
  const params = await searchParams;

  const tab = TAB_SLUGS[params.tab ?? "artists"] ?? "Artists";
  const category = params.category ?? null;
  const subcategory = params.subcategory ?? null;
  const city = params.city ?? null;

  const supabase = getSupabase();

  let query = supabase
    .from("profiles")
    .select(
      "id, username, display_name, avatar_url, bio, location, network_tab, network_category, network_subcategory, is_featured, is_verified"
    )
    .not("network_tab", "is", null)
    .order("is_featured", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(60);

  query = query.eq("network_tab", tab);
  if (category) query = query.eq("network_category", category);
  if (subcategory) query = query.eq("network_subcategory", subcategory);
  if (city) query = query.ilike("location", `%${city}%`);

  const { data: profiles } = await query;

  // Unfiltered fetch — all network profiles, for the guided modal
  const { data: allProfiles } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio, location, network_tab, network_category, network_subcategory, is_featured, is_verified")
    .not("network_tab", "is", null)
    .order("is_featured", { ascending: false, nullsFirst: false })
    .limit(300);

  return (
    <NetworkProfilesProvider profiles={allProfiles ?? []}>
      <NetworkClient profiles={profiles ?? []} allProfiles={allProfiles ?? []} />
    </NetworkProfilesProvider>
  );
}
