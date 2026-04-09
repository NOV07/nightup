"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

const CATEGORIES = [
  "All",
  "Venues",
  "Music & Artists",
  "Sound & Lighting",
  "Food & Drinks",
  "Decoration",
  "Transport & VIP",
  "Photography",
  "Adults Only",
];

const categoryEmojis: Record<string, string> = {
  Venues: "🏛️",
  "Music & Artists": "🎧",
  "Sound & Lighting": "💡",
  "Food & Drinks": "🍾",
  Decoration: "✨",
  "Transport & VIP": "🚗",
  Photography: "📸",
  "Adults Only": "🔞",
};

interface Professional {
  id: string;
  name: string;
  avatar: string;
  category: string;
  stars: number;
  reviewCount: number;
  location: string;
  description: string;
}

function StarRating({ stars }: { stars: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          className="w-3.5 h-3.5"
          fill={i <= Math.round(stars) ? "#E8A020" : "#333"}
          viewBox="0 0 24 24"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

export default function PartyClient({ professionals }: { professionals: Professional[] }) {
  const [activeCategory, setActiveCategory] = useState("All");

  const filtered = professionals.filter(
    (p) => activeCategory === "All" || p.category === activeCategory
  );

  return (
    <div>
      {/* Hero */}
      <section
        className="relative py-20 px-4 text-center overflow-hidden"
        style={{ background: "linear-gradient(180deg, #1A1A2E 0%, #0F0F1A 100%)" }}
      >
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full opacity-10 blur-3xl pointer-events-none"
          style={{ backgroundColor: "#E8A020" }}
        />
        <div className="relative z-10">
          <h1 className="text-4xl md:text-5xl font-semibold mb-4">
            Make Your{" "}
            <span style={{ color: "#E8A020" }}>Party</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Find the best venues, artists, photographers, and everything you need to throw an unforgettable event in Greece.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-8">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className="whitespace-nowrap flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all flex-shrink-0"
              style={{
                backgroundColor: activeCategory === cat ? "#E8A020" : "#1A1A2E",
                color: activeCategory === cat ? "#0F0F1A" : "#aaa",
                border: `1px solid ${activeCategory === cat ? "#E8A020" : "#333"}`,
              }}
            >
              {cat !== "All" && <span>{categoryEmojis[cat]}</span>}
              {cat}
            </button>
          ))}
        </div>

        {/* Count */}
        <p className="text-xs text-gray-500 mb-6">
          {filtered.length} professional{filtered.length !== 1 ? "s" : ""} found
        </p>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((pro) => (
            <Link
              key={pro.id}
              href={`/party/${pro.id}`}
              className="group block rounded-2xl overflow-hidden transition-transform hover:-translate-y-1"
              style={{ backgroundColor: "#1A1A2E" }}
            >
              {/* Avatar */}
              <div className="relative h-40 overflow-hidden">
                <Image
                  src={pro.avatar}
                  alt={pro.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <span
                  className="absolute top-3 left-3 text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: "#0F0F1A", color: "#E8A020", border: "1px solid #E8A020" }}
                >
                  {categoryEmojis[pro.category]} {pro.category}
                </span>
              </div>

              <div className="p-4">
                <h3 className="font-semibold text-base mb-1">{pro.name}</h3>
                <div className="flex items-center gap-2 mb-1">
                  <StarRating stars={pro.stars} />
                  <span className="text-xs text-gray-400">
                    {pro.stars} ({pro.reviewCount})
                  </span>
                </div>
                <p className="text-xs text-gray-400 mb-3">📍 {pro.location}</p>
                <p className="text-xs text-gray-500 line-clamp-2">{pro.description}</p>
                <div
                  className="mt-4 w-full py-2 rounded-lg text-xs font-semibold text-center transition-opacity hover:opacity-90"
                  style={{ backgroundColor: "#E8A020", color: "#0F0F1A" }}
                >
                  View Profile →
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
