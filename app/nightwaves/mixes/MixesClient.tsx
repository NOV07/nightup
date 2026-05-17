"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { usePlayerStore } from "../../components/PlayerContext";

const FALLBACK = "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80";

interface Mix {
  id: string;
  title: string;
  artist: string;
  genre?: string;
  cover_image?: string;
  soundcloud_url?: string;
  duration?: string;
}

export default function MixesClient({ mixes }: { mixes: Mix[] }) {
  const { currentTrack, setTrack } = usePlayerStore();

  const genres = ["All", ...Array.from(new Set(mixes.map((m) => m.genre).filter(Boolean) as string[]))];
  const [activeGenre, setActiveGenre] = useState("All");

  const filtered = activeGenre === "All" ? mixes : mixes.filter((m) => m.genre === activeGenre);

  return (
    <div style={{ backgroundColor: "#0F0F1A", minHeight: "100vh" }}>
      {/* Header */}
      <div
        className="relative overflow-hidden"
        style={{ background: "linear-gradient(180deg, #0a0a14 0%, #111122 60%, #0F0F1A 100%)" }}
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/3 w-80 h-80 rounded-full opacity-10 blur-3xl" style={{ backgroundColor: "#E8A020" }} />
        </div>
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
          <h1 className="text-4xl font-bold tracking-tight mb-2">All Mixes</h1>
          <p className="text-gray-400">{mixes.length} mix{mixes.length !== 1 ? "es" : ""} from the Greek night scene.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Genre filter */}
        {genres.length > 1 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {genres.map((g) => (
              <button
                key={g}
                onClick={() => setActiveGenre(g)}
                className="text-xs px-4 py-1.5 rounded-full font-semibold transition-all"
                style={{
                  backgroundColor: activeGenre === g ? "#E8A020" : "#111120",
                  color: activeGenre === g ? "#0F0F1A" : "#888",
                  border: `1px solid ${activeGenre === g ? "#E8A020" : "#1e1e30"}`,
                }}
              >
                {g}
              </button>
            ))}
          </div>
        )}

        {filtered.length === 0 ? (
          <p className="text-center py-16 text-gray-500">No mixes found.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {filtered.map((mix) => {
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
                    <Image src={mix.cover_image || FALLBACK} alt={mix.title} fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
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
                      <span className="absolute bottom-2 right-2 text-xs px-1.5 py-0.5 rounded font-mono" style={{ backgroundColor: "rgba(0,0,0,0.75)", color: "#ccc" }}>{mix.duration}</span>
                    )}
                    {mix.genre && (
                      <span className="absolute bottom-2 left-2 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#E8A02020", color: "#E8A020", border: "1px solid #E8A02040" }}>{mix.genre}</span>
                    )}
                  </button>

                  {/* Info — navigate to detail */}
                  <Link href={`/nightwaves/mix/${mix.id}`} className="block p-4 hover:opacity-80 transition-opacity">
                    <h4 className="font-semibold text-sm line-clamp-1 mb-1">{mix.title}</h4>
                    <p className="text-xs" style={{ color: "#666" }}>{mix.artist}</p>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
