import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getSupabase } from "../lib/supabase";
import T from "../components/T";
import { SearchResultCount } from "./SearchResultCount";

export const dynamic = "force-dynamic";

const FALLBACK = "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80";
const GOLD = "#E8A020";

interface Props {
  searchParams: Promise<{ q?: string }>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams;
  const qTrimmed = q?.trim();
  const title = qTrimmed ? `"${qTrimmed}" — Αναζήτηση` : "Αναζήτηση";
  const description = qTrimmed
    ? `Αποτελέσματα για "${qTrimmed}" — events, spots, μουσική και επαγγελματίες στο Nightup.gr.`
    : "Βρες events, spots, μουσική και επαγγελματίες στο Nightup.gr.";
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: "https://nightup.gr/og-image.png", width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["https://nightup.gr/og-image.png"],
    },
  };
}

type ResultType = "event" | "spot" | "mix" | "release" | "article" | "profile";

interface Result {
  id: string;
  title: string;
  subtitle?: string;
  image?: string | null;
  badge?: string;
  href: string;
  type: ResultType;
}

const TYPE_META: Record<ResultType, { label: string; heading: string }> = {
  event:   { label: "Event",   heading: "Events" },
  spot:    { label: "Spot",    heading: "Spots" },
  mix:     { label: "Mix",     heading: "Mixes" },
  release: { label: "Release", heading: "Releases" },
  article: { label: "Article", heading: "Articles" },
  profile: { label: "Profile", heading: "Profiles" },
};

const SECTION_ORDER: ResultType[] = ["event", "spot", "mix", "release", "article", "profile"];

