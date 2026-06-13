"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import EventCard from "../../components/EventCard";

import { CITIES, GENRES, GENRE_LABELS } from "../../lib/searchConstants";
const PAGE_SIZE = 12;

interface Event {
  id: string; title: string; image: string; genre: string; price: string;
  date: string; time: string; venue: string; city: string;
  interestedCount: number; goingCount: number; featured?: boolean;
  isRadarPick?: boolean;
}

export default function EventsAllClient({ initialEvents }: { initialEvents: Event[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [query, setQuery]     = useState(searchParams.get("q")     || "");
  const [city, setCity]       = useState(searchParams.get("city")  || "All Cities");
  const [genre, setGenre]     = useState(searchParams.get("genre") || "All");
  const [dateFrom, setDateFrom] = useState(searchParams.get("from") || "");
  const [page, setPage]       = useState(1);

  const activeFilters: { key: string; label: string }[] = [];
  if (query)                activeFilters.push({ key: "q",    label: `"${query}"` });
  if (city !== "All Cities") activeFilters.push({ key: "city", label: city });
  if (genre !== "All")       activeFilters.push({ key: "genre", label: genre });
  if (dateFrom)              activeFilters.push({ key: "from", label: `From ${dateFrom}` });

  function removeFilter(key: string) {
    if (key === "q")    setQuery("");
    if (key === "city") setCity("All Cities");
    if (key === "genre") setGenre("All");
    if (key === "from") setDateFrom("");
    setPage(1);
  }

  useEffect(() => {
    const params = new URLSearchParams();
    if (query)              params.set("q",     query);
    if (city !== "All Cities") params.set("city", city);
    if (genre !== "All")    params.set("genre", genre);
    if (dateFrom)           params.set("from",  dateFrom);
    router.replace(`/events/all?${params.toString()}`, { scroll: false });
  }, [query, city, genre, dateFrom, router]);

  const filtered = initialEvents.filter((e) => {
    if (genre !== "All" && e.genre?.toLowerCase() !== genre.toLowerCase()) return false;
    if (city !== "All Cities" && e.city?.toLowerCase() !== city.toLowerCase()) return false;
    if (dateFrom && e.date < dateFrom) return false;
    if (query) {
      const q = query.toLowerCase();
      if (
        !e.title.toLowerCase().includes(q) &&
        !e.venue.toLowerCase().includes(q) &&
        !e.city.toLowerCase().includes(q)
      ) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <a href="/events" className="text-sm text-gray-400 hover:text-white transition-colors">← Events</a>
        <h1 className="text-2xl font-bold">All Events</h1>
      </div>

      {/* ── Filters ─────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-4 mb-6"
        style={{ backgroundColor: "#0a0a14", border: "1px solid rgba(232,160,32,0.12)" }}
      >
        {/* Row 1: search + city + date */}
        <div className="flex flex-col sm:flex-row gap-3 mb-3">
          <input
            type="text"
            placeholder="Search events, venues..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            className="flex-1 px-3 py-2 rounded-xl text-sm outline-none focus-gold"
            style={{ backgroundColor: "#0d0d1a", color: "#fff", border: "1px solid rgba(232,160,32,0.15)" }}
          />
          <select
            value={city}
            onChange={(e) => { setCity(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-xl text-sm outline-none cursor-pointer focus-gold"
            style={{ backgroundColor: "#0d0d1a", color: "#fff", border: "1px solid rgba(232,160,32,0.15)" }}
          >
            {CITIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-xl text-sm outline-none focus-gold"
            style={{
              backgroundColor: "#0d0d1a",
              color: dateFrom ? "#fff" : "#555",
              border: "1px solid rgba(232,160,32,0.15)",
              colorScheme: "dark",
            }}
          />
        </div>

        {/* Row 2: genre pills */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {GENRES.map((g) => (
            <button
              key={g}
              onClick={() => { setGenre(g); setPage(1); }}
              className="whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium transition-all flex-shrink-0"
              style={{
                backgroundColor: genre === g ? "#E8A020" : "#111120",
                color: genre === g ? "#0F0F1A" : "rgba(255,255,255,0.45)",
                border: `1px solid ${genre === g ? "#E8A020" : "rgba(232,160,32,0.12)"}`,
              }}
            >
              {g === "All" ? "Όλα" : GENRE_LABELS[g] ?? g}
            </button>
          ))}
        </div>

        {/* Active filter chips */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {activeFilters.map((f) => (
              <button
                key={f.key}
                onClick={() => removeFilter(f.key)}
                className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-full transition-opacity hover:opacity-70"
                style={{ backgroundColor: "#E8A020", color: "#0F0F1A" }}
              >
                {f.label}
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="text-sm text-gray-400 mb-4">
        {filtered.length} event{filtered.length !== 1 ? "s" : ""} found
      </p>

      {paginated.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {paginated.map((e, i) => (
            <div
              key={e.id}
              className="animate-fade-up hover:scale-[1.02] hover:-translate-y-0.5 transition-all duration-300"
              style={{ animationDelay: `${0.2 + i * 0.05}s` }}
            >
              <EventCard {...e} badge={e.isRadarPick ? "Nightup Radar" : undefined} />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 text-gray-500">
          <p className="text-4xl mb-4">🔍</p>
          <p>No events match your filters.</p>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-40 transition-colors"
            style={{ backgroundColor: "#111120", border: "1px solid rgba(232,160,32,0.2)", color: "#fff" }}
          >
            ← Prev
          </button>
          <span className="text-sm text-gray-400">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-40 transition-colors"
            style={{ backgroundColor: "#111120", border: "1px solid rgba(232,160,32,0.2)", color: "#fff" }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
