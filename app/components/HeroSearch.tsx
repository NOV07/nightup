"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const CITIES = ["All Cities", "Athens", "Thessaloniki", "Mykonos", "Santorini", "Heraklion", "Patras"];

export default function HeroSearch() {
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("All Cities");
  const router = useRouter();

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (city !== "All Cities") params.set("city", city);
    router.push(`/events?${params.toString()}`);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        className="flex flex-col sm:flex-row gap-2 p-2 rounded-2xl"
        style={{ backgroundColor: "#1A1A2E", border: "1px solid #333" }}
      >
        {/* Search input */}
        <div className="flex items-center gap-2 flex-1 px-3">
          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search events, artists, venues..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none text-sm py-2"
          />
        </div>

        {/* City selector */}
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="px-3 py-2 rounded-xl text-sm outline-none cursor-pointer sm:border-l"
          style={{ backgroundColor: "#16213E", color: "#fff", borderColor: "#333" }}
        >
          {CITIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        {/* Search button */}
        <button
          onClick={handleSearch}
          className="px-6 py-2 rounded-xl font-semibold text-sm transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#E8A020", color: "#0F0F1A" }}
        >
          Search
        </button>
      </div>
    </div>
  );
}
