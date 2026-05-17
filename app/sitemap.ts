import type { MetadataRoute } from "next";
import { getSupabase } from "./lib/supabase";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://nightup.gr";
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base,                       lastModified: now, changeFrequency: "daily",   priority: 1   },
    { url: `${base}/events`,           lastModified: now, changeFrequency: "daily",   priority: 0.9 },
    { url: `${base}/events/all`,       lastModified: now, changeFrequency: "daily",   priority: 0.8 },
    { url: `${base}/magazine`,         lastModified: now, changeFrequency: "weekly",  priority: 0.8 },
    { url: `${base}/network`,          lastModified: now, changeFrequency: "weekly",  priority: 0.8 },
    { url: `${base}/nightwaves`,       lastModified: now, changeFrequency: "weekly",  priority: 0.7 },
    { url: `${base}/nightwaves/mixes`, lastModified: now, changeFrequency: "weekly",  priority: 0.6 },
    { url: `${base}/about`,            lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];

  try {
    const supabase = getSupabase();

    const [evRes, artRes, mixRes, relRes] = await Promise.all([
      supabase.from("events").select("id, updated_at").eq("status", "approved"),
      supabase.from("articles").select("id, updated_at").eq("status", "published"),
      supabase.from("mixes").select("id, updated_at").eq("status", "approved"),
      supabase.from("music_releases").select("id, updated_at").eq("status", "approved"),
    ]);

    const eventRoutes: MetadataRoute.Sitemap = (evRes.data ?? []).map((e) => ({
      url: `${base}/events/${e.id}`,
      lastModified: e.updated_at ? new Date(e.updated_at) : now,
      changeFrequency: "weekly",
      priority: 0.7,
    }));

    const articleRoutes: MetadataRoute.Sitemap = (artRes.data ?? []).map((a) => ({
      url: `${base}/magazine/${a.id}`,
      lastModified: a.updated_at ? new Date(a.updated_at) : now,
      changeFrequency: "monthly",
      priority: 0.6,
    }));

    const mixRoutes: MetadataRoute.Sitemap = (mixRes.data ?? []).map((m) => ({
      url: `${base}/nightwaves/mix/${m.id}`,
      lastModified: m.updated_at ? new Date(m.updated_at) : now,
      changeFrequency: "monthly",
      priority: 0.5,
    }));

    const releaseRoutes: MetadataRoute.Sitemap = (relRes.data ?? []).map((r) => ({
      url: `${base}/nightwaves/release/${r.id}`,
      lastModified: r.updated_at ? new Date(r.updated_at) : now,
      changeFrequency: "monthly",
      priority: 0.5,
    }));

    return [...staticRoutes, ...eventRoutes, ...articleRoutes, ...mixRoutes, ...releaseRoutes];
  } catch {
    return staticRoutes;
  }
}
