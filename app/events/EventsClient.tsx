"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import EventCard from "../components/EventCard";
import { useLanguage } from "../components/LanguageContext";

const GENRES = ["All", "Techno", "House", "Deep House", "Hip-Hop", "R&B", "Latin", "Open Air", "Rock", "Laika", "Entechno", "Other"];
const CITIES = ["All Cities", "Athens", "Thessaloniki", "Mykonos", "Santorini", "Heraklion", "Patras", "Rhodes", "Ios", "Corfu", "Zakynthos"];

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
  featured?: boolean;
  nightupPick?: boolean;
  organizerName?: string;
  organizerSlug?: string;
}

function getWeekRange() {
  const now = new Date();
  const day = now.getDay();
  const mon = new Date(now);
  mon.setDate(now.getDate() - ((day + 6) % 7));
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return {
    from: mon.toISOString().split("T")[0],
    to: sun.toISOString().split("T")[0],
  };
}

export default function EventsClient({ events }: { events: Event[] }) {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const [genre, setGenre] = useState("All");
  const [city, setCity] = useState("All Cities");
  const [dateFilter, setDateFilter] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const q = searchParams.get("q");
    const c = searchParams.get("city");
    const g = searchParams.get("genre");
    if (q) setQuery(q);
    if (c && CITIES.includes(c)) setCity(c);
    if (g && GENRES.includes(g)) setGenre(g);
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

  const { from: weekStart, to: weekEnd } = getWeekRange();

  const hotEvents = [...events]
    .filter((e) => e.featured)
    .sort((a, b) => (b.interestedCount + b.goingCount) - (a.interestedCount + a.goingCount))
    .slice(0, 3);

  const hotIds = new Set(hotEvents.map((e) => e.id));
  const popularEvents = [...events]
    .filter((e) => !hotIds.has(e.id))
    .sort((a, b) => (b.interestedCount + b.goingCount) - (a.interestedCount + a.goingCount))
    .slice(0, 2);

  const nightupPicks = events.filter((e) => e.nightupPick);

  const weekendEvents = events.filter((e) => e.date >= weekStart && e.date <= weekEnd).slice(0, 8);

  const isFiltering = genre !== "All" || city !== "All Cities" || dateFilter || query;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold mb-2">{t("events_hero_title")}</h1>
        <p className="text-gray-400">{t("events_hero_body")}</p>
      </div>

      {/* Search + Filters */}
      <div className="rounded-2xl p-4 mb-8" style={{ backgroundColor: "#0a0a14", border: "1px solid rgba(232,160,32,0.12)" }}>
        <div className="flex flex-col sm:flex-row gap-3 mb-3">
          <input
            type="text"
            placeholder="Search events, artists, venues..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 px-3 py-2 rounded-xl text-sm outline-none focus-gold"
            style={{ backgroundColor: "#0d0d1a", color: "#fff", border: "1px solid rgba(232,160,32,0.15)" }}
          />
          <select value={city} onChange={(e) => setCity(e.target.value)} className="px-3 py-2 rounded-xl text-sm outline-none cursor-pointer focus-gold" style={{ backgroundColor: "#0d0d1a", color: "#fff", border: "1px solid rgba(232,160,32,0.15)" }}>
            {CITIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm outline-none focus-gold"
            style={{ backgroundColor: "#0d0d1a", color: dateFilter ? "#fff" : "#555", border: "1px solid rgba(232,160,32,0.15)", colorScheme: "dark" }}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {GENRES.map((g) => (
            <button
              key={g}
              onClick={() => setGenre(g)}
              className="whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium transition-all flex-shrink-0"
              style={{
                backgroundColor: genre === g ? "#E8A020" : "#111120",
                color: genre === g ? "#0F0F1A" : "rgba(255,255,255,0.45)",
                border: `1px solid ${genre === g ? "#E8A020" : "rgba(232,160,32,0.12)"}`,
              }}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {isFiltering ? (
        /* Filtered results */
        <div>
          <p className="text-sm text-gray-400 mb-4">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</p>
          {filtered.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              <p className="text-4xl mb-4">🎧</p>
              <p>No events match your search. Try different filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {filtered.map((e) => <EventCard key={e.id} {...e} />)}
            </div>
          )}
        </div>
      ) : (
        /* Sectioned view */
        <div className="space-y-12">
          {/* Hot Events */}
          {hotEvents.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-5">
                <span className="section-divider" />
                <h2 className="text-xl font-bold tracking-tight">🔥 Hot Events</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {hotEvents.map((e) => (
                  <EventCard key={e.id} {...e} badge="🔥 Hot" />
                ))}
              </div>
            </section>
          )}

          {/* Most Popular */}
          {popularEvents.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-5">
                <span className="section-divider" />
                <h2 className="text-xl font-bold tracking-tight">📈 Most Popular</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {popularEvents.map((e) => (
                  <EventCard key={e.id} {...e} badge="📈 Popular" />
                ))}
              </div>
            </section>
          )}

          {/* Nightup Picks */}
          {nightupPicks.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-5">
                <span className="section-divider" />
                <h2 className="text-xl font-bold tracking-tight">⭐ Nightup Picks</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {nightupPicks.map((e) => <EventCard key={e.id} {...e} />)}
              </div>
            </section>
          )}

          {/* This Weekend */}
          <section>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <span className="section-divider" />
                <h2 className="text-xl font-bold tracking-tight">This Weekend</h2>
              </div>
              <Link href="/events/all" className="text-sm font-medium transition-colors hover:text-white" style={{ color: "#E8A020" }}>View All →</Link>
            </div>
            {weekendEvents.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <p>No events this weekend yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {weekendEvents.map((e) => <EventCard key={e.id} {...e} />)}
              </div>
            )}
          </section>

          <div className="text-center pt-4">
            <Link
              href="/events/all"
              className="inline-block px-8 py-3 rounded-full font-semibold transition-transform hover:scale-105"
              style={{ backgroundColor: "#E8A020", color: "#0F0F1A" }}
            >
              View All Events →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
