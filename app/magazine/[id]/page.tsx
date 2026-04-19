import { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { articles } from "../../lib/data";
import { getSupabase } from "../../lib/supabase";
import TranslatedArticleBody from "../../components/TranslatedArticleBody";

interface Props { params: Promise<{ id: string }>; }

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200&q=80";

function formatSlug(slug: string) {
  return slug.split("-").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function extractFirstBlockquote(html: string): string | null {
  const match = html.match(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/i);
  if (!match) return null;
  return match[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function extractNightUpTip(html: string): string | null {
  const pMatches = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)];
  for (const m of pMatches) {
    if (/nightup\s+tip/i.test(m[1])) {
      return m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    }
  }
  return null;
}

function extractSources(html: string): Array<{ url: string; domain: string }> {
  const ulMatches = [...html.matchAll(/<ul[^>]*>([\s\S]*?)<\/ul>/gi)];
  if (!ulMatches.length) return [];
  const lastUl = ulMatches[ulMatches.length - 1][1];
  const linkMatches = [...lastUl.matchAll(/href="(https?:\/\/[^"]+)"/gi)];
  return linkMatches.map((m) => {
    const url = m[1];
    try {
      return { url, domain: new URL(url).hostname.replace(/^www\./, "") };
    } catch {
      return { url, domain: url };
    }
  });
}

function generateSummaryBullets(excerpt: string, body: string, content: string): string[] {
  const raw = excerpt || body || content;
  const clean = raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const sentences = (clean.match(/[^.!?]+[.!?]+/g) || [])
    .map((s) => s.trim())
    .filter((s) => s.length > 25 && s.length < 250);
  return sentences.slice(0, 3);
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
        seriesArticles = data.map((a) => ({
          id: String(a.id),
          title: a.title,
          series_order: a.series_order ?? null,
        }));
      }
    } catch {}
  }

  const formattedDate = new Date(article.date).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const htmlContent = article.content || "";
  const firstBlockquote = htmlContent ? extractFirstBlockquote(htmlContent) : null;
  const nightUpTip = htmlContent ? extractNightUpTip(htmlContent) : null;
  const sources = htmlContent ? extractSources(htmlContent) : [];
  const summaryBullets = generateSummaryBullets(article.excerpt, article.body, htmlContent);

  const excerptDisplay =
    article.excerpt ||
    (article.body ? article.body.slice(0, 150) + (article.body.length > 150 ? "…" : "") : "");

  return (
    <div style={{ backgroundColor: "#0F0F1A", minHeight: "100vh" }}>

      {/* Scoped article-content styles */}
      <style>{`
        .article-content h2 { color: #fff; font-size: 26px; font-weight: 600; margin-top: 40px; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid rgba(232,160,32,0.2); }
        .article-content h3 { color: #fff; font-size: 20px; font-weight: 500; margin-top: 28px; margin-bottom: 12px; }
        .article-content p { color: rgba(255,255,255,0.82); font-size: 17px; line-height: 1.9; margin-bottom: 20px; }
        .article-content strong { color: #fff; }
        .article-content a { color: #E8A020; }
        .article-content a:hover { text-decoration: underline; }
        .article-content blockquote { border-left: 3px solid #E8A020; padding: 16px 20px; background: rgba(232,160,32,0.06); border-radius: 0 8px 8px 0; color: rgba(255,255,255,0.7); font-style: italic; margin: 28px 0; }
        .article-content ul, .article-content ol { color: rgba(255,255,255,0.82); padding-left: 24px; line-height: 1.85; margin-bottom: 20px; }
        .article-content li { margin-bottom: 10px; }
      `}</style>

      {/* ── 1. HERO ───────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-4 pt-10 pb-8">

        {/* Back + series breadcrumb */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/magazine" className="text-sm transition-colors" style={{ color: "rgba(255,255,255,0.4)" }}
            onMouseOver={(e) => (e.currentTarget.style.color = "#fff")}
            onMouseOut={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}
          >
            ← All Articles
          </Link>
          {article.series && (
            <Link
              href={`/magazine/series/${article.series}`}
              className="text-sm font-medium transition-opacity hover:opacity-80"
              style={{ color: "#E8A020" }}
            >
              {formatSlug(article.series)} Series →
            </Link>
          )}
        </div>

        {/* Category badge */}
        <span
          className="inline-block text-xs font-bold px-3 py-1 rounded-full mb-5"
          style={{ backgroundColor: "#E8A020", color: "#0F0F1A", letterSpacing: "0.1em", textTransform: "uppercase" }}
        >
          {article.category}
        </span>

        {/* Title */}
        <h1
          className="mb-5"
          style={{ fontSize: "clamp(28px, 5vw, 48px)", fontWeight: 300, color: "#ffffff", lineHeight: 1.15 }}
        >
          {article.title}
        </h1>

        {/* Excerpt / standfirst */}
        {excerptDisplay && (
          <p className="mb-6" style={{ color: "rgba(255,255,255,0.65)", fontSize: "18px", fontStyle: "italic", lineHeight: 1.7 }}>
            {excerptDisplay}
          </p>
        )}

        {/* Meta row */}
        <div className="flex items-center gap-3 text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
          <span>{formattedDate}</span>
          {article.read_time && (
            <>
              <span>·</span>
              <span>{article.read_time} min read</span>
            </>
          )}
        </div>
      </div>

      {/* Hero image */}
      <div className="max-w-5xl mx-auto px-4">
        <div
          className="relative w-full overflow-hidden rounded-2xl"
          style={{ height: "480px", border: "1px solid rgba(232,160,32,0.2)" }}
        >
          <Image
            src={article.image || FALLBACK_IMAGE}
            alt={article.title}
            fill
            sizes="(max-width: 1280px) 100vw, 1280px"
            className="object-cover"
            priority
          />
        </div>
      </div>

      {/* Gold divider */}
      <div className="max-w-5xl mx-auto px-4 mt-10 mb-10">
        <div style={{ height: "1px", backgroundColor: "rgba(232,160,32,0.2)" }} />
      </div>

      {/* ── 2. TWO-COLUMN LAYOUT ──────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-12 items-start">

          {/* Main content */}
          <div>
            {article.content ? (
              <div className="article-content" dangerouslySetInnerHTML={{ __html: article.content }} />
            ) : (
              <div className="article-content">
                <TranslatedArticleBody body={article.body} />
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-5 lg:sticky lg:top-8 h-fit order-first lg:order-last">

            {/* Summary box */}
            {summaryBullets.length > 0 && (
              <div
                className="rounded-xl p-5"
                style={{ backgroundColor: "rgba(232,160,32,0.06)", border: "1px solid rgba(232,160,32,0.2)" }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <div style={{ width: "20px", height: "2px", backgroundColor: "#E8A020", flexShrink: 0 }} />
                  <p className="text-xs font-bold uppercase" style={{ color: "#E8A020", letterSpacing: "0.1em" }}>
                    Σύνοψη
                  </p>
                </div>
                <ul className="space-y-3">
                  {summaryBullets.map((bullet, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm" style={{ color: "rgba(255,255,255,0.75)", lineHeight: 1.6 }}>
                      <span
                        className="mt-2 flex-shrink-0 rounded-full"
                        style={{ width: "6px", height: "6px", backgroundColor: "#E8A020", display: "block" }}
                      />
                      {bullet}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Category */}
            <div
              className="rounded-xl p-5"
              style={{ backgroundColor: "#0D0D1A", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <p className="text-xs uppercase mb-3" style={{ color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em" }}>
                Κατηγορία
              </p>
              <span
                className="inline-block text-sm font-semibold px-3 py-1 rounded-full"
                style={{ backgroundColor: "#E8A020", color: "#0F0F1A" }}
              >
                {article.category}
              </span>
            </div>

            {/* Read time */}
            {article.read_time && (
              <div
                className="rounded-xl p-5 flex items-center gap-3"
                style={{ backgroundColor: "rgba(232,160,32,0.06)", border: "1px solid rgba(232,160,32,0.2)" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E8A020" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>
                  <span style={{ color: "#fff", fontWeight: 600 }}>{article.read_time}</span> min ανάγνωση
                </p>
              </div>
            )}

          </aside>
        </div>
      </div>

      {/* ── 3. QUOTE CALLOUT ──────────────────────────────────── */}
      {firstBlockquote && (
        <div style={{ backgroundColor: "rgba(232,160,32,0.04)", padding: "64px 24px", margin: "64px 0" }}>
          <div className="max-w-2xl mx-auto text-center">
            <div
              style={{ fontSize: "80px", color: "#E8A020", lineHeight: "0.8", fontFamily: "Georgia, serif", marginBottom: "16px", userSelect: "none" }}
            >
              &ldquo;
            </div>
            <p style={{ fontSize: "22px", color: "#ffffff", fontStyle: "italic", lineHeight: 1.65 }}>
              {firstBlockquote}
            </p>
          </div>
        </div>
      )}

      {/* ── 4. NIGHTUP TIP ────────────────────────────────────── */}
      {nightUpTip && (
        <div className="max-w-5xl mx-auto px-4 my-8">
          <div
            className="flex rounded-xl overflow-hidden"
            style={{ backgroundColor: "rgba(232,160,32,0.08)" }}
          >
            <div style={{ width: "4px", backgroundColor: "#E8A020", flexShrink: 0 }} />
            <div style={{ padding: "24px 28px" }}>
              <span
                className="inline-block text-xs font-bold px-3 py-1 rounded-full mb-3"
                style={{ backgroundColor: "#E8A020", color: "#0F0F1A" }}
              >
                💡 NightUp Tip
              </span>
              <p style={{ color: "#ffffff", fontSize: "16px", lineHeight: 1.7 }}>{nightUpTip}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── 5. SOURCES ────────────────────────────────────────── */}
      {sources.length > 0 && (
        <div className="max-w-5xl mx-auto px-4 my-10">
          <div className="flex items-center gap-3 mb-5">
            <div style={{ width: "20px", height: "2px", backgroundColor: "#E8A020" }} />
            <h2 className="text-xs font-bold uppercase" style={{ color: "#E8A020", letterSpacing: "0.1em" }}>
              Πηγές
            </h2>
          </div>
          <div className="space-y-2">
            {sources.map((s, i) => (
              <a
                key={i}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg transition-colors"
                style={{ backgroundColor: "#0D0D1A", border: "1px solid rgba(255,255,255,0.08)", padding: "12px 16px", display: "flex" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                <span className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>{s.domain}</span>
                <span className="text-xs ml-auto truncate" style={{ color: "rgba(255,255,255,0.25)", maxWidth: "260px" }}>{s.url}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* ── 6. SERIES NAVIGATION ──────────────────────────────── */}
      {seriesArticles.length > 1 && (
        <div
          className="max-w-5xl mx-auto px-4 mt-12 pt-10 border-t"
          style={{ borderColor: "rgba(232,160,32,0.15)" }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div style={{ width: "20px", height: "2px", backgroundColor: "#E8A020" }} />
            <h2 className="text-xs font-bold uppercase" style={{ color: "#E8A020", letterSpacing: "0.1em" }}>
              Περισσότερα από τη σειρά — {article.series ? formatSlug(article.series) : ""}
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-12">
            {seriesArticles.map((s, idx) => {
              const isCurrent = s.id === id;
              return (
                <Link
                  key={s.id}
                  href={`/magazine/${s.id}`}
                  className={isCurrent ? "pointer-events-none" : "group block"}
                  style={{
                    display: "block",
                    backgroundColor: "#0D0D1A",
                    border: `1px solid ${isCurrent ? "#E8A020" : "rgba(255,255,255,0.08)"}`,
                    borderRadius: "12px",
                    padding: "16px",
                    textDecoration: "none",
                  }}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="text-xs font-bold flex-shrink-0"
                      style={{ color: "#E8A020", marginTop: "2px", minWidth: "20px" }}
                    >
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0">
                      {isCurrent && (
                        <span
                          className="inline-block text-xs font-medium px-2 py-0.5 rounded-full mb-2"
                          style={{ backgroundColor: "#E8A020", color: "#0F0F1A" }}
                        >
                          Διαβάζεις τώρα
                        </span>
                      )}
                      <p
                        className="text-sm leading-snug"
                        style={{ color: isCurrent ? "#ffffff" : "rgba(255,255,255,0.6)", fontWeight: isCurrent ? 600 : 400 }}
                      >
                        {s.title}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 7. SHARE + BACK ───────────────────────────────────── */}
      <div
        className="max-w-5xl mx-auto px-4 py-10 border-t"
        style={{ borderColor: "rgba(255,255,255,0.08)" }}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <p className="text-xs uppercase mb-3" style={{ color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em" }}>
              Μοιράσου το άρθρο
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=${encodeURIComponent("https://nightup.gr")}`}
                target="_blank" rel="noopener noreferrer"
                className="px-4 py-2 rounded-lg text-xs font-medium transition-all"
                style={{ backgroundColor: "#0D0D1A", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.55)" }}
              >
                Twitter / X
              </a>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent("https://nightup.gr")}`}
                target="_blank" rel="noopener noreferrer"
                className="px-4 py-2 rounded-lg text-xs font-medium transition-all"
                style={{ backgroundColor: "#0D0D1A", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.55)" }}
              >
                Facebook
              </a>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(article.title + " https://nightup.gr")}`}
                target="_blank" rel="noopener noreferrer"
                className="px-4 py-2 rounded-lg text-xs font-medium transition-all"
                style={{ backgroundColor: "#0D0D1A", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.55)" }}
              >
                WhatsApp
              </a>
            </div>
          </div>
          <Link
            href="/magazine"
            className="text-sm transition-colors"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            ← Πίσω στο Magazine
          </Link>
        </div>
      </div>

    </div>
  );
}
