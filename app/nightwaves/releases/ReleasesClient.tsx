"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const FALLBACK = "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80";

interface Release {
  id: string;
  title: string;
  artist: string;
  type?: string;
  genre?: string;
  cover_image?: string;
  release_date?: string;
  is_promoted?: boolean;
}

export default function ReleasesClient({ releases }: { releases: Release[] }) {
  const types = ["All", ...Array.from(new Set(releases.map((r) => r.type).filter(Boolean) as string[]))];
  const [activeType, setActiveType] = useState("All");

  const filtered = activeType === "All" ? releases : releases.filter((r) => r.type === activeType);

  return (
    <div style={{ backgroundColor: "#0F0F1A", minHeight: "100vh" }}>
      <div
        className="relative overflow-hidden"
        style={{ background: "linear-gradient(180deg, #0a0a14 0%, #111122 60%, #0F0F1A 100%)" }}
      >
        <div className="absolute top-0 right-1/4 w-80 h-80 rounded-full opacity-10 blur-3xl pointer-events-none" style={{ backgroundColor: "#E8A020" }} />
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
          <h1 className="text-4xl font-bold tracking-tight mb-2">All Releases</h1>
          <p className="text-gray-400">{releases.length} release{releases.length !== 1 ? "s" : ""} from the Greek night scene.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {types.length > 1 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {types.map((t) => (
              <button
                key={t}
                onClick={() => setActiveType(t)}
                className="text-xs px-4 py-1.5 rounded-full font-semibold transition-all"
                style={{
                  backgroundColor: activeType === t ? "#E8A020" : "#111120",
                  color: activeType === t ? "#0F0F1A" : "#888",
                  border: `1px solid ${activeType === t ? "#E8A020" : "#1e1e30"}`,
                }}
              >
                {t}
              </button>
            ))}
          </div>
        )}

        {filtered.length === 0 ? (
          <p className="text-center py-16 text-gray-500">No releases found.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">
            {filtered.map((r) => (
              <Link
                key={r.id}
                href={`/nightwaves/release/${r.id}`}
                className="group block rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1"
                style={{ backgroundColor: "#111120", border: "1px solid #1a1a2e" }}
              >
                <div className="relative aspect-square overflow-hidden">
                  <Image
                    src={r.cover_image || FALLBACK}
                    alt={r.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  {r.is_promoted && (
                    <span className="absolute top-2 left-2 text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "#E8A020", color: "#0F0F1A" }}>⭐</span>
                  )}
                  {r.type && (
                    <span className="absolute top-2 right-2 text-xs font-black px-2 py-0.5 rounded-full" style={{ backgroundColor: "#E8A020", color: "#0F0F1A" }}>{r.type}</span>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-xs font-semibold truncate mb-0.5" style={{ color: "#E8A020" }}>{r.artist}</p>
                  <h4 className="font-semibold text-sm line-clamp-1">{r.title}</h4>
                  {r.release_date && (
                    <p className="text-xs mt-0.5" style={{ color: "#444" }}>
                      {new Date(r.release_date).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