export default async function SearchPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const groups: Record<ResultType, Result[]> = {
    event: [], spot: [], mix: [], release: [], article: [], profile: [],
  };

  if (query) {
    const supabase = getSupabase();
    const pattern = `%${query}%`;

    const [evRes, artRes, mixRes, profRes, spotRes, relRes] = await Promise.all([
      supabase.from("events").select("id, title, venue, city, date, image_url").ilike("title", pattern).eq("status", "approved").order("date", { ascending: true }).limit(10),
      supabase.from("articles").select("id, title, category, hero_image").ilike("title", pattern).eq("status", "published").limit(10),
      supabase.from("mixes").select("id, title, artist, genre, cover_image").ilike("title", pattern).eq("status", "approved").limit(10),
      supabase.from("profiles").select("id, username, display_name, avatar_url, network_subcategory, location").not("network_tab", "is", null).or(`display_name.ilike.%${query}%,network_subcategory.ilike.%${query}%`).limit(10),
      supabase.from("spots").select("id, name, slug, category, neighborhood, cover_image").ilike("name", pattern).eq("is_published", true).limit(10),
      supabase.from("music_releases").select("id, title, artist, type, cover_image").ilike("title", pattern).eq("status", "approved").limit(10),
    ]);

    evRes.data?.forEach((e: any) => groups.event.push({
      id: `ev-${e.id}`, type: "event",
      title: e.title,
      subtitle: [e.venue, e.city, e.date ? new Date(e.date).toLocaleDateString("el-GR", { day: "numeric", month: "short" }) : null].filter(Boolean).join(" · "),
      image: e.image_url,
      href: `/events/${e.id}`,
    }));

    artRes.data?.forEach((a: any) => groups.article.push({
      id: `art-${a.id}`, type: "article",
      title: a.title,
      subtitle: a.category,
      image: a.hero_image,
      href: `/magazine/${a.id}`,
    }));

    mixRes.data?.forEach((m: any) => groups.mix.push({
      id: `mix-${m.id}`, type: "mix",
      title: m.title,
      subtitle: [m.artist, m.genre].filter(Boolean).join(" · "),
      image: m.cover_image,
      href: `/nightwaves/mix/${m.id}`,
    }));

    profRes.data?.forEach((p: any) => groups.profile.push({
      id: `prof-${p.id}`, type: "profile",
      title: p.display_name,
      subtitle: [p.network_subcategory, p.location].filter(Boolean).join(" · "),
      image: p.avatar_url,
      href: `/profile/${p.username}`,
    }));

    spotRes.data?.forEach((s: any) => groups.spot.push({
      id: `spot-${s.id}`, type: "spot",
      title: s.name,
      subtitle: [s.category, s.neighborhood].filter(Boolean).join(" · "),
      image: s.cover_image,
      href: `/spots/${s.slug}`,
    }));

    relRes.data?.forEach((r: any) => groups.release.push({
      id: `rel-${r.id}`, type: "release",
      title: r.title,
      subtitle: r.artist,
      badge: r.type,
      image: r.cover_image,
      href: `/nightwaves/release/${r.id}`,
    }));
  }

  const total = Object.values(groups).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <div style={{ backgroundColor: "#0F0F1A", minHeight: "100vh" }}>
      <div style={{ maxWidth: "720px", margin: "0 auto", padding: "40px 24px 80px" }}>

        {/* Back */}
        <Link
          href="/"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#555", textDecoration: "none", fontSize: 13, marginBottom: 32 }}
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" viewBox="0 0 24 24">
            <path d="M15 19l-7-7 7-7" />
          </svg>
          <T k="search_breadcrumb" />
        </Link>

        {/* Heading */}
        <div style={{ marginBottom: 36 }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.25em", textTransform: "uppercase", color: GOLD, marginBottom: 10 }}>
            <T k="search_title" />
          </p>
          {query ? (
            <h1 style={{ fontFamily: "var(--font-spectral, Georgia, serif)", fontSize: "clamp(28px, 5vw, 42px)", fontWeight: 700, letterSpacing: "-0.03em", color: "#F4F4F5", lineHeight: 1.1, margin: 0 }}>
              <T k="search_results_for" />{" "}
              <em style={{ fontStyle: "italic", color: GOLD }}>&ldquo;{query}&rdquo;</em>
            </h1>
          ) : (
            <h1 style={{ fontFamily: "var(--font-spectral, Georgia, serif)", fontSize: "clamp(28px, 5vw, 42px)", fontWeight: 700, letterSpacing: "-0.03em", color: "#F4F4F5", lineHeight: 1.1, margin: 0 }}>
              <T k="search_placeholder" />
            </h1>
          )}
          {query && (
            <p style={{ marginTop: 10, fontSize: 13, color: "#555" }}>
              <SearchResultCount total={total} />
            </p>
          )}
        </div>

        {/* No query */}
        {!query && (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <p style={{ fontSize: 32, marginBottom: 16 }}>🔍</p>
            <p style={{ color: "#555", fontSize: 14 }}>
              <T k="search_hint" />
            </p>
          </div>
        )}

        {/* No results */}
        {query && total === 0 && (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <p style={{ fontSize: 32, marginBottom: 16 }}>😶</p>
            <p style={{ color: "#A1A1AA", fontSize: 15, marginBottom: 8 }}>
              <T k="search_nothing_for" /> &ldquo;{query}&rdquo;
            </p>
            <p style={{ color: "#555", fontSize: 13 }}><T k="search_try_again" /></p>
          </div>
        )}

        {/* Result sections */}
        {SECTION_ORDER.map((type) => {
          const items = groups[type];
          if (!items.length) return null;
          const meta = TYPE_META[type];
          return (
            <section key={type} style={{ marginBottom: 44 }}>
              {/* Section header */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <span style={{ width: 3, height: 16, background: GOLD, borderRadius: 2, flexShrink: 0 }} />
                <h2 style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: GOLD, fontFamily: "var(--font-sans)" }}>
                  {meta.heading}
                </h2>
                <span style={{ fontSize: 11, color: "#444", fontFamily: "var(--font-sans)" }}>{items.length}</span>
                <div style={{ flex: 1, height: 1, background: "rgba(232,160,32,0.12)" }} />
              </div>

              {/* Rows */}
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {items.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      padding: "10px 12px",
                      borderRadius: 8,
                      textDecoration: "none",
                      transition: "background 0.15s",
                      background: "transparent",
                    }}
                    onMouseEnter={(e: any) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                    onMouseLeave={(e: any) => (e.currentTarget.style.background = "transparent")}
                  >
                    {/* Thumbnail */}
                    <div style={{ width: 44, height: 44, borderRadius: type === "profile" ? "50%" : 6, overflow: "hidden", flexShrink: 0, background: "#1A1A28" }}>
                      <Image
                        src={item.image || FALLBACK}
                        alt={item.title}
                        width={44}
                        height={44}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    </div>

                    {/* Text */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 2 }}>
                        {item.badge && (
                          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: GOLD, border: `1px solid ${GOLD}40`, borderRadius: 3, padding: "1px 4px", flexShrink: 0, fontFamily: "var(--font-sans)" }}>
                            {item.badge}
                          </span>
                        )}
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: "#F4F4F5", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {item.title}
                        </p>
                      </div>
                      {item.subtitle && (
                        <p style={{ margin: 0, fontSize: 11, color: "#555", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {item.subtitle}
                        </p>
                      )}
                    </div>

                    {/* Arrow */}
                    <svg width="14" height="14" fill="none" stroke="#333" strokeWidth={1.8} strokeLinecap="round" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}

      </div>
    </div>
  );
}
