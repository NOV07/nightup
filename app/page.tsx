import Link from "next/link";
import Image from "next/image";
import EventCard from "./components/EventCard";
import HeroSearch from "./components/HeroSearch";
import HomeMiniRadio from "./components/HomeMiniRadio";
import { getSupabase } from "./lib/supabase";

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

  try {
    const supabase = getSupabase();
    const [evRes, artRes, relRes, mixFeedRes, playFeedRes] = await Promise.all([
      supabase
        .from("events")
        .select("id, title, image_url, genre, price, date, time, venue, city, interested_count, going_count, featured")
        .eq("status", "approved")
        .order("date", { ascending: true })
        .limit(20),
      supabase
        .from("articles")
        .select("id, title, category, published_at, read_time, hero_image, excerpt")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(3),
      supabase.from("music_releases").select("id, title, artist, type, cover_image, spotify_url, soundcloud_url, is_promoted, created_at").eq("status", "approved").order("created_at", { ascending: false }).limit(5),
      supabase.from("mixes").select("id, title, artist, genre, cover_image, created_at").eq("status", "approved").order("created_at", { ascending: false }).limit(5),
      supabase.from("playlists").select("id, title, platform, embed_url, cover_image, created_at").eq("status", "approved").order("created_at", { ascending: false }).limit(5),
    ]);

    if (evRes.data && evRes.data.length > 0) {
      const toCard = (e: any, badge: string) => ({
        id: String(e.id), title: e.title, image: e.image_url || FALLBACK_IMAGE,
        genre: e.genre, price: e.price ?? "", date: e.date, time: e.time ?? "",
        venue: e.venue, city: e.city,
        interestedCount: e.interested_count ?? 0, goingCount: e.going_count ?? 0,
        featured: e.featured ?? false, badge,
      });
      const featuredEvents = evRes.data
        .filter((e: any) => e.featured)
        .sort((a: any, b: any) => (b.interested_count + b.going_count) - (a.interested_count + a.going_count))
        .slice(0, 3);
      hotCards = featuredEvents.map((e: any) => toCard(e, "🔥 Hot"));
      const hotIds = new Set(featuredEvents.map((e: any) => e.id));
      popularCards = evRes.data
        .filter((e: any) => !hotIds.has(e.id))
        .sort((a: any, b: any) => (b.interested_count + b.going_count) - (a.interested_count + a.going_count))
        .slice(0, 2)
        .map((e: any) => toCard(e, "📈 Popular"));
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
  } catch {}

  return (
    <div style={{ backgroundColor: "var(--bg-primary)" }}>

      {/* ══════════════════════════════════════════
          HERO
      ══════════════════════════════════════════ */}
      <section
        className="relative min-h-screen flex flex-col items-center justify-center text-center px-4"
        style={{ background: "var(--bg-primary)" }}
      >
        {/* Content */}
        <div className="relative z-10 max-w-3xl mx-auto w-full text-center">

          {/* Logo */}
          <div className="flex items-baseline justify-center gap-1 mb-3">
            <span className="font-thin tracking-[0.35em] text-[clamp(3rem,10vw,6.5rem)] uppercase text-white select-none">Night</span>
            <span className="font-thin tracking-[0.35em] text-[clamp(3rem,10vw,6.5rem)] uppercase select-none" style={{ color: "var(--gold)" }}>up</span>
          </div>

          {/* Tagline */}
          <p className="mb-6" style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", color: "var(--text-secondary)", fontSize: "19px", lineHeight: "1.7" }}>
            find your night
          </p>

          {/* Hero copy */}
          <h1 className="mb-4" style={{ fontFamily: "var(--font-sans)", fontSize: "clamp(32px, 5vw, 56px)", fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.1 }}>
            Your night starts here.
          </h1>
          <p className="mb-12 max-w-xl mx-auto" style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", color: "var(--text-secondary)", fontSize: "19px", lineHeight: "1.7" }}>
            Βρες events και club nights σε όλη την Ελλάδα. Venues, DJs, ήχος, φώτα — όλα σε ένα μέρος.
          </p>

          <HeroSearch />
        </div>

      </section>

      {/* ══════════════════════════════════════════
          LIVE RADIO STRIP
      ══════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-4 py-14">
        <div className="flex items-center gap-3 mb-6">
          <span className="w-2 h-2 rounded-full animate-live-pulse flex-shrink-0" style={{ backgroundColor: "var(--gold)" }} />
          <h2 className="text-xs font-bold tracking-[0.4em] uppercase" style={{ color: "var(--gold)" }}>Live on Nightwaves</h2>
          <div className="flex-1 h-px" style={{ background: "linear-gradient(to right, var(--gold-glow), transparent)" }} />
          <Link href="/nightwaves"
            className="group flex items-center gap-1 text-xs font-semibold transition-colors hover:text-white flex-shrink-0"
            style={{ color: "var(--gold)" }}>
            Listen Live
            <svg className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
        <HomeMiniRadio />
      </section>

      {/* ══════════════════════════════════════════
          HOT & POPULAR
      ══════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-4 py-6">
        <SectionHeader title="Hot & Popular" href="/events" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-5">
          {hotCards.map((e: any) => <EventCard key={e.id} {...e} />)}
        </div>
        {popularCards.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {popularCards.map((e: any) => <EventCard key={e.id} {...e} />)}
          </div>
        )}
      </section>

      {/* ══════════════════════════════════════════
          JOURNAL
      ══════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <SectionHeader title="Latest from the Journal" href="/magazine" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {latestArticles.map((a: any, i: number) => (
            <Link
              key={a.id}
              href={`/magazine/${a.id}`}
              className="group block rounded-2xl overflow-hidden event-card"
              style={{ backgroundColor: "var(--bg-surface)" }}
            >
              {/* 16:9 image */}
              <div className="relative overflow-hidden" style={{ aspectRatio: "16/9" }}>
                <Image src={a.image} alt={a.title} fill
                  className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out" />
                <div className="absolute inset-0" style={{
                  background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)"
                }} />
                <span className="absolute bottom-3 left-3 text-xs font-bold px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: "var(--gold)", color: "var(--bg-primary)" }}>
                  {a.category}
                </span>
              </div>
              <div className="p-4">
                <h3 className="font-bold text-sm mb-2 line-clamp-2 leading-[1.4]">{a.title}</h3>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{a.readTime}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════
          NEW RELEASES
      ══════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <span className="section-divider" />
            <h2 className="text-2xl font-bold tracking-tight">New Releases</h2>
            <span className="text-xs font-black px-2.5 py-1 rounded-full" style={{ backgroundColor: "var(--gold)", color: "var(--bg-primary)" }}>NEW</span>
          </div>
          <Link href="/nightwaves"
            className="group flex items-center gap-1 text-sm font-medium transition-colors hover:text-white"
            style={{ color: "var(--gold)" }}>
            Explore
            <svg className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {newReleases.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {newReleases.map((r: any) => {
              const isExternal = r.external === true;
              const CardEl = isExternal ? "a" : Link;
              const cardProps = isExternal
                ? { href: r.href as string, target: "_blank" as const, rel: "noopener noreferrer" }
                : { href: r.href as string };
              return (
                <CardEl key={r.id} {...cardProps}
                  className="group block rounded-2xl overflow-hidden event-card"
                  style={{ backgroundColor: "var(--bg-surface)" }}>
                  <div className="relative aspect-square overflow-hidden">
                    <Image src={r.cover_image || FALLBACK_IMAGE} alt={r.title} fill
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-110" />
                    <div className="absolute inset-0" style={{
                      background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 60%)"
                    }} />
                    {r.is_promoted && (
                      <span className="absolute top-2 left-2 text-xs font-bold px-1.5 py-0.5 rounded-full"
                        style={{ backgroundColor: "var(--gold)", color: "var(--bg-primary)" }}>⭐</span>
                    )}
                    <span className="absolute top-2 right-2 text-xs font-black px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: "var(--gold)", color: "var(--bg-primary)" }}>
                      {r.typeBadge}
                    </span>
                  </div>
                  <div className="p-3">
                    {r.artist && <p className="text-xs font-semibold truncate mb-0.5" style={{ color: "var(--gold)" }}>{r.artist}</p>}
                    <h4 className="text-sm font-bold line-clamp-1">{r.title}</h4>
                  </div>
                </CardEl>
              );
            })}
          </div>
        ) : null}
      </section>

      {/* ══════════════════════════════════════════
          PLANNING A PARTY CTA
      ══════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div
          className="relative rounded-3xl px-8 md:px-16 py-14 text-center"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--gold)" }}
        >
          <div className="relative z-10">
            <p className="text-xs font-bold tracking-[0.4em] uppercase mb-4" style={{ color: "var(--gold)" }}>
              For organizers
            </p>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 leading-tight">
              Make it happen.
            </h2>
            <p className="text-base md:text-lg mb-10 max-w-lg mx-auto leading-relaxed" style={{ color: "var(--text-muted)" }}>
              Find venues, DJs, photographers, sound & lighting — everything for your perfect event.
            </p>

            <div className="flex flex-wrap justify-center gap-8 mb-10">
              {[["🏛️", "Venues"], ["🎧", "Artists"], ["💡", "Lighting"], ["📸", "Photography"]].map(([icon, label]) => (
                <div key={label} className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                    style={{ backgroundColor: "var(--gold-subtle)", border: "1px solid var(--gold-border)" }}>
                    {icon}
                  </div>
                  <span className="text-xs font-semibold tracking-wide" style={{ color: "var(--text-muted)" }}>{label}</span>
                </div>
              ))}
            </div>

            <Link
              href="/party"
              className="btn-gold-shimmer inline-block px-10 py-3.5 rounded-full font-bold text-sm tracking-wide"
              style={{ color: "var(--bg-primary)" }}
            >
              Explore Professionals
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
