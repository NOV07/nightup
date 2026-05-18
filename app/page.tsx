import Link from "next/link";
import Image from "next/image";
import HeroSearch from "./components/HeroSearch";
import EventTabs from "./components/EventsTabs";
import { getSupabase } from "./lib/supabase";
import FadeInObserver from "./components/FadeInObserver";
import HeroSlider from "./components/HeroSlider";
import NightwavesHomeCard from "./components/NightwavesHomeCard";

export const dynamic = "force-dynamic";

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80";

/* ─── Section header component ──────────────────────────── */
function SectionHeader({
  title, href, linkLabel = "View all →",
}: { title: string; href: string; linkLabel?: string }) {
  return (
    <div style={{ marginTop: "var(--space-7)", marginBottom: "var(--space-3)" }}>
      <div className="flex items-center justify-between">
        <div>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: "11px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--text-muted)", margin: 0 }}>{title}</p>
          <div style={{ width: "24px", height: "1px", backgroundColor: "var(--gold)", marginTop: "6px" }} />
        </div>
        <Link
          href={href}
          className="group flex items-center gap-1 text-sm font-medium transition-colors hover:text-white"
          style={{ color: "var(--gold)" }}
        >
          {linkLabel}
          <svg className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
}

export default async function HomePage() {
  let hotCards: any[] = [];
  let popularCards: any[] = [];
  let latestArticles: any[] = [];
  let newReleases: any[] = [];
  let allThisWeekCards: any[] = [];
  let nightwavesItems: any[] = [];

  const _now = new Date();
  // Use local date parts to avoid UTC-shift cutting off today's events
  const _y = _now.getFullYear();
  const _m = String(_now.getMonth() + 1).padStart(2, "0");
  const _d = String(_now.getDate()).padStart(2, "0");
  const today = `${_y}-${_m}-${_d}`;

  try {
    const supabase = getSupabase();
    const [evRes, artRes, relRes, mixFeedRes, playFeedRes, nwRes] = await Promise.all([
      supabase
        .from("events")
        .select("id, title, image_url, genre, price, date, time, venue, city, interested_count, going_count, nightup_pick, is_radar_pick")
        .eq("status", "approved")
        .gte("date", today)
        .order("date", { ascending: true })
        .limit(20),
      supabase
        .from("articles")
        .select("id, title, category, published_at, read_time, hero_image, excerpt")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(3),
      supabase.from("music_releases").select("id, title, artist, type, cover_image, spotify_url, soundcloud_url, is_promoted, created_at").eq("status", "approved").order("created_at", { ascending: false }).limit(5),
      supabase.from("mixes").select("id, title, artist, genre, cover_image, soundcloud_url, created_at").eq("status", "approved").order("created_at", { ascending: false }).limit(5),
      supabase.from("playlists").select("id, title, platform, embed_url, cover_image, created_at").eq("status", "approved").order("created_at", { ascending: false }).limit(5),
      supabase.from("nightwaves_items").select("id, title, artist, subtitle, cover_url, type, source, source_url").eq("featured_on_home", true).order("order_index", { ascending: true }).limit(4),
    ]);

    const toCard = (e: any, badge: string) => ({
      id: String(e.id), title: e.title, image: e.image_url || FALLBACK_IMAGE,
      genre: e.genre, price: e.price ?? "", date: e.date, time: e.time ?? "",
      venue: e.venue, city: e.city,
      interestedCount: e.interested_count ?? 0, goingCount: e.going_count ?? 0,
      featured: e.featured ?? false,
      badge: e.is_radar_pick ? "Nightup Radar" : badge,
    });
    if (evRes.data && evRes.data.length > 0) {
      const featuredEvents = evRes.data
        .filter((e: any) => e.nightup_pick === true)
        .sort((a: any, b: any) => (b.interested_count + b.going_count) - (a.interested_count + a.going_count))
        .slice(0, 3);
      hotCards = featuredEvents.map((e: any) => toCard(e, "🔥 Hot"));
      const hotIds = new Set(featuredEvents.map((e: any) => e.id));
      popularCards = evRes.data
        .filter((e: any) => !hotIds.has(e.id))
        .sort((a: any, b: any) => (b.interested_count + b.going_count) - (a.interested_count + a.going_count))
        .slice(0, 2)
        .map((e: any) => toCard(e, "📈 Popular"));
      allThisWeekCards = evRes.data
        .slice(0, 8)
        .map((e: any) => toCard(e, ""));
    }
    if (artRes.data && artRes.data.length > 0) {
      latestArticles = artRes.data.map((a: any) => ({
        id: String(a.id),
        title: a.title,
        category: a.category,
        date: a.published_at ?? "",
        readTime: a.read_time ?? "",
        image: a.hero_image || FALLBACK_IMAGE,
        excerpt: a.excerpt ?? "",
      }));
    }
    const combined = [
      ...(relRes.data ?? []).map((r: any) => ({ ...r, _contentType: "release", typeBadge: r.type ?? "Release", href: `/nightwaves/release/${r.id}`, external: false })),
      ...(mixFeedRes.data ?? []).map((m: any) => ({ ...m, _contentType: "mix", typeBadge: "Mix", href: `/nightwaves/mix/${m.id}`, external: false })),
      ...(playFeedRes.data ?? []).map((p: any) => ({ ...p, _contentType: "playlist", typeBadge: "Playlist", href: p.embed_url ?? "#", external: true })),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);
    if (combined.length > 0) newReleases = combined;
    if (nwRes.data && nwRes.data.length > 0) nightwavesItems = nwRes.data;
  } catch {}

  const hotPopularCards = [...hotCards, ...popularCards];

  const heroSlides = [
    ...([...hotCards].slice(0, 2).map((e: any) => ({
      id: e.id,
      type: "event" as const,
      eyebrow: "Event of the week",
      title: e.title,
      subtitle: `${e.venue} · ${e.city}`,
      meta: [new Date(e.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" }), e.venue, e.price ? `From ${e.price}` : "Free entry"],
      ctaLabel: "Get tickets",
      ctaHref: `/events/${e.id}`,
      image: e.image || undefined,
      bgColor: "linear-gradient(160deg,#0e1520,#080f18)",
    }))),
    ...(latestArticles.slice(0, 1).map((a: any) => ({
      id: a.id,
      type: "article" as const,
      eyebrow: a.category || "Magazine",
      title: a.title,
      subtitle: a.excerpt || "",
      meta: ["Magazine", `${a.readTime} read`],
      ctaLabel: "Read now",
      ctaHref: `/magazine/${a.id}`,
      image: a.image || undefined,
      bgColor: "linear-gradient(160deg,#16201a,#0c160e)",
    }))),
    ...(newReleases.slice(0, 1).map((r: any) => ({
      id: r.id,
      type: "release" as const,
      eyebrow: "New Release",
      title: r.artist ? `${r.artist} — ${r.title}` : r.title,
      subtitle: "Stream now on Nightwaves",
      meta: [r.typeBadge, "Out now"],
      ctaLabel: "Listen",
      ctaHref: r.href || "/nightwaves",
      image: r.cover_image || undefined,
      bgColor: "linear-gradient(160deg,#1a1408,#100c04)",
    }))),
  ];

  return (
    <div style={{ backgroundColor: "var(--bg-primary)", minHeight: "100vh" }}>
      <FadeInObserver />

      {/* ── HERO SLIDER ── */}
      <HeroSlider slides={heroSlides.filter((s, i, a) => a.findIndex(x => x.id === s.id) === i)} />

      {/* ── EVENTS ── */}
      <section className="events" style={{ padding: "32px" }}>
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "flex-end", marginBottom: "14px",
        }}>
          <div>
            <p style={{
              fontFamily: "var(--font-sans)", fontSize: "11px",
              letterSpacing: "0.15em", textTransform: "uppercase",
              color: "var(--text-muted)", margin: 0,
            }}>Events</p>
            <div style={{ width: "20px", height: "1px", background: "var(--gold)", marginTop: "5px" }} />
          </div>
          <Link href="/events" style={{
            fontFamily: "var(--font-sans)", fontSize: "11px",
            color: "var(--text-muted)", letterSpacing: "0.05em",
            textDecoration: "none",
          }}>View all →</Link>
        </div>
        <EventTabs thisWeekCards={allThisWeekCards} hotPopularCards={hotPopularCards} />
      </section>

      {/* ── DISCOVER ── */}
      <section className="discover-section" style={{
        padding: "0 32px 32px",
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{
          padding: "28px 0 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
        }}>
          <div>
            <p style={{
              fontFamily: "var(--font-sans)", fontSize: "11px",
              letterSpacing: "0.15em", textTransform: "uppercase",
              color: "var(--text-muted)", margin: 0,
            }}>Discover</p>
            <div style={{ width: "20px", height: "1px",
              background: "var(--gold)", marginTop: "5px" }} />
          </div>
          <Link href="/magazine" style={{
            fontFamily: "var(--font-mono)", fontSize: "9px",
            letterSpacing: "0.1em", textTransform: "uppercase",
            color: "var(--text-muted)", textDecoration: "none",
          }}>All →</Link>
        </div>

        <div className="discover-grid-responsive" style={{
          display: "grid",
          gridTemplateColumns: "1.4fr 1fr",
          gridTemplateRows: "auto auto",
          gap: "1px",
          background: "rgba(255,255,255,0.04)",
        }}>

          {/* Featured article — col 1, spans 2 rows */}
          {latestArticles[0] && (
            <Link href={`/magazine/${latestArticles[0].id}`}
              className="discover-card reveal-left"
              style={{
                gridColumn: "1", gridRow: "1 / 3",
                background: "var(--bg-primary)",
                textDecoration: "none",
                display: "flex", flexDirection: "column",
                overflow: "hidden",
              }}>
              <div style={{
                position: "relative", flexShrink: 0,
                overflow: "hidden",
              }}>
                <Image src={latestArticles[0].image}
                  alt={latestArticles[0].title}
                  width={800} height={500}
                  className="discover-card-img"
                  style={{ width: "100%", height: "280px",
                    objectFit: "cover", display: "block" }} />
                <div style={{
                  position: "absolute", inset: 0,
                  background: "linear-gradient(to top, rgba(15,15,26,0.7) 0%, transparent 50%)",
                }} />
              </div>
              <div style={{ padding: "20px", flex: 1 }}>
                <p style={{
                  fontFamily: "var(--font-mono)", fontSize: "8px",
                  letterSpacing: "0.16em", textTransform: "uppercase",
                  color: "var(--gold)", marginBottom: "8px",
                  display: "flex", alignItems: "center", gap: "5px",
                }}>
                  <span style={{ width: "4px", height: "4px",
                    borderRadius: "50%", background: "var(--gold)",
                    display: "inline-block", flexShrink: 0 }} />
                  {latestArticles[0].category}
                </p>
                <h3 style={{
                  fontFamily: "var(--font-serif)", fontSize: "26px",
                  fontWeight: 400, lineHeight: 1.3,
                  color: "var(--text-primary)", marginBottom: "8px",
                }} className="discover-card-title">
                  {latestArticles[0].title}
                </h3>
                <p style={{
                  fontFamily: "var(--font-serif)", fontStyle: "italic",
                  fontSize: "13px", lineHeight: 1.65,
                  color: "var(--text-secondary)", marginBottom: "10px",
                }}>{latestArticles[0].excerpt}</p>
                <p style={{
                  fontFamily: "var(--font-mono)", fontSize: "8px",
                  letterSpacing: "0.08em", textTransform: "uppercase",
                  color: "var(--text-muted)",
                }}>Magazine · {latestArticles[0].readTime}</p>
              </div>
            </Link>
          )}

          {/* Article 2 — col 2, row 1 */}
          {latestArticles[1] && (
            <Link href={`/magazine/${latestArticles[1].id}`}
              className="discover-card reveal-right"
              style={{
                gridColumn: "2", gridRow: "1",
                background: "var(--bg-primary)",
                textDecoration: "none", display: "block",
                overflow: "hidden",
              }}>
              <div style={{ position: "relative", overflow: "hidden" }}>
                <Image src={latestArticles[1].image}
                  alt={latestArticles[1].title}
                  width={480} height={240}
                  className="discover-card-img"
                  style={{ width: "100%", height: "160px",
                    objectFit: "cover", display: "block" }} />
              </div>
              <div style={{ padding: "14px" }}>
                <p style={{
                  fontFamily: "var(--font-mono)", fontSize: "8px",
                  letterSpacing: "0.14em", textTransform: "uppercase",
                  color: "var(--gold)", marginBottom: "6px",
                  display: "flex", alignItems: "center", gap: "5px",
                }}>
                  <span style={{ width: "4px", height: "4px",
                    borderRadius: "50%", background: "var(--gold)",
                    display: "inline-block" }} />
                  {latestArticles[1].category}
                </p>
                <h3 style={{
                  fontFamily: "var(--font-serif)", fontSize: "17px",
                  fontWeight: 400, lineHeight: 1.35,
                  color: "var(--text-primary)",
                }} className="discover-card-title">
                  {latestArticles[1].title}
                </h3>
                <p style={{
                  fontFamily: "var(--font-mono)", fontSize: "8px",
                  letterSpacing: "0.08em", textTransform: "uppercase",
                  color: "var(--text-muted)", marginTop: "7px",
                }}>Magazine · {latestArticles[1].readTime}</p>
              </div>
            </Link>
          )}

          {/* Releases — col 2, row 2 */}
          {newReleases.length > 0 && (
            <div className="reveal-right" style={{
              gridColumn: "2", gridRow: "2",
              background: "var(--bg-primary)",
              display: "flex", flexDirection: "column",
            }}>
              <div style={{
                padding: "12px 16px 10px",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
                display: "flex", alignItems: "center", gap: "6px",
              }}>
                <span style={{ width: "4px", height: "4px",
                  borderRadius: "50%", background: "var(--gold)",
                  display: "inline-block", flexShrink: 0 }} />
                <p style={{
                  fontFamily: "var(--font-mono)", fontSize: "10px",
                  letterSpacing: "0.16em", textTransform: "uppercase",
                  color: "var(--gold)", margin: 0,
                }}>New Releases</p>
                <Link href="/nightwaves" style={{
                  fontFamily: "var(--font-mono)", fontSize: "8px",
                  letterSpacing: "0.08em", color: "var(--text-muted)",
                  textDecoration: "none", marginLeft: "auto",
                }}>Explore →</Link>
              </div>

              {newReleases.slice(0, 4).map((r: any, i: number) => {
                const El = r.external ? "a" : Link;
                const props = r.external
                  ? { href: r.href, target: "_blank",
                      rel: "noopener noreferrer" }
                  : { href: r.href };
                return (
                  <El key={r.id} {...(props as any)}
                    className="release-row-item"
                    style={{
                      display: "flex", gap: "12px",
                      alignItems: "center",
                      padding: "11px 16px",
                      borderBottom: i < 3
                        ? "1px solid rgba(255,255,255,0.04)"
                        : "none",
                      textDecoration: "none",
                      transition: "background 0.2s",
                    }}>
                    <div style={{
                      width: "44px", height: "44px",
                      flexShrink: 0, position: "relative",
                      overflow: "hidden",
                      background: "var(--bg-surface)",
                    }}>
                      <Image src={r.cover_image || FALLBACK_IMAGE}
                        alt={r.title} fill
                        style={{ objectFit: "cover",
                          transition: "transform 0.4s ease" }}
                        className="release-thumb" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: "13px", fontWeight: 500,
                        color: "var(--text-primary)",
                        whiteSpace: "nowrap", overflow: "hidden",
                        textOverflow: "ellipsis", margin: "0 0 1px",
                        transition: "color 0.2s",
                      }} className="release-title">
                        {r.artist || r.title}
                      </p>
                      <p style={{
                        fontFamily: "var(--font-serif)",
                        fontStyle: "italic", fontSize: "11px",
                        color: "var(--text-secondary)",
                        whiteSpace: "nowrap", overflow: "hidden",
                        textOverflow: "ellipsis", margin: 0,
                      }}>{r.artist ? r.title : ""}</p>
                      <p style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "8px", letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        color: "var(--text-muted)", marginTop: "2px",
                      }}>{r.typeBadge}</p>
                    </div>
                  </El>
                );
              })}
            </div>
          )}

        </div>
      </section>

      {/* ── ON NIGHTWAVES ── */}
      {(nightwavesItems.length > 0 || newReleases.length > 0) && (
      <section style={{
        padding: "0 32px 64px",
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{
          padding: "28px 0 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
        }}>
          <div>
            <p style={{
              fontFamily: "var(--font-sans)", fontSize: "11px",
              letterSpacing: "0.15em", textTransform: "uppercase",
              color: "var(--text-muted)", margin: 0,
            }}>On Nightwaves</p>
            <div style={{ width: "20px", height: "1px",
              background: "var(--gold)", marginTop: "5px" }} />
          </div>
          <Link href="/nightwaves" style={{
            fontFamily: "var(--font-mono)", fontSize: "9px",
            letterSpacing: "0.1em", textTransform: "uppercase",
            color: "var(--text-muted)", textDecoration: "none",
          }}>Explore →</Link>
        </div>

        <div className="nightwaves-grid-responsive" style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0,1fr))",
          gap: "1px",
          background: "rgba(255,255,255,0.04)",
        }}>
          {(nightwavesItems.length > 0 ? nightwavesItems.map((item: any) => ({
            id: String(item.id),
            title: item.title,
            artist: item.artist ?? "",
            cover_image: item.cover_url,
            typeBadge: item.subtitle || item.type,
            href: item.type === "mix"
              ? `/nightwaves/mix/${item.id}`
              : item.type === "playlist"
              ? `/nightwaves/playlist/${item.id}`
              : `/nightwaves/release/${item.id}`,
            external: false,
            soundcloudUrl: item.source === "soundcloud" ? item.source_url : undefined,
            type: (item.type === "mix" ? "mix" : item.type === "playlist" ? "playlist" : "release") as "mix" | "release" | "playlist",
          })) : newReleases.slice(0, 4).map((r: any) => ({
            id: String(r.id),
            title: r.title,
            artist: r.artist ?? "",
            cover_image: r.cover_image,
            typeBadge: r.typeBadge,
            href: r._contentType === "mix"
              ? `/nightwaves/mix/${r.id}`
              : r._contentType === "playlist"
              ? `/nightwaves/playlist/${r.id}`
              : `/nightwaves/release/${r.id}`,
            external: false,
            soundcloudUrl: r._contentType === "mix" ? r.soundcloud_url : undefined,
            type: (r._contentType === "mix" ? "mix" : r._contentType === "playlist" ? "playlist" : "release") as "mix" | "release" | "playlist",
          }))).map((item, i) => (
            <NightwavesHomeCard
              key={item.id}
              id={item.id}
              title={item.title}
              artist={item.artist}
              cover_image={item.cover_image}
              typeBadge={item.typeBadge}
              href={item.href}
              external={item.external}
              soundcloudUrl={item.soundcloudUrl}
              type={item.type}
              transitionDelay={`${i * 0.08}s`}
            />
          ))}
        </div>
      </section>
      )}

    </div>
  );
}
