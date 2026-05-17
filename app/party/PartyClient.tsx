"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useLanguage } from "../components/LanguageContext";

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const CATEGORIES = [
  "All",
  "Venues",
  "Music & Artists",
  "Sound & Lighting",
  "Food & Drinks",
  "Decoration",
  "Transport & VIP",
  "Photography",
];

const categoryEmojis: Record<string, string> = {
  Venues: "🏛️",
  "Music & Artists": "🎧",
  "Sound & Lighting": "💡",
  "Food & Drinks": "🍾",
  Decoration: "✨",
  "Transport & VIP": "🚗",
  Photography: "📸",
};

interface Professional {
  id: string;
  name: string;
  avatar: string;
  category: string;
  availability?: string | null;
  tags?: string[];
  gallery?: string[];
  location: string;
  description: string;
  isFeatured?: boolean;
}

function ProfCard({ pro, featured = false }: { pro: Professional; featured?: boolean }) {
  return (
    <Link
      href={`/party/${slugify(pro.name)}`}
      className="group block rounded-2xl overflow-hidden card-hover"
      style={{
        backgroundColor: "#111120",
        border: featured ? "1px solid #E8A020" : "1px solid rgba(232,160,32,0.12)",
        boxShadow: featured ? "0 0 16px rgba(232,160,32,0.18)" : "none",
      }}
    >
      <div className="relative h-40 overflow-hidden">
        <Image
          src={pro.avatar || "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&q=80"}
          alt={pro.name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <span
          className="absolute top-3 left-3 text-xs font-medium px-2 py-0.5 rounded-full"
          style={{ backgroundColor: "#0F0F1A", color: "#E8A020", border: "1px solid #E8A020" }}
        >
          {categoryEmojis[pro.category]} {pro.category}
        </span>
        {featured && (
          <span
            className="absolute bottom-3 left-3 text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: "#E8A020", color: "#0F0F1A" }}
          >
            ⭐ Featured
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-base mb-1">{pro.name}</h3>
        <p className="text-xs text-gray-400 mb-2">📍 {pro.location}</p>
        {pro.tags && pro.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {pro.tags.slice(0, 3).map((t) => (
              <span key={t} className="text-xs px-2 py-0.5 rounded-full"
                style={{ backgroundColor: "rgba(232,160,32,0.1)", color: "#E8A020", border: "0.5px solid rgba(232,160,32,0.25)" }}>
                {t}
              </span>
            ))}
          </div>
        )}
        <p className="text-xs text-gray-500 line-clamp-2">{pro.description}</p>
        <div
          className="mt-4 w-full py-2 rounded-lg text-xs font-semibold text-center transition-opacity hover:opacity-90"
          style={{ backgroundColor: featured ? "#E8A020" : "#E8A02020", color: featured ? "#0F0F1A" : "#E8A020", border: featured ? "none" : "1px solid #E8A02060" }}
        >
          View Profile →
        </div>
      </div>
    </Link>
  );
}

export default function PartyClient({ professionals }: { professionals: Professional[] }) {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const [activeCategory, setActiveCategory] = useState("All");

  useEffect(() => {
    const cat = searchParams.get("category");
    if (cat && CATEGORIES.includes(cat)) setActiveCategory(cat);
  }, [searchParams]);

  const cityParam = searchParams.get("city") || "";

  const filtered = professionals.filter((p) => {
    if (activeCategory !== "All" && p.category !== activeCategory) return false;
    if (cityParam && p.location && !p.location.toLowerCase().includes(cityParam.toLowerCase())) return false;
    return true;
  });

  const featuredFiltered = filtered.filter((p) => p.isFeatured);
  const regularFiltered = filtered.filter((p) => !p.isFeatured);

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
          <h1 className="text-4xl md:text-5xl font-semibold mb-4">{t("party_hero_title")}</h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            {t("party_hero_body")}
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
                backgroundColor: activeCategory === cat ? "#E8A020" : "#111120",
                color: activeCategory === cat ? "#0F0F1A" : "rgba(255,255,255,0.45)",
                border: `1px solid ${activeCategory === cat ? "#E8A020" : "rgba(232,160,32,0.12)"}`,
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

        {/* ── Featured section ── */}
        {featuredFiltered.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-5">
              <span className="section-divider" />
              <h2 className="text-xl font-bold tracking-tight">⭐ Featured</h2>
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: "#E8A02020", color: "#E8A020", border: "1px solid #E8A02040" }}
              >
                {featuredFiltered.length} professional{featuredFiltered.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {featuredFiltered.map((pro) => (
                <ProfCard key={pro.id} pro={pro} featured />
              ))}
            </div>
            {regularFiltered.length > 0 && (
              <div className="border-t mt-8" style={{ borderColor: "#1A1A2E" }} />
            )}
          </div>
        )}

        {/* Regular grid */}
        {regularFiltered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {regularFiltered.map((pro) => (
              <ProfCard key={pro.id} pro={pro} />
            ))}
          </div>
        )}

        {filtered.length === 0 && (
          <p className="text-center text-gray-500 py-16">No professionals found in this category.</p>
        )}
      </div>
    </div>
  );
}
