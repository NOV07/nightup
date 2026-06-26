import { Metadata } from "next";
import MagazineClient from "./MagazineClient";
import { getSupabase } from "../lib/supabase";

export const metadata: Metadata = {
  title: "Magazine",
  description: "Interviews, reviews, features and stories from the Greek nightlife and electronic music scene.",
  openGraph: {
    title: "Magazine | Nightup.gr",
    description: "Stories from the Greek nightlife and music scene.",
    images: [{ url: "https://nightup.gr/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Magazine | Nightup.gr",
    description: "Stories from the Greek nightlife and music scene.",
    images: ["https://nightup.gr/og-image.png"],
  },
};
export const dynamic = "force-dynamic";

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200&q=80";

export default async function MagazinePage() {
  let articlesData: any[] = [];
  let seriesList: Array<{ slug: string; count: number }> = [];

  try {
    const supabase = getSupabase();
    const [articlesRes, seriesRes] = await Promise.all([
      supabase
        .from("articles")
        .select("id, title, subtitle, slug, category, series, status, hero_image, published_at, excerpt, read_time, tags")
        .eq("status", "published")
        .order("published_at", { ascending: false }),
      supabase
        .from("articles")
        .select("series")
        .not("series", "is", null)
        .eq("status", "published"),
    ]);

    if (!articlesRes.error && articlesRes.data && articlesRes.data.length > 0) {
      articlesData = articlesRes.data.map((a) => ({
        id: String(a.id),
        title: a.title,
        category: a.category,
        date: a.published_at ?? "",
        readTime: a.read_time ? `${a.read_time} min read` : "",
        image: a.hero_image || FALLBACK_IMAGE,
        excerpt: a.excerpt ?? "",
        featured: (a as any).featured ?? false,
        series: a.series ?? null,
      }));
    }

    if (!seriesRes.error && seriesRes.data) {
      const map: Record<string, number> = {};
      seriesRes.data.forEach((r) => {
        if (r.series) map[r.series] = (map[r.series] || 0) + 1;
      });
      seriesList = Object.entries(map).map(([slug, count]) => ({ slug, count }));
    }
  } catch {}

  return <MagazineClient articles={articlesData} series={seriesList} fallbackImage={FALLBACK_IMAGE} />;
}
