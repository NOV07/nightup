import { Metadata } from "next";
import AboutClient from "./AboutClient";
import { getSupabaseAdmin } from "../lib/supabase";

export const metadata: Metadata = {
  title: "About",
  description: "Nightup.gr is Greece's nightlife and music discovery platform. Learn about our mission and how to get in touch.",
};

export const dynamic = "force-dynamic";

export interface LiveStats {
  events: number;
  professionals: number;
  cities: number;
  visitors: number;
}

async function getLiveStats(): Promise<LiveStats> {
  const supabase = getSupabaseAdmin();
  const currentMonth = new Date().toISOString().slice(0, 7);

  try {
    const [eventsRes, profRes, citiesRes, visitorsRes] = await Promise.all([
      supabase
        .from("events")
        .select("id", { count: "exact", head: true })
        .eq("status", "approved"),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .not("network_tab", "is", null),
      supabase
        .from("events")
        .select("city")
        .eq("status", "approved"),
      supabase
        .from("site_stats")
        .select("visitor_count")
        .eq("month", currentMonth)
        .maybeSingle(),
    ]);

    const eventsTotal = eventsRes.count ?? 0;

    const profTotal = profRes.count ?? 0;

    const dbCities = new Set<string>(
      (citiesRes.data ?? []).map((r) => r.city as string).filter(Boolean)
    );
    const citiesTotal = dbCities.size;

    const visitorsTotal = (visitorsRes.data?.visitor_count as number) ?? 0;

    return { events: eventsTotal, professionals: profTotal, cities: citiesTotal, visitors: visitorsTotal };
  } catch {
    return { events: 0, professionals: 0, cities: 0, visitors: 0 };
  }
}

export default async function AboutPage() {
  const stats = await getLiveStats();
  return <AboutClient liveStats={stats} />;
}
