import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSupabase } from "../lib/supabase";
import NetworkClient from "./NetworkClient";
import { NetworkProfilesProvider } from "../components/NetworkProfilesContext";
import { PROFILE_COLUMNS } from "../lib/networkProfile";
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

// Legacy deep links (?view=all&tab=venues …) now live on their own routes.
const TAB_ROUTES: Record<string, string> = {
  "artists": "/network/artists",
  "venues": "/network/venues",
  "professionals": "/network/professionals",
};

interface Props {
  searchParams: Promise<{
    view?: string;
    tab?: string;
    category?: string;
    subcategory?: string;
    city?: string;
  }>;
}

const GATE_TABS = ["Artists", "Venues", "Professionals"] as const;

export default async function NetworkPage({ searchParams }: Props) {
  const params = await searchParams;

  if (params.view || params.tab || params.category || params.city) {
    redirect(TAB_ROUTES[params.tab ?? "artists"] ?? "/network/artists");
  }

  const supabase = getSupabase();

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
    // Listings — sponsored first; the panel preview takes the top 4
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

  const [{ data: listingsRaw }, { data: allProfiles }, { count: listingsCount }] =
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
      <NetworkClient gatesPreview={gatesPreview} />
    </NetworkProfilesProvider>
  );
}
