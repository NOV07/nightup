import Link from "next/link";
import Image from "next/image";
import { events, articles } from "./lib/data";
import EventCard from "./components/EventCard";
import HeroSearch from "./components/HeroSearch";
import HomeMiniRadio from "./components/HomeMiniRadio";
import { getSupabase } from "./lib/supabase";

export const dynamic = "force-dynamic";

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80";

/* ─── Section header component ──────────────────────────── */
function SectionHeader({
  title, icon, href, linkLabel = "View all →",
}: { title: string; icon?: React.ReactNode; href: string; linkLabel?: string }) {
  return (
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-3">
        <span className="section-divider" />
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        {icon && <span className="text-xl">{icon}</span>}
      </div>
      <Link
        href={href}
        className="group flex items-center gap-1 text-sm font-medium transition-colors hover:text-white"
        style={{ color: "#E8A020" }}
      >
        {linkLabel}
        <svg className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </Link>
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
        .select("id, title, category, date, read_time, image, image_url, excerpt")
        .eq("status", "approved")
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
        id: String(a.id), title: a.title, category: a.category,
        date: a.date ?? "", readTime: a.read_time ?? "",
        image: a.image_url || a.image || FALLBACK_IMAGE, excerpt: a.excerpt ?? "",
      }));
    }
    const combined = [
      ...(relRes.data ?? []).map((r: any) => ({ ...r, _contentType: "release", typeBadge: r.type ?? "Release", href: `/nightwaves/release/${r.id}`, external: false })),
      ...(mixFeedRes.data ?? []).map((m: any) => ({ ...m, _contentType: "mix", typeBadge: "Mix", href: `/nightwaves/mix/${m.id}`, external: false })),
      ...(playFeedRes.data ?? []).map((p: any) => ({ ...p, _contentType: "playlist", typeBadge: "Playlist", href: p.embed_url ?? "#", external: true })),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);
    if (combined.length > 0) newReleases = combined;
  } catch {}

  /* fallbacks */
  if (hotCards.length === 0 && popularCards.length === 0) {
    const mock = events.slice(0, 5);
    hotCards = mock.slice(0, 3).map((e) => ({ id: e.id, title: e.title, image: e.image, genre: e.genre, price: e.price, date: e.date, time: e.time, venue: e.venue, city: e.city, interestedCount: e.interestedCount, goingCount: e.goingCount, featured: false, badge: "🔥 Hot" }));
    popularCards = mock.slice(3, 5).map((e) => ({ id: e.id, title: e.title, image: e.image, genre: e.genre, price: e.price, date: e.date, time: e.time, venue: e.venue, city: e.city, interestedCount: e.interestedCount, goingCount: e.goingCount, featured: false, badge: "📈 Popular" }));
  }
  if (latestArticles.length === 0) {
    latestArticles = articles.slice(0, 3).map((a) => ({ id: a.id, title: a.title, category: a.category, date: a.date, readTime: a.readTime, image: a.image, excerpt: a.excerpt }));
  }

  return (
    <div style={{ backgroundColor: "#0A0A12" }}>

      {/* ══════════════════════════════════════════
          HERO
      ══════════════════════════════════════════ */}
      <section
        className="relative min-h-screen flex flex-col items-center justify-center text-center px-4 overflow-hidden"
        style={{ background: "linear-gradient(180deg, #06060f 0%, #0a0a14 40%, #0d0d1a 70%, #0A0A12 100%)" }}
      >
        {/* Ambient blobs */}
        <div className="absolute top-1/4 left-[15%] w-[500px] h-[500px] rounded-full pointer-events-none animate-float-a"
          style={{ background: "radial-gradient(circle, rgba(232,160,32,0.09) 0%, transparent 70%)" }} />
        <div className="absolute bottom-1/4 right-[10%] w-[400px] h-[400px] rounded-full pointer-events-none animate-float-b"
          style={{ background: "radial-gradient(circle, rgba(120,40,200,0.07) 0%, transparent 70%)" }} />
        <div className="absolute top-[15%] right-1/3 w-[200px] h-[200px] rounded-full pointer-events-none animate-glow-pulse"
          style={{ background: "radial-gradient(circle, rgba(232,160,32,0.06) 0%, transparent 70%)" }} />

        {/* Content */}
        <div className="relative z-10 max-w-3xl mx-auto w-full text-center">

          {/* Logo */}
          <div className="flex items-baseline justify-center gap-1 mb-3">
            <span className="font-thin tracking-[0.35em] text-[clamp(3rem,10vw,6.5rem)] uppercase text-white select-none">Night</span>
            <span className="font-thin tracking-[0.35em] text-[clamp(3rem,10vw,6.5rem)] uppercase select-none" style={{ color: "#E8A020" }}>up</span>
          </div>

          {/* Tagline */}
          <p className="text-xs md:text-sm tracking-[0.6em] uppercase mb-6 font-medium" style={{ color: "rgba(232,160,32,0.6)" }}>
            find your night
          </p>

          {/* Hero copy */}
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight tracking-tight">
            Your night starts here.
          </h1>
          <p className="text-base md:text-lg mb-12 leading-relaxed max-w-xl mx-auto" style={{ color: "rgba(255,255,255,0.55)" }}>
            Βρες events και club nights σε όλη την Ελλάδα. Venues, DJs, ήχος, φώτα — όλα σε ένα μέρος.
          </p>

          <HeroSearch />
        </div>

        {/* Scroll cue */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-30">
          <span className="text-xs tracking-widest uppercase" style={{ color: "#E8A020" }}>Scroll</span>
          <div className="w-px h-8 bg-gradient-to-b from-amber-500/60 to-transparent" />
        </div>
      </section>

      {/* ══════════════════════════════════════════
          LIVE RADIO STRIP
      ══════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-4 py-14">
        <div className="flex items-center gap-3 mb-6">
          <span className="w-2 h-2 rounded-full animate-live-pulse flex-shrink-0" style={{ backgroundColor: "#E8A020" }} />
          <h2 className="text-xs font-bold tracking-[0.4em] uppercase" style={{ color: "#E8A020" }}>Live on Nightwaves</h2>
          <div className="flex-1 h-px" style={{ background: "linear-gradient(to right, rgba(232,160,32,0.2), transparent)" }} />
          <Link href="/nightwaves"
            className="group flex items-center gap-1 text-xs font-semibold transition-colors hover:text-white flex-shrink-0"
            style={{ color: "#E8A020" }}>
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
        <SectionHeader title="Hot & Popular" icon="🔥" href="/events" />
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
              style={{ backgroundColor: "#111120" }}
            >
              {/* 16:9 image */}
              <div className="relative overflow-hidden" style={{ aspectRatio: "16/9" }}>
                <Image src={a.image} alt={a.title} fill
                  className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out" />
                <div className="absolute inset-0" style={{
                  background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)"
                }} />
                <span className="absolute bottom-3 left-3 text-xs font-bold px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: "#E8A020", color: "#0F0F1A" }}>
                  {a.category}
                </span>
              </div>
              <div className="p-4">
                <h3 className="font-bold text-sm mb-2 line-clamp-2 leading-[1.4]">{a.title}</h3>
                <p className="text-xs" style={{ color: "#555" }}>{a.readTime}</p>
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
            <span className="text-xs font-black px-2.5 py-1 rounded-full" style={{ backgroundColor: "#E8A020", color: "#0F0F1A" }}>NEW</span>
          </div>
          <Link href="/nightwaves"
            className="group flex items-center gap-1 text-sm font-medium transition-colors hover:text-white"
            style={{ color: "#E8A020" }}>
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
                  style={{ backgroundColor: "#111120" }}>
                  <div className="relative aspect-square overflow-hidden">
                    <Image src={r.cover_image || FALLBACK_IMAGE} alt={r.title} fill
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-110" />
                    <div className="absolute inset-0" style={{
                      background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 60%)"
                    }} />
                    {r.is_promoted && (
                      <span className="absolute top-2 left-2 text-xs font-bold px-1.5 py-0.5 rounded-full"
                        style={{ backgroundColor: "#E8A020", color: "#0F0F1A" }}>⭐</span>
                    )}
                    <span className="absolute top-2 right-2 text-xs font-black px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: "#E8A020", color: "#0F0F1A" }}>
                      {r.typeBadge}
                    </span>
                  </div>
                  <div className="p-3">
                    {r.artist && <p className="text-xs font-semibold truncate mb-0.5" style={{ color: "#E8A020" }}>{r.artist}</p>}
                    <h4 className="text-sm font-bold line-clamp-1">{r.title}</h4>
                  </div>
                </CardEl>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {articles.slice(3, 7).map((a) => (
              <Link key={a.id} href={`/magazine/${a.id}`}
                className="flex items-center gap-4 p-4 rounded-xl transition-colors hover:opacity-80"
                style={{ backgroundColor: "#111120" }}>
                <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                  <Image src={a.image} alt={a.title} fill className="object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold" style={{ color: "#E8A020" }}>{a.category}</span>
                  <h4 className="text-sm font-bold line-clamp-2 mt-0.5">{a.title}</h4>
                  <p className="text-xs mt-1" style={{ color: "#444" }}>{a.readTime}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ══════════════════════════════════════════
          PLANNING A PARTY CTA
      ══════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div
          className="relative rounded-3xl px-8 md:px-16 py-14 text-center overflow-hidden"
          style={{ background: "linear-gradient(135deg, #0e0e1c 0%, #12122a 50%, #0e0e1c 100%)" }}
        >
          {/* Decorative ring */}
          <div className="absolute inset-0 rounded-3xl pointer-events-none" style={{
            background: "linear-gradient(#12122a, #12122a) padding-box, linear-gradient(135deg, rgba(232,160,32,0.25), rgba(232,160,32,0.03) 60%, transparent) border-box",
            border: "1px solid transparent",
          }} />

          {/* Ambient center glow */}
          <div className="absolute inset-0 pointer-events-none" style={{
            background: "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(232,160,32,0.07), transparent)"
          }} />

          <div className="relative z-10">
            <p className="text-xs font-bold tracking-[0.4em] uppercase mb-4" style={{ color: "rgba(232,160,32,0.6)" }}>
              For organizers
            </p>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 leading-tight">
              Make it happen.
            </h2>
            <p className="text-base md:text-lg mb-10 max-w-lg mx-auto leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
              Find venues, DJs, photographers, sound & lighting — everything for your perfect event.
            </p>

            <div className="flex flex-wrap justify-center gap-8 mb-10">
              {[["🏛️", "Venues"], ["🎧", "Artists"], ["💡", "Lighting"], ["📸", "Photography"]].map(([icon, label]) => (
                <div key={label} className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                    style={{ backgroundColor: "rgba(232,160,32,0.08)", border: "1px solid rgba(232,160,32,0.15)" }}>
                    {icon}
                  </div>
                  <span className="text-xs font-semibold tracking-wide" style={{ color: "#666" }}>{label}</span>
                </div>
              ))}
            </div>

            <Link
              href="/party"
              className="btn-gold-shimmer inline-block px-10 py-3.5 rounded-full font-bold text-sm tracking-wide"
              style={{ color: "#0F0F1A" }}
            >
              Explore Professionals
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
