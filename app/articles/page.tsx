import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import ArticlesClient from "./ArticlesClient";
import { getSupabase } from "../lib/supabase";

export const metadata: Metadata = {
  title: "Articles",
  description: "Read the latest articles about Greek nightlife, music venues, artists, and culture from the Nightup Journal.",
  twitter: {
    card: "summary_large_image",
    title: "Articles | Nightup.gr",
    description: "Read the latest articles about Greek nightlife, music venues, artists, and culture from the Nightup Journal.",
    images: ["https://nightup.gr/og-image.png"],
  },
};
export const dynamic = "force-dynamic";

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200&q=80";

export default async function ArticlesPage() {
  let articlesData: any[] = [];

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("articles")
      .select("id, title, category, published_at, read_time, hero_image, excerpt, featured")
      .eq("status", "published")
      .order("published_at", { ascending: false });

    if (!error && data) {
      articlesData = data.map((a) => ({
        id: String(a.id),
        title: a.title,
        category: a.category,
        date: a.published_at ?? "",
        readTime: a.read_time ?? "",
        image: a.hero_image || FALLBACK_IMAGE,
        excerpt: a.excerpt ?? "",
        featured: a.featured ?? false,
      }));
    }
  } catch {}

  const featured = articlesData.find((a) => a.featured) ?? articlesData[0];

  return (
    <div>
      <div className="max-w-7xl mx-auto px-4 pt-8 pb-4">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">The Nightup Journal.</h1>
        <p className="text-gray-400">Read between the sets.</p>
      </div>

      {featured && (
        <>
          {/* Hero — min 450px, dark overlay, button anchored inside bottom-right */}
          <div className="relative w-full overflow-hidden" style={{ minHeight: "450px" }}>
            <Image
              src={featured.image || FALLBACK_IMAGE}
              alt={featured.title}
              fill
              priority
              sizes="100vw"
              className="object-cover object-center"
            />
            {/* Dark overlay */}
            <div
              className="absolute inset-0"
              style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.75) 100%)" }}
            />

            {/* Text content — bottom left */}
            <div className="absolute bottom-8 left-0 right-0 max-w-5xl mx-auto px-6 flex items-end justify-between gap-4">
              <div className="flex-1 min-w-0">
                <span
                  className="inline-block text-xs font-semibold px-3 py-1 rounded-full mb-3"
                  style={{ backgroundColor: "#E8A020", color: "#0F0F1A" }}
                >
                  {featured.category}
                </span>
                <h2 className="text-xl md:text-3xl font-bold mb-2 leading-tight text-white">{featured.title}</h2>
                <div className="flex items-center gap-3 text-sm text-gray-300">
                  <span>
                    {new Date(featured.date).toLocaleDateString("en-GB", {
                      day: "numeric", month: "long", year: "numeric",
                    })}
                  </span>
                  <span>·</span>
                  <span>{featured.readTime}</span>
                </div>
              </div>

              {/* Read Article button — inside hero, bottom right */}
              <Link
                href={`/articles/${featured.id}`}
                className="flex-shrink-0 px-5 py-2.5 rounded-full text-sm font-semibold hover:opacity-90"
                style={{ backgroundColor: "#E8A020", color: "#0F0F1A" }}
              >
                Read Article →
              </Link>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 pt-8 pb-8">
            <ArticlesClient articles={articlesData} />
          </div>
        </>
      )}
    </div>
  );
}
