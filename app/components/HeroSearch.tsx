"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const CITIES = ["All Cities", "Athens", "Thessaloniki", "Mykonos", "Santorini", "Heraklion", "Patras", "Rhodes", "Ios", "Corfu", "Zakynthos"];
const EVENT_GENRES = ["All Genres", "Techno", "House", "Deep House", "Hip-Hop", "R&B", "Latin", "Open Air", "Rock", "Laika", "Entechno", "Other"];
const PRO_CATEGORIES = ["All Categories", "Venues", "Music & Artists", "Sound & Lighting", "Food & Drinks", "Decoration", "Transport & VIP", "Photography", "Adults Only"];

type Mode = "events" | "professionals";

const selectStyle: React.CSSProperties = {
  backgroundColor: "transparent",
  color: "#fff",
  border: "none",
  outline: "none",
  cursor: "pointer",
  fontSize: "14px",
  width: "100%",
  padding: "10px 12px",
};

export default function HeroSearch() {
  const [mode, setMode] = useState<Mode>("events");
  const [city, setCity] = useState("All Cities");
  const [genre, setGenre] = useState("All Genres");
  const [category, setCategory] = useState("All Categories");
  const [date, setDate] = useState("");
  const router = useRouter();

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (city !== "All Cities") params.set("city", city);
    if (mode === "events") {
      if (genre !== "All Genres") params.set("genre", genre);
      if (date) params.set("date", date);
      router.push(`/events?${params.toString()}`);
    } else {
      if (category !== "All Categories") params.set("category", category);
      router.push(`/party?${params.toString()}`);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center">

      {/* Mode toggle — pill slider */}
      <div
        className="inline-flex rounded-full p-1 mb-5"
        style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        {(["events", "professionals"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className="px-5 py-2 rounded-full text-sm font-semibold transition-all"
            style={{
              backgroundColor: mode === m ? "#E8A020" : "transparent",
              color: mode === m ? "#0F0F1A" : "rgba(255,255,255,0.45)",
            }}
          >
            {m === "events" ? "🎪 Find Events" : "🎉 Find Professionals"}
          </button>
        ))}
      </div>

      {/* Search bar */}
      <div
        className="relative w-full flex flex-col sm:flex-row items-stretch rounded-2xl overflow-hidden"
        style={{
          backgroundColor: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.1)",
          backdropFilter: "blur(20px)",
        }}
      >
        {/* City */}
        <div className="flex items-center sm:border-r" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <span className="pl-4 flex-shrink-0" style={{ color: "rgba(255,255,255,0.3)" }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </span>
          <select value={city} onChange={(e) => setCity(e.target.value)} style={selectStyle}>
            {CITIES.map((c) => <option key={c} value={c} style={{ backgroundColor: "#1A1A2E" }}>{c}</option>)}
          </select>
        </div>

        {mode === "events" ? (
          <>
            <div className="flex items-center flex-1 sm:border-r" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
              <span className="pl-4 flex-shrink-0" style={{ color: "rgba(255,255,255,0.3)" }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </span>
              <select value={genre} onChange={(e) => setGenre(e.target.value)} style={selectStyle}>
                {EVENT_GENRES.map((g) => <option key={g} value={g} style={{ backgroundColor: "#1A1A2E" }}>{g}</option>)}
              </select>
            </div>
            <div className="flex items-center sm:border-r" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
              <span className="pl-4 flex-shrink-0" style={{ color: "rgba(255,255,255,0.3)" }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                style={{ ...selectStyle, colorScheme: "dark", color: date ? "#fff" : "rgba(255,255,255,0.3)" }} />
            </div>
          </>
        ) : (
          <div className="flex items-center flex-1 sm:border-r" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
            <span className="pl-4 flex-shrink-0" style={{ color: "rgba(255,255,255,0.3)" }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </span>
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={selectStyle}>
              {PRO_CATEGORIES.map((c) => <option key={c} value={c} style={{ backgroundColor: "#1A1A2E" }}>{c}</option>)}
            </select>
          </div>
        )}

        {/* Search button */}
        <button
          onClick={handleSearch}
          className="btn-gold-shimmer flex items-center justify-center gap-2 px-6 py-3 font-bold text-sm"
          style={{ color: "#0F0F1A", borderRadius: 0 }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Search
        </button>
      </div>
    </div>
  );
}
