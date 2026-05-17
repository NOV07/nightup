"use client";

import Image from "next/image";
import Link from "next/link";
import { useRadio, STATIONS } from "../components/RadioContext";
import { usePlayerStore } from "../components/PlayerContext";

const FALLBACK = "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80";

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
      {/* Hero */}
      <div
        className="relative overflow-hidden"
        style={{ background: "linear-gradient(180deg, #0a0a14 0%, #111122 60%, #0F0F1A 100%)" }}
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/3 w-96 h-96 rounded-full opacity-10 blur-3xl" style={{ backgroundColor: "#E8A020" }} />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 rounded-full opacity-8 blur-3xl" style={{ backgroundColor: "#6020E8" }} />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 pt-16 pb-12">
          <div className="flex items-center gap-4 mb-3">
            <svg width="32" height="24" viewBox="0 0 32 24" fill="none" aria-hidden="true">
              <path d="M0 12h2.5M2.5 12V5M2.5 5V12M6 12V1M6 1V12M9.5 12V7M9.5 7V12M13 12V3M13 3V12M16.5 12V0M16.5 0V12M20 12V3M20 3V12M23.5 12V7M23.5 7V12M27 12V1M27 1V12M30.5 12V5M30.5 5V12M32 12h-1.5" stroke="#E8A020" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            <h1 className="text-5xl font-bold tracking-tight">Nightwaves</h1>
          </div>
          <p className="text-gray-400 text-lg max-w-xl">Live radio, top mixes, and the freshest releases from the Greek night scene.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-10">

        {/* LIVE RADIO */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-7">
            <span className="section-divider" />
            <h2 className="text-2xl font-bold tracking-tight">Live Radio</h2>
            <LiveDot />
            <div className="flex-1 h-px" style={{ background: "linear-gradient(to right, rgba(232,160,32,0.2), transparent)" }} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {liveStations.map((s) => {
              const active = currentStation.id === s.id && isPlaying;
              return (
                <div
                  key={s.id}
                  onClick={() => playStation(s)}
                  className="relative cursor-pointer rounded-2xl overflow-hidden transition-all duration-300"
                  style={{
                    background: active
                      ? "linear-gradient(135deg, #1a1520, #1e1a2e)"
                      : "linear-gradient(135deg, #111120, #16162a)",
                    border: `1px solid ${active ? "#E8A020" : "#1e1e30"}`,
                    boxShadow: active ? "0 0 32px rgba(232,160,32,0.18), inset 0 0 32px rgba(232,160,32,0.04)" : "none",
                    transform: active ? "translateY(-2px)" : "none",
                  }}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-6">
                      <span
                        className="text-xs font-black px-2.5 py-1 rounded-full tracking-widest"
                        style={{ backgroundColor: active ? "#E8A020" : "#1A1A2E", color: active ? "#0F0F1A" : "#E8A020", border: active ? "none" : "1px solid #E8A02050" }}
                      >
                        LIVE
                      </span>
                      {active && (
                        <span className="flex gap-0.5 items-end h-5">
                          {[0, 1, 2, 3].map((i) => (
                            <span key={i} className="w-0.5 rounded-sm" style={{ backgroundColor: "#E8A020", animation: `visualizer 0.8s ease-in-out ${i * 0.15}s infinite`, height: "16px" }} />
                          ))}
                        </span>
                      )}
                    </div>
                    <div className="mb-5">
                      <h3 className="font-bold text-xl tracking-tight">{s.name}</h3>
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
                        <span className="absolute top-2 left-2 text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "#E8A020", color: "#0F0F1A" }}>⭐</span>
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
