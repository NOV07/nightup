"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

const CATEGORIES = ["All", "Venues", "Festivals", "Artists", "Guide", "Music", "Culture"];

interface Article {
  id: string;
  title: string;
  category: string;
  date: string;
  readTime: string;
  image: string;
  excerpt: string;
}

export default function ArticlesClient({ articles }: { articles: Article[] }) {
  const [activeCategory, setActiveCategory] = useState("All");

  const filtered = articles.filter(
    (a) => activeCategory === "All" || a.category === activeCategory
  );

  return (
    <div>
      {/* Category Filters */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-8">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className="whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-all flex-shrink-0"
            style={{
              backgroundColor: activeCategory === cat ? "#E8A020" : "#111120",
              color: activeCategory === cat ? "#0F0F1A" : "rgba(255,255,255,0.45)",
              border: `1px solid ${activeCategory === cat ? "#E8A020" : "rgba(232,160,32,0.12)"}`,
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((a) => (
          <Link
            key={a.id}
            href={`/articles/${a.id}`}
            className="group block rounded-2xl overflow-hidden card-hover"
            style={{ backgroundColor: "#111120", border: "1px solid rgba(232,160,32,0.1)" }}
          >
            <div className="relative h-52 overflow-hidden">
              <Image
                src={a.image}
                alt={a.title}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <span
                className="absolute top-3 left-3 text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: "#E8A020", color: "#0F0F1A" }}
              >
                {a.category}
              </span>
            </div>
            <div className="p-5">
              <h3 className="font-semibold text-base mb-2 line-clamp-2 leading-snug">{a.title}</h3>
              <p className="text-xs text-gray-400 mb-3 line-clamp-2">{a.excerpt}</p>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{new Date(a.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                <span>{a.readTime}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20 text-gray-500">
          <p className="text-4xl mb-4">📰</p>
          <p>No articles in this category yet.</p>
        </div>
      )}
    </div>
  );
}
