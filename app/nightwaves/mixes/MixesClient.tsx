"use client";

import Link from "next/link";
import { useState } from "react";
import MixCard, { type Mix } from "./MixCard";

export default function MixesClient({ mixes }: { mixes: Mix[] }) {
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
            {filtered.map((mix) => <MixCard key={mix.id} mix={mix} />)}
          </div>
        )}
      </div>
    </div>
  );
}
