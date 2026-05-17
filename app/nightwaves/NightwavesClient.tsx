"use client";

import Image from "next/image";
import Link from "next/link";
import { useRadio, STATIONS } from "../components/RadioContext";
import { usePlayerStore } from "../components/PlayerContext";

const FALLBACK = "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80";

const STATION_STYLES: Record<string, { gradient: string; genre: string; bpm: string }> = {
  house:  { gradient: "linear-gradient(135deg, #1a0f2e 0%, #0d0d1a 100%)", genre: "Deep · Tech House", bpm: "124–128 BPM" },
  techno: { gradient: "linear-gradient(135deg, #0a0f1a 0%, #050810 100%)", genre: "Dark · Industrial", bpm: "138–145 BPM" },
  rnb:    { gradient: "linear-gradient(135deg, #1a0a0f 0%, #100508 100%)", genre: "Neo Soul · Funk", bpm: "80–95 BPM" },
};

function formatDuration(d: string | number | null | undefined): string | null {
  if (!d) return null;
  const n = Number(d);
  if (isNaN(n)) return String(d);
  if (n >= 60) {
    const h = Math.floor(n / 60);
    const m = n % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${n} min`;
}

function LiveDot() {
  return <span className="w-2 h-2 rounded-full inline-block animate-live-pulse mr-1.5 flex-shrink-0" style={{ backgroundColor: "#E8A020" }} />;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-7">
      <span className="section-divider" />
      <h2 className="text-2xl font-bold tracking-tight">{children}</h2>
      <div className="flex-1 h-px" style={{ background: "linear-gradient(to right, rgba(232,160,32,0.2), transparent)" }} />
    </div>
  );
}

interface Mix { id: string; title: string; artist: string; genre?: string; cover_image?: string; soundcloud_url?: string; duration?: string; }
interface Release { id: string; title: string; artist: string; type?: string; genre?: string; cover_image?: string; spotify_url?: string; soundcloud_url?: string; release_date?: string; is_promoted?: boolean; }
interface Playlist { id: string; title: string; platform?: string; embed_url?: string; cover_image?: string; is_sponsored?: boolean; }
interface RecentItem { id: string; title: string; artist?: string; typeBadge: string; cover_image?: string; href: string; external?: boolean; is_promoted?: boolean; _contentType: string; }

export default function NightwavesClient({ mixes, releases, playlists, recentItems }: { mixes: Mix[]; releases: Release[]; playlists: Playlist[]; recentItems: RecentItem[] }) {
  const { currentStation, isPlaying, playStation } = useRadio();
  const { currentTrack, setTrack } = usePlayerStore();
  const liveStations = STATIONS.filter((s) => !s.comingSoon);

  return (
    <div style={{ backgroundColor: "#0F0F1A", minHeight: "100vh" }}>
      {/* ── HERO ── */}
      <div style={{
        position: "relative",
        width: "100%",
        minHeight: "340px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        background: "#0a0a14",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}>

        {/* Animated particles — floating dots */}
        {[...Array(18)].map((_, i) => (
          <div key={i} style={{
            position: "absolute",
            width: `${2 + (i % 3)}px`,
            height: `${2 + (i % 3)}px`,
            borderRadius: "50%",
            background: "#E8A020",
            opacity: 0.08 + (i % 5) * 0.04,
            left: `${(i * 17 + 5) % 95}%`,
            top: `${(i * 23 + 10) % 85}%`,
            animation: `nw-float ${4 + (i % 4)}s ease-in-out infinite alternate`,
            animationDelay: `${i * 0.3}s`,
          }} />
        ))}

        {/* Slow horizontal scan line */}
        <div style={{
          position: "absolute",
          left: 0, right: 0,
          height: "1px",
          background: "linear-gradient(90deg, transparent 0%, rgba(232,160,32,0.15) 40%, rgba(232,160,32,0.3) 50%, rgba(232,160,32,0.15) 60%, transparent 100%)",
          animation: "nw-scan 6s ease-in-out infinite alternate",
          top: "30%",
        }} />

        {/* Center content */}
        <div style={{
          position: "relative",
          textAlign: "center",
          padding: "64px 32px",
          zIndex: 1,
        }}>

          {/* Eyebrow */}
          <p style={{
            fontFamily: "var(--font-mono)",
            fontSize: "9px",
            letterSpacing: "0.35em",
            textTransform: "uppercase",
            color: "rgba(232,160,32,0.6)",
            marginBottom: "24px",
            animation: "nw-fadein 1s ease both",
          }}>
            Nightwaves
          </p>

          {/* Main headline */}
          <h1 style={{
            fontFamily: "var(--font-serif)",
            fontSize: "clamp(38px, 6vw, 72px)",
            fontWeight: 400,
            color: "#F4F4F5",
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            marginBottom: "20px",
            animation: "nw-fadein 1s ease 0.2s both",
          }}>
            Get lost in{" "}
            <em style={{ color: "#E8A020", fontStyle: "italic" }}>the sound.</em>
          </h1>

          {/* Subtitle */}
          <p style={{
            fontFamily: "var(--font-sans)",
            fontSize: "14px",
            color: "rgba(255,255,255,0.35)",
            letterSpacing: "0.04em",
            marginBottom: "36px",
            animation: "nw-fadein 1s ease 0.4s both",
          }}>
            mixes · radio · releases
          </p>

          {/* CTA — Play now */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            animation: "nw-fadein 1s ease 0.6s both",
          }}>
            <button
              onClick={() => {
                const el = document.getElementById("nightwaves-live-radio");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "12px 28px",
                background: "rgba(232,160,32,0.08)",
                border: "1px solid rgba(232,160,32,0.3)",
                borderRadius: "2px",
                color: "#E8A020",
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(232,160,32,0.15)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(232,160,32,0.6)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(232,160,32,0.08)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(232,160,32,0.3)";
              }}
            >
              <span style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "#E8A020",
                animation: "nw-pulse 1.4s ease-in-out infinite",
              }} />
              Start listening
            </button>
          </div>
        </div>

        <style>{`
          @keyframes nw-float {
            from { transform: translateY(0px) translateX(0px); }
            to   { transform: translateY(-18px) translateX(8px); }
          }
          @keyframes nw-scan {
            from { top: 20%; opacity: 0.4; }
            to   { top: 80%; opacity: 0.8; }
          }
          @keyframes nw-fadein {
            from { opacity: 0; transform: translateY(12px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes nw-pulse {
            0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(232,160,32,0.4); }
            50%      { opacity: 0.6; box-shadow: 0 0 0 6px rgba(232,160,32,0); }
          }
        `}</style>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-10">

        {/* LIVE RADIO */}
        <section id="nightwaves-live-radio" className="mb-16">
          <div className="flex items-center gap-3 mb-7">
            <span className="section-divider" />
            <h2 className="text-2xl font-bold tracking-tight">Live Radio</h2>
            <LiveDot />
            <div className="flex-1 h-px" style={{ background: "linear-gradient(to right, rgba(232,160,32,0.2), transparent)" }} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {liveStations.map((s) => {
              const active = currentStation.id === s.id && isPlaying;
              const stStyle = STATION_STYLES[s.id] ?? { gradient: "linear-gradient(135deg, #111120, #16162a)", genre: "", bpm: "" };
              return (
                <div
                  key={s.id}
                  onClick={() => playStation(s)}
                  className="relative cursor-pointer rounded-2xl overflow-hidden transition-all duration-300"
                  style={{
                    background: stStyle.gradient,
                    border: `1px solid ${active ? "#E8A020" : "#1e1e30"}`,
                    boxShadow: active ? "0 0 32px rgba(232,160,32,0.18), inset 0 0 32px rgba(232,160,32,0.04)" : "none",
                    transform: active ? "translateY(-2px)" : "none",
                  }}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      {active ? (
                        <span className="text-xs font-black px-2.5 py-1 rounded-full tracking-widest" style={{ backgroundColor: "#E8A020", color: "#0F0F1A" }}>
                          LIVE
                        </span>
                      ) : (
                        <span className="text-xs font-black px-2.5 py-1 rounded-full tracking-widest" style={{ backgroundColor: "#1A1A2E", color: "rgba(255,255,255,0.25)", border: "1px solid rgba(255,255,255,0.08)" }}>
                          RADIO
                        </span>
                      )}
                      {active && (
                        <span className="flex gap-0.5 items-end h-5">
                          {[0, 1, 2, 3].map((i) => (
                            <span key={i} className="w-0.5 rounded-sm" style={{ backgroundColor: "#E8A020", animation: `visualizer 0.8s ease-in-out ${i * 0.15}s infinite`, height: "16px" }} />
                          ))}
                        </span>
                      )}
                    </div>
                    <div className="mb-1">
                      <h3 className="font-bold text-xl tracking-tight">{s.name}</h3>
                    </div>
                    <div className="mb-5">
                      <p style={{ fontFamily: "var(--font-mono)", fontSize: "9px", letterSpacing: "0.1em", color: "rgba(255,255,255,0.35)" }}>
                        {stStyle.genre} · {stStyle.bpm}
                      </p>
                    </div>
                    <div className="flex items-center justify-end">
                      <button
                        className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
                        style={{ backgroundColor: active ? "#E8A020" : "#1E1E30", color: active ? "#0F0F1A" : "#fff", border: active ? "none" : "1px solid #333" }}
                      >
                        {active ? (
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" /></svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* TOP MIXES */}
        <section className="mb-16">
          <SectionLabel>Top Mixes</SectionLabel>
          {mixes.length === 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="rounded-2xl overflow-hidden animate-pulse" style={{ backgroundColor: "#111120" }}>
                  <div className="aspect-square bg-gradient-to-br from-gray-900 to-gray-800" />
                  <div className="p-4 space-y-2">
                    <div className="h-3 rounded-full w-3/4" style={{ backgroundColor: "#1e1e30" }} />
                    <div className="h-2 rounded-full w-1/2" style={{ backgroundColor: "#161626" }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
              {mixes.map((mix) => {
                const isActive = currentTrack?.soundcloudUrl === mix.soundcloud_url && !!mix.soundcloud_url;
                return (
                  <div
                    key={mix.id}
                    className="group rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1"
                    style={{ backgroundColor: "#111120", border: `1px solid ${isActive ? "#E8A020" : "#1a1a2e"}` }}
                  >
                    {/* Image — click to play */}
                    <button
                      className="relative aspect-square w-full overflow-hidden block"
                      onClick={() => mix.soundcloud_url && setTrack({ soundcloudUrl: mix.soundcloud_url, title: mix.title, artist: mix.artist, cover: mix.cover_image, type: "mix", id: mix.id })}
                    >
                      <Image src={mix.cover_image || FALLBACK} alt={mix.title} fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                        <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: "#E8A020", boxShadow: "0 0 24px rgba(232,160,32,0.5)" }}>
                          {isActive ? (
                            <span className="flex gap-0.5 items-end h-5">
                              {[0, 1, 2, 3].map((i) => (
                                <span key={i} className="w-0.5 rounded-sm" style={{ backgroundColor: "#0F0F1A", animation: `visualizer 0.8s ease-in-out ${i * 0.15}s infinite`, height: "16px" }} />
                              ))}
                            </span>
                          ) : (
                            <svg className="w-6 h-6 ml-0.5" fill="#0F0F1A" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                          )}
                        </div>
                      </div>
                      {mix.duration && (
                        <span className="absolute bottom-2 right-2 text-xs px-1.5 py-0.5 rounded font-mono" style={{ backgroundColor: "rgba(0,0,0,0.75)", color: "#ccc" }}>{formatDuration(mix.duration)}</span>
                      )}
                      {mix.genre && (
                        <span className="absolute bottom-2 left-2 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#E8A02020", color: "#E8A020", border: "1px solid #E8A02040" }}>{mix.genre}</span>
                      )}
                    </button>
                    {/* Info — click to navigate */}
                    <Link href={`/nightwaves/mix/${mix.id}`} className="block p-4 hover:opacity-80 transition-opacity">
                      <h4 className="font-semibold text-sm line-clamp-1 mb-1">{mix.title}</h4>
                      <p className="text-xs" style={{ color: "#666" }}>{mix.artist}</p>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
          <div className="mt-6 flex justify-center">
            <Link
              href="/nightwaves/mixes"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-opacity hover:opacity-80"
              style={{ backgroundColor: "#111120", color: "#E8A020", border: "1px solid #E8A02040" }}
            >
              View All Mixes →
            </Link>
          </div>
        </section>

        {/* NEW RELEASES — combined latest feed */}
        <section className="mb-16">
          <SectionLabel>New Releases</SectionLabel>
          {recentItems.length === 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-5">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="rounded-2xl overflow-hidden animate-pulse" style={{ backgroundColor: "#111120" }}>
                  <div className="aspect-square bg-gradient-to-br from-gray-900 to-gray-800" />
                  <div className="p-4 space-y-2">
                    <div className="h-3 rounded-full w-3/4" style={{ backgroundColor: "#1e1e30" }} />
                    <div className="h-2 rounded-full w-1/2" style={{ backgroundColor: "#161626" }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">
              {recentItems.map((item) => {
                const Wrapper = item.external ? "a" : Link;
                const wrapperProps = item.external
                  ? { href: item.href, target: "_blank" as const, rel: "noopener noreferrer" }
                  : { href: item.href };
                return (
                  <Wrapper
                    key={item.id}
                    {...wrapperProps}
                    className="group block rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1"
                    style={{ backgroundColor: "#111120", border: "1px solid #1a1a2e" }}
                  >
                    <div className="relative aspect-square overflow-hidden">
                      <Image
                        src={item.cover_image || FALLBACK}
                        alt={item.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                      {item.is_promoted && (
                        <span className="absolute top-2 left-2 text-[9px] font-black px-2 py-0.5 rounded-full tracking-wider uppercase" style={{ backgroundColor: "#E8A020", color: "#0F0F1A" }}>Pick</span>
                      )}
                      <span className="absolute top-2 right-2 text-xs font-black px-2 py-0.5 rounded-full" style={{ backgroundColor: "#E8A020", color: "#0F0F1A" }}>
                        {item.typeBadge}
                      </span>
                    </div>
                    <div className="p-3">
                      {item.artist && (
                        <p className="text-xs font-semibold mb-0.5 truncate" style={{ color: "#E8A020" }}>{item.artist}</p>
                      )}
                      <h4 className="font-semibold text-sm line-clamp-1">{item.title}</h4>
                    </div>
                  </Wrapper>
                );
              })}
            </div>
          )}
          <div className="mt-6 flex justify-center">
            <Link
              href="/nightwaves/releases"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-opacity hover:opacity-80"
              style={{ backgroundColor: "#111120", color: "#E8A020", border: "1px solid #E8A02040" }}
            >
              View All Releases →
            </Link>
          </div>
        </section>

        {/* PLAYLISTS */}
        <section className="mb-10">
          <SectionLabel>Playlists</SectionLabel>
          {playlists.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-2xl p-5 flex items-center gap-4 animate-pulse" style={{ backgroundColor: "#111120", border: "1px solid #1a1a2e" }}>
                  <div className="w-16 h-16 rounded-xl flex-shrink-0" style={{ backgroundColor: "#1a1a2e" }} />
                  <div className="space-y-2 flex-1">
                    <div className="h-3 rounded-full w-3/4" style={{ backgroundColor: "#1e1e30" }} />
                    <div className="h-2 rounded-full w-1/2" style={{ backgroundColor: "#161626" }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {playlists.map((pl) => {
                const plUrl = pl.embed_url;
                const plIsSpotify = plUrl?.includes("spotify.com");
                const isActive = plIsSpotify
                  ? currentTrack?.spotifyUrl === plUrl
                  : currentTrack?.soundcloudUrl === plUrl && !!plUrl;
                return (
                  <div
                    key={pl.id}
                    className="rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1"
                    style={{ backgroundColor: "#111120", border: `1px solid ${isActive ? "#E8A020" : "#1a1a2e"}` }}
                  >
                    <div className="flex items-center gap-4 p-4">
                      <Link href={`/nightwaves/playlist/${pl.id}`} className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 block">
                        <Image src={pl.cover_image || FALLBACK} alt={pl.title} fill className="object-cover hover:scale-105 transition-transform duration-300" />
                      </Link>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Link href={`/nightwaves/playlist/${pl.id}`} className="font-semibold text-sm line-clamp-1 hover:opacity-80 transition-opacity">
                            {pl.title}
                          </Link>
                          {pl.is_sponsored && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: "#E8A020", color: "#0F0F1A" }}>Sponsored</span>
                          )}
                        </div>
                        {pl.platform && <p className="text-xs mb-2" style={{ color: "#666" }}>{pl.platform}</p>}
                        {pl.embed_url && (
                          <button
                            onClick={() => setTrack({ soundcloudUrl: plIsSpotify ? undefined : plUrl ?? undefined, spotifyUrl: plIsSpotify ? plUrl ?? undefined : undefined, title: pl.title, artist: pl.platform ?? "Playlist", cover: pl.cover_image, type: "playlist", id: pl.id })}
                            className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full transition-opacity hover:opacity-80"
                            style={{ backgroundColor: isActive ? "#E8A020" : "#E8A02015", color: isActive ? "#0F0F1A" : "#E8A020", border: "1px solid #E8A02040" }}
                          >
                            {isActive ? (
                              <>
                                <span className="flex gap-0.5 items-end h-3">
                                  {[0, 1, 2].map((i) => (
                                    <span key={i} className="w-0.5 rounded-sm" style={{ backgroundColor: "#0F0F1A", animation: `visualizer 0.8s ease-in-out ${i * 0.2}s infinite`, height: "12px" }} />
                                  ))}
                                </span>
                                Playing
                              </>
                            ) : (
                              <>
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                Play
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="mt-6 flex justify-center">
            <Link
              href="/nightwaves/playlists"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-opacity hover:opacity-80"
              style={{ backgroundColor: "#111120", color: "#E8A020", border: "1px solid #E8A02040" }}
            >
              View All Playlists →
            </Link>
          </div>
        </section>

      </div>
    </div>
  );
}
