import { Metadata } from "next";
import { getSupabase } from "../lib/supabase";
import NetworkClient from "./NetworkClient";
import { NetworkProfilesProvider } from "../components/NetworkProfilesContext";
import type { Listing } from "@/components/network/ListingsBar";

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

const PROFILE_COLUMNS =
  "id, username, display_name, avatar_url, avatar_crop_x, avatar_crop_y, avatar_crop_width, avatar_crop_height, bio, location, network_tab, network_category, network_subcategory, is_featured, is_verified";

const GATE_TABS = ["Artists", "Venues", "Professionals"] as const;

export default async function NetworkPage({ searchParams }: Props) {
  const params = await searchParams;

  const tab = TAB_SLUGS[params.tab ?? "artists"] ?? "Artists";
  const category = params.category ?? null;
  const subcategory = params.subcategory ?? null;
  const city = params.city ?? null;

  const supabase = getSupabase();

  // ── Full-view query — filtered profiles for the active tab ──────────
  let query = supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .not("network_tab", "is", null)
    .order("is_featured", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(60);

  query = query.eq("network_tab", tab);
  if (category) query = query.eq("network_category", category);
  if (subcategory) query = query.eq("network_subcategory", subcategory);
  if (city) query = query.ilike("location", `%${city}%`);

  // ── Gates preview — a small preview + exact count per tab ───────────
  const gateProfileQueries = GATE_TABS.map((t) =>
    supabase
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .eq("network_tab", t)
      .order("is_featured", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(4)
  );
  const gateCountQueries = GATE_TABS.map((t) =>
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("network_tab", t)
  );

  // Fire everything concurrently; keep the fixed queries as a tuple so their
  // individual result types are preserved.
  const fixedPromise = Promise.all([
    query,
    // Listings — top 10 active, sponsored first (full query for full-view bar)
    supabase
      .from("listings")
      .select("*, profiles(display_name, username)")
      .eq("is_active", true)
      .order("is_sponsored", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(10),
    // Unfiltered fetch — all network profiles, for the guided modal
    supabase
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .not("network_tab", "is", null)
      .order("is_featured", { ascending: false, nullsFirst: false })
      .limit(300),
    supabase
      .from("listings")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true),
  ]);
  const gateProfilesPromise = Promise.all(gateProfileQueries);
  const gateCountsPromise = Promise.all(gateCountQueries);

  const [{ data: profiles }, { data: listingsRaw }, { data: allProfiles }, { count: listingsCount }] =
    await fixedPromise;
  const gateProfileResults = await gateProfilesPromise;
  const gateCountResults = await gateCountsPromise;

  const listings = (listingsRaw ?? []) as Listing[];

  const gatesPreview = {
    Artists:       { profiles: gateProfileResults[0]?.data ?? [], count: gateCountResults[0]?.count ?? 0 },
    Venues:        { profiles: gateProfileResults[1]?.data ?? [], count: gateCountResults[1]?.count ?? 0 },
    Professionals: { profiles: gateProfileResults[2]?.data ?? [], count: gateCountResults[2]?.count ?? 0 },
    // `listings` is already ordered is_sponsored desc, created_at desc — so the
    // preview shows sponsored first, then most recent.
    Listings:      { items: listings.slice(0, 4), count: listingsCount ?? 0 },
  };

  return (
    <NetworkProfilesProvider profiles={allProfiles ?? []}>
      <NetworkClient
        profiles={profiles ?? []}
        allProfiles={allProfiles ?? []}
        listings={listings}
        gatesPreview={gatesPreview}
      />
    </NetworkProfilesProvider>
  );
}
