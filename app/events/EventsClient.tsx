"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import EventCard from "../components/EventCard";

const GENRES = ["All", "Techno", "House", "Deep House", "Hip-Hop", "R&B", "Latin", "Open Air", "Afrobeats", "Live Music"];
const CITIES = ["All Cities", "Athens", "Thessaloniki", "Mykonos", "Heraklion", "Patras"];

interface Event {
  id: string;
  title: string;
  image: string;
  genre: string;
  price: string;
  date: string;
  time: string;
  venue: string;
  city: string;
  interestedCount: number;
  goingCount: number;
}

export default function EventsClient({ events }: { events: Event[] }) {
  const searchParams = useSearchParams();
  const [genre, setGenre] = useState("All");
  const [city, setCity] = useState("All Cities");
  const [dateFilter, setDateFilter] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const q = searchParams.get("q");
    const c = searchParams.get("city");
    if (q) setQuery(q);
    if (c && CITIES.includes(c)) setCity(c);
  }, [searchParams]);

  const filtered = events.filter((e) => {
    if (genre !== "All" && e.genre !== genre) return false;
    if (city !== "All Cities" && e.city !== city) return false;
    if (dateFilter && e.date !== dateFilter) return false;
    if (query) {
      const q = query.toLowerCase();
      if (!e.title.toLowerCase().includes(q) && !e.venue.toLowerCase().includes(q) && !e.city.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold mb-2">Every night has its sound.</h1>
        <p className="text-gray-400">Βρες το event που ταιριάζει στο βράδυ σου — από techno μέχρι μπουζούκια.</p>
      </div>

      {/* Genre Pills */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-hide">
        {GENRES.map((g) => (
          <button
            key={g}
            onClick={() => setGenre(g)}
            className="whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-all flex-shrink-0"
            style={{
              backgroundColor: genre === g ? "#E8A020" : "#1A1A2E",
              color: genre === g ? "#0F0F1A" : "#aaa",
              border: `1px solid ${genre === g ? "#E8A020" : "#333"}`,
            }}
          >
            {g}
          </button>
        ))}
      </div>

      {/* Filters Row */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-8">
        {/* Search query */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <input
            type="text"
            placeholder="Search events, venues..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg text-sm outline-none"
            style={{ backgroundColor: "#1A1A2E", color: "#fff", border: "1px solid #333" }}
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-xs text-gray-400 hover:text-white whitespace-nowrap">
              Clear
            </button>
          )}
        </div>

        {/* Date + City filters row on mobile */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Date filter */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-400 whitespace-nowrap">Date:</label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-sm outline-none"
              style={{ backgroundColor: "#1A1A2E", color: "#fff", border: "1px solid #333" }}
            />
            {dateFilter && (
              <button onClick={() => setDateFilter("")} className="text-xs text-gray-400 hover:text-white">
                Clear
              </button>
            )}
          </div>

          {/* City filter */}
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-sm outline-none cursor-pointer"
            style={{ backgroundColor: "#1A1A2E", color: "#fff", border: "1px solid #333" }}
          >
            {CITIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <span className="text-xs text-gray-500">
            {filtered.length} event{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Events Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-24 text-gray-500">
          <p className="text-4xl mb-4">🎧</p>
          <p>No events found. Try different filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((e) => (
            <EventCard key={e.id} {...e} />
          ))}
        </div>
      )}
    </div>
  );
}
