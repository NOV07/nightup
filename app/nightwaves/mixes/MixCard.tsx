"use client";

import Image from "next/image";
import Link from "next/link";
import { usePlayerStore } from "../../components/PlayerContext";

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

export interface Mix {
  id: string;
  title: string;
  artist: string;
  genre?: string;
  cover_image?: string;
  soundcloud_url?: string;
  duration?: string;
}

export default function MixCard({ mix }: { mix: Mix }) {
  const { currentTrack, setTrack } = usePlayerStore();
  const isActive = currentTrack?.soundcloudUrl === mix.soundcloud_url && !!mix.soundcloud_url;

  return (
    <div
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
          <span className="absolute bottom-2 right-2 text-xs px-1.5 py-0.5 rounded font-mono" style={{ backgroundColor: "rgba(0,0,0,0.75)", color: "#ccc" }}>{formatDuration(mix.duration)}</span>
        )}
        {mix.genre && (
          <span className="absolute bottom-2 left-2 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#E8A02020", color: "#E8A020", border: "1px solid #E8A02040" }}>{mix.genre}</span>
        )}
      </button>

      {/* Info — navigate to detail */}
      <Link href={`/nightwaves/mix/${mix.id}`} className="block p-4 hover:opacity-80 transition-opacity">
        <h2 className="font-semibold text-sm line-clamp-1 mb-1">{mix.title}</h2>
        <p className="text-xs" style={{ color: "#666" }}>{mix.artist}</p>
      </Link>
    </div>
  );
}
