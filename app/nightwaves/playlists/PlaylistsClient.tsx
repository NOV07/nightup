"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { usePlayerStore } from "../../components/PlayerContext";

const FALLBACK = "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80";

interface Playlist {
  id: string;
  title: string;
  platform?: string;
  embed_url?: string;
  cover_image?: string;
  is_sponsored?: boolean;
}

export default function PlaylistsClient({ playlists }: { playlists: Playlist[] }) {
  const { currentTrack, setTrack } = usePlayerStore();
  const platforms = ["All", ...Array.from(new Set(playlists.map((p) => p.platform).filter(Boolean) as string[]))];
  const [activePlatform, setActivePlatform] = useState("All");

  const filtered = activePlatform === "All" ? playlists : playlists.filter((p) => p.platform === activePlatform);

  return (
    <div style={{ backgroundColor: "#0F0F1A", minHeight: "100vh" }}>
      <div
        className="relative overflow-hidden"
        style={{ background: "linear-gradient(180deg, #0a0a14 0%, #111122 60%, #0F0F1A 100%)" }}
      >
        <div className="absolute bottom-0 left-1/4 w-80 h-80 rounded-full opacity-8 blur-3xl pointer-events-none" style={{ backgroundColor: "#6020E8" }} />
        <div className="relative z-10 max-w-7xl mx-auto px-4 pt-14 pb-10">
          <Link
            href="/nightwaves"
            className="inline-flex items-center gap-2 text-sm mb-6 transition-colors hover:text-white"
            style={{ color: "#555" }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Nightwaves
          </Link>
          <h1 className="text-4xl font-bold tracking-tight mb-2">All Playlists</h1>
          <p className="text-gray-400">{playlists.length} playlist{playlists.length !== 1 ? "s" : ""} curated for the night.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {platforms.length > 1 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {platforms.map((p) => (
              <button
                key={p}
                onClick={() => setActivePlatform(p)}
                className="text-xs px-4 py-1.5 rounded-full font-semibold transition-all"
                style={{
                  backgroundColor: activePlatform === p ? "#E8A020" : "#111120",
                  color: activePlatform === p ? "#0F0F1A" : "#888",
                  border: `1px solid ${activePlatform === p ? "#E8A020" : "#1e1e30"}`,
                }}
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {filtered.length === 0 ? (
          <p className="text-center py-16 text-gray-500">No playlists found.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((pl) => {
              const isSpotify = pl.embed_url?.includes("spotify.com");
              const isActive = isSpotify
                ? currentTrack?.spotifyUrl === pl.embed_url
                : currentTrack?.soundcloudUrl === pl.embed_url && !!pl.embed_url;

              return (
                <div
                  key={pl.id}
                  className="rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1"
                  style={{ backgroundColor: "#111120", border: `1px solid ${isActive ? "#E8A020" : "#1a1a2e"}` }}
                >
                  <div className="flex items-center gap-4 p-4">
                    <Link href={`/nightwaves/playlist/${pl.id}`} className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 block">
                      <Image src={pl.cover_image || FALLBACK} alt={pl.title} fill sizes="64px" className="object-cover hover:scale-105 transition-transform duration-300" />
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
                      {pl.platform && <p className="text-xs mb-2" style={{ color: "#555" }}>{pl.platform}</p>}
                      {pl.embed_url && (
                        <button
                          onClick={() => {
                            if (isSpotify) { window.open(pl.embed_url, "_blank"); return; }
                            setTrack({ soundcloudUrl: pl.embed_url, title: pl.title, artist: pl.platform ?? "Playlist", cover: pl.cover_image, type: "playlist", id: pl.id });
                          }}
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
                              {isSpotify ? "Spotify" : "Play"}
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
      </div>
    </div>
  );
}
