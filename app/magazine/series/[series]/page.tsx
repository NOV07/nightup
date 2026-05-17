import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabase } from "../../../lib/supabase";

interface Props { params: Promise<{ series: string }>; }

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200&q=80";

function formatSlug(slug: string) {
  return slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { series } = await params;
  const title = formatSlug(series);
  return { title: `${title} — Nightup Series`, description: `A Nightup series: ${title}` };
}

export const dynamic = "force-dynamic";

export default async function SeriesPage({ params }: Props) {
  const { series } = await params;
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("articles")
    .select("id, title, category, excerpt, published_at, read_time, hero_image, series_order")
    .eq("series", series)
    .eq("status", "published")
    .order("series_order", { ascending: true });

  if (error || !data || data.length === 0) notFound();

  const title = formatSlug(series);

  return (
    <div style={{ minHeight: "100vh" }}>
      <div className="max-w-5xl mx-auto px-4 pt-12 pb-8">
        <Link href="/magazine" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-8 transition-colors">
          ← All Articles
        </Link>
        <div className="w-12 h-0.5 mb-4" style={{ backgroundColor: "#E8A020" }} />
        <p className="text-sm font-semibold tracking-widest uppercase mb-3" style={{ color: "#E8A020" }}>A Nightup Series</p>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">{title}</h1>
        <p className="text-gray-400">{data.length} {data.length === 1 ? "article" : "articles"}</p>
      </div>

      <div className="max-w-5xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.map((a, idx) => (
            <Link
              key={a.id}
              href={`/magazine/${a.id}`}
              className="group block rounded-2xl overflow-hidden card-hover"
              style={{ backgroundColor: "#1A1A2E" }}
            >
              <div className="relative h-48 overflow-hidden">
                <Image
                  src={a.hero_image || FALLBACK_IMAGE}
                  alt={a.title}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <span className="absolute top-3 left-3 text-xs font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: "#E8A020", color: "#0F0F1A" }}>
                  {String(idx + 1).padStart(2, "0")}
                </span>
              </div>
              <div className="p-5">
                <p className="text-xs font-semibold mb-2" style={{ color: "#E8A020" }}>{a.category}</p>
                <h3 className="font-semibold text-base mb-2 line-clamp-2 leading-snug">{a.title}</h3>
                {a.excerpt && <p className="text-xs text-gray-400 mb-3 line-clamp-2">{a.excerpt}</p>}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{a.published_at ? new Date(a.published_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : ""}</span>
                  {a.read_time && <span>{a.read_time} min read</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
