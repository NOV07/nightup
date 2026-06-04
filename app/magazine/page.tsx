import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
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

function formatSlug(slug: string) {
  return slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

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
  } catch {
    // fall back to mock data
  }

  const featured = articlesData.find((a) => a.featured) ?? articlesData[0];

  return (
    <div>
      <div className="max-w-7xl mx-auto px-4 pt-8 pb-4">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">The Nightup Journal.</h1>
        <p className="text-gray-400">Read between the sets.</p>
      </div>

      {articlesData.length === 0 ? (
        <p className="text-white/40 text-center py-20">No articles published yet.</p>
      ) : (
        <>
          {featured && (
            <div className="relative w-full overflow-hidden" style={{ minHeight: "450px" }}>
              <Image src={featured.image || FALLBACK_IMAGE} alt={featured.title} fill priority sizes="100vw" className="object-cover object-center" />
              <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.75) 100%)" }} />
              <div className="absolute bottom-8 left-0 right-0 max-w-5xl mx-auto px-6 flex items-end justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <span className="inline-block text-xs font-semibold px-3 py-1 rounded-full mb-3" style={{ backgroundColor: "#E8A020", color: "#0F0F1A" }}>
                    {featured.category}
                  </span>
                  <h2 className="text-xl md:text-3xl font-bold mb-2 leading-tight text-white">{featured.title}</h2>
                  <div className="flex items-center gap-3 text-sm text-gray-300">
                    <span>{new Date(featured.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</span>
                    {featured.readTime && <><span>·</span><span>{featured.readTime}</span></>}
                  </div>
                </div>
                <Link href={`/magazine/${featured.id}`} className="flex-shrink-0 px-5 py-2.5 rounded-full text-sm font-semibold hover:opacity-90" style={{ backgroundColor: "#E8A020", color: "#0F0F1A" }}>
                  Read Article →
                </Link>
              </div>
            </div>
          )}

          <div className="max-w-7xl mx-auto px-4 pt-8 pb-8">
            <MagazineClient articles={articlesData} />
          </div>
        </>
      )}

      {seriesList.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 pb-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="section-divider" />
            <h2 className="text-xl font-semibold">Series</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {seriesList.map(({ slug, count }) => (
              <Link
                key={slug}
                href={`/magazine/series/${encodeURIComponent(slug)}`}
                className="group block rounded-2xl p-6 card-hover"
                style={{ backgroundColor: "#1A1A2E", border: "1px solid rgba(232,160,32,0.1)" }}
              >
                <p className="font-semibold text-base mb-1 group-hover:text-white transition-colors">{formatSlug(slug)}</p>
                <p className="text-xs text-gray-400 mb-4">{count} {count === 1 ? "article" : "articles"}</p>
                <span className="text-sm font-medium" style={{ color: "#E8A020" }}>Read Series →</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
