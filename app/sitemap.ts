import type { MetadataRoute } from "next";
import { profileHref } from '@/app/lib/profileHref'
import { getSupabase } from "./lib/supabase";
import { logQueryError } from "./lib/logQueryError";

export const dynamic = "force-dynamic";

// Columns that really exist (checked against the live schema): events, mixes,
// music_releases, profiles and spots only have created_at; articles has both.
type Row = { id?: string; slug?: string; username?: string; created_at?: string | null; updated_at?: string | null };

const PAGE_SIZE = 1000; // Supabase returns at most 1000 rows per request
const MAX_URLS = 50000; // one sitemap file may not list more

// A failing section is logged and skipped on its own: it never takes the other
// sections down with it.
async function fetchAll(
  label: string,
  page: (from: number, to: number) => PromiseLike<{ data: Row[] | null; error: { message: string; code?: string } | null }>,
): Promise<Row[]> {
  const rows: Row[] = [];
  for (let from = 0; rows.length < MAX_URLS; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) { logQueryError("sitemap", label, error); break; }
    rows.push(...(data ?? []));
    if ((data?.length ?? 0) < PAGE_SIZE) break;
  }
  return rows;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://nightup.gr";
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base,                              lastModified: now, changeFrequency: "daily",   priority: 1   },
    { url: `${base}/events`,                  lastModified: now, changeFrequency: "daily",   priority: 0.9 },
    { url: `${base}/events/all`,              lastModified: now, changeFrequency: "daily",   priority: 0.8 },
    { url: `${base}/search`,                  lastModified: now, changeFrequency: "daily",   priority: 0.8 },
    { url: `${base}/spots`,                   lastModified: now, changeFrequency: "weekly",  priority: 0.8 },
    { url: `${base}/magazine`,                lastModified: now, changeFrequency: "weekly",  priority: 0.8 },
    { url: `${base}/network`,                 lastModified: now, changeFrequency: "weekly",  priority: 0.8 },
    { url: `${base}/network/listings`,        lastModified: now, changeFrequency: "daily",   priority: 0.7 },
    { url: `${base}/nightwaves`,              lastModified: now, changeFrequency: "weekly",  priority: 0.7 },
    { url: `${base}/nightwaves/mixes`,        lastModified: now, changeFrequency: "weekly",  priority: 0.6 },
    { url: `${base}/nightwaves/releases`,     lastModified: now, changeFrequency: "weekly",  priority: 0.6 },
    { url: `${base}/nightwaves/playlists`,    lastModified: now, changeFrequency: "weekly",  priority: 0.6 },
    { url: `${base}/about`,                   lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];

  try {
    const supabase = getSupabase();

    const [events, articles, mixes, releases, profiles, spots] = await Promise.all([
      // Past events stay: their pages are still live.
      fetchAll("events", (from, to) => supabase.from("events").select("id, created_at")
        .eq("status", "approved").order("created_at", { ascending: false }).order("id").range(from, to)),
      fetchAll("articles", (from, to) => supabase.from("articles").select("id, updated_at, created_at")
        .eq("status", "published").order("created_at", { ascending: false }).order("id").range(from, to)),
      fetchAll("mixes", (from, to) => supabase.from("mixes").select("id, created_at")
        .eq("status", "approved").order("created_at", { ascending: false }).order("id").range(from, to)),
      fetchAll("music_releases", (from, to) => supabase.from("music_releases").select("id, created_at")
        .eq("status", "approved").order("created_at", { ascending: false }).order("id").range(from, to)),
      // Plain users have no public page; RLS already hides them, the filter makes it explicit.
      fetchAll("profiles", (from, to) => supabase.from("profiles").select("username, created_at")
        .neq("profile_type", "user").not("username", "is", null)
        .order("created_at", { ascending: false }).order("username").range(from, to)),
      fetchAll("spots", (from, to) => supabase.from("spots").select("slug, created_at")
        .eq("is_published", true).order("created_at", { ascending: false }).order("slug").range(from, to)),
    ]);

    const when = (r: Row) => {
      const d = r.updated_at ?? r.created_at;
      return d ? new Date(d) : now;
    };

    const profileRoutes: MetadataRoute.Sitemap = profiles.map((p) => ({
      url: `${base}${profileHref(p.username!)}`, lastModified: when(p), changeFrequency: "monthly", priority: 0.5,
    }));
    const eventRoutes: MetadataRoute.Sitemap = events.map((e) => ({
      url: `${base}/events/${e.id}`, lastModified: when(e), changeFrequency: "weekly", priority: 0.7,
    }));
    const spotRoutes: MetadataRoute.Sitemap = spots.map((s) => ({
      url: `${base}/spots/${s.slug}`, lastModified: when(s), changeFrequency: "weekly", priority: 0.7,
    }));
    const articleRoutes: MetadataRoute.Sitemap = articles.map((a) => ({
      url: `${base}/magazine/${a.id}`, lastModified: when(a), changeFrequency: "monthly", priority: 0.6,
    }));
    const mixRoutes: MetadataRoute.Sitemap = mixes.map((m) => ({
      url: `${base}/nightwaves/mix/${m.id}`, lastModified: when(m), changeFrequency: "monthly", priority: 0.5,
    }));
    const releaseRoutes: MetadataRoute.Sitemap = releases.map((r) => ({
      url: `${base}/nightwaves/release/${r.id}`, lastModified: when(r), changeFrequency: "monthly", priority: 0.5,
    }));

    const all = [...staticRoutes, ...profileRoutes, ...eventRoutes, ...spotRoutes, ...articleRoutes, ...mixRoutes, ...releaseRoutes];
    if (all.length > MAX_URLS) {
      console.error(`[sitemap] ${all.length} URLs exceed the ${MAX_URLS} limit of one sitemap, truncating. Split it with generateSitemaps().`);
      return all.slice(0, MAX_URLS);
    }
    return all;
  } catch (e) {
    console.error("[sitemap] failed, serving static routes only:", e);
    return staticRoutes;
  }
}
