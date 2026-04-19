import { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { articles } from "../../lib/data";
import { getSupabase } from "../../lib/supabase";
import TranslatedText from "../../components/TranslatedText";
import TranslatedArticleBody from "../../components/TranslatedArticleBody";

interface Props { params: Promise<{ id: string }>; }

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200&q=80";

function formatSlug(slug: string) {
  return slug.split("-").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

interface Article {
  id: string;
  title: string;
  category: string;
  date: string;
  read_time: number | null;
  image: string;
  excerpt: string;
  body: string;
  content: string;
  series: string | null;
  series_order: number | null;
  featured: boolean;
}

async function getArticle(id: string): Promise<Article | null> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("articles")
      .select("*")
      .eq("id", id)
      .eq("status", "approved")
      .single();
    if (!error && data) {
      return {
        id: String(data.id),
        title: data.title,
        category: data.category,
        date: data.date ?? "",
        read_time: data.read_time ?? null,
        image: data.image_url ?? (data as any).image ?? "",
        excerpt: data.excerpt ?? "",
        body: data.body ?? "",
        content: data.content ?? "",
        series: data.series ?? null,
        series_order: data.series_order ?? null,
        featured: (data as any).featured ?? false,
      };
    }
  } catch {}
  const mock = articles.find((a) => a.id === id);
  if (!mock) return null;
  return {
    id: mock.id,
    title: mock.title,
    category: mock.category,
    date: mock.date,
    read_time: (mock as any).readTime ?? null,
    image: (mock as any).image ?? "",
    excerpt: (mock as any).excerpt ?? "",
    body: (mock as any).body ?? "",
    content: "",
    series: null,
    series_order: null,
    featured: (mock as any).featured ?? false,
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const article = await getArticle(id);
  if (!article) return { title: "Article not found" };
  return { title: article.title, description: article.excerpt || article.title };
}

export default async function MagazineArticlePage({ params }: Props) {
  const { id } = await params;
  const article = await getArticle(id);
  if (!article) notFound();

  let seriesArticles: Array<{ id: string; title: string; series_order: number | null }> = [];
  if (article.series) {
    try {
      const supabase = getSupabase();
      const { data } = await supabase
        .from("articles")
        .select("id, title, series_order")
        .eq("series", article.series)
        .eq("status", "approved")
        .order("series_order", { ascending: true });
      if (data) {
        seriesArticles = data.map((a) => ({ id: String(a.id), title: a.title, series_order: a.series_order ?? null }));
      }
    } catch {}
  }

  const related = articles.filter((a) => a.id !== id && (a as any).category === article.category).slice(0, 3);
  const formattedDate = new Date(article.date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const displayReadTime = article.read_time ? `${article.read_time} min read` : null;

  return (
    <div>
      <div className="relative h-64 md:h-96 w-full overflow-hidden">
        <Image src={article.image || FALLBACK_IMAGE} alt={article.title} fill sizes="100vw" className="object-cover" priority />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 30%, #0F0F1A 100%)" }} />
      </div>

      <div className="max-w-3xl mx-auto px-4">
        <div className="py-6">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/magazine" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
              ← All Articles
            </Link>
            {article.series && (
              <Link href={`/magazine/series/${article.series}`} className="text-sm font-medium hover:opacity-80 transition-opacity" style={{ color: "#E8A020" }}>
                {formatSlug(article.series)} Series →
              </Link>
            )}
          </div>
          <span className="inline-block text-xs font-semibold px-3 py-1 rounded-full mb-4" style={{ backgroundColor: "#E8A020", color: "#0F0F1A" }}>
            {article.category}
          </span>
          <h1 className="text-3xl md:text-4xl font-bold mb-4 leading-tight"><TranslatedText text={article.title} /></h1>
          <div className="flex items-center gap-3 text-sm text-gray-400">
            <span>{formattedDate}</span>
            {displayReadTime && <><span>·</span><span>{displayReadTime}</span></>}
          </div>
        </div>

        <article className="pb-16">
          {article.content ? (
            <div className="article-content" dangerouslySetInnerHTML={{ __html: article.content }} />
          ) : (
            <div className="article-content">
              <TranslatedArticleBody body={article.body} />
            </div>
          )}
        </article>

        {seriesArticles.length > 1 && (
          <div className="pb-12 border-t pt-8" style={{ borderColor: "#1A1A2E" }}>
            <h2 className="text-base font-semibold mb-4" style={{ color: "#E8A020" }}>
              More in {article.series ? formatSlug(article.series) : "this series"}
            </h2>
            <ol className="space-y-3">
              {seriesArticles.map((s, idx) => (
                <li key={s.id} className="flex items-start gap-3">
                  <span className="text-xs font-bold mt-0.5 w-6 flex-shrink-0" style={{ color: "#E8A020" }}>
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  {s.id === id ? (
                    <span className="text-sm font-medium" style={{ color: "#E8A020" }}>{s.title}</span>
                  ) : (
                    <Link href={`/magazine/${s.id}`} className="text-sm text-gray-300 hover:text-white transition-colors">{s.title}</Link>
                  )}
                </li>
              ))}
            </ol>
          </div>
        )}

        <div className="pb-10 border-t pt-8" style={{ borderColor: "#1A1A2E" }}>
          <p className="text-sm text-gray-400 mb-3">Share this article:</p>
          <div className="flex flex-wrap gap-3">
            <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=${encodeURIComponent("https://nightup.gr")}`} target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-lg text-xs font-medium hover:border-white/40" style={{ backgroundColor: "#1A1A2E", border: "1px solid #333", color: "#aaa" }}>Twitter / X</a>
            <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent("https://nightup.gr")}`} target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-lg text-xs font-medium hover:border-white/40" style={{ backgroundColor: "#1A1A2E", border: "1px solid #333", color: "#aaa" }}>Facebook</a>
            <a href={`https://wa.me/?text=${encodeURIComponent(article.title + " https://nightup.gr")}`} target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-lg text-xs font-medium hover:border-white/40" style={{ backgroundColor: "#1A1A2E", border: "1px solid #333", color: "#aaa" }}>WhatsApp</a>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 pb-12">
          <h2 className="text-xl font-semibold mb-6">Related Articles</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {related.map((a) => (
              <Link key={a.id} href={`/magazine/${a.id}`} className="group block rounded-2xl overflow-hidden card-hover" style={{ backgroundColor: "#1A1A2E" }}>
                <div className="relative h-40 overflow-hidden">
                  <Image src={(a as any).image || FALLBACK_IMAGE} alt={a.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="p-4">
                  <p className="text-xs font-semibold mb-1" style={{ color: "#E8A020" }}>{(a as any).category}</p>
                  <h3 className="text-sm font-medium line-clamp-2">{a.title}</h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
