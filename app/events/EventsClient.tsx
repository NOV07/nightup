"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { FiMapPin, FiFilter } from "react-icons/fi";
import EventCard from "../components/EventCard";
import HotEventCard from "../components/HotEventCard";
import CompactEventItem from "../components/CompactEventItem";
import { useLanguage } from "../components/LanguageContext";
import EventsFilterModal, { EventsFilterResult } from "@/components/EventsFilterModal";

import { CITIES, GENRES } from "../lib/searchConstants";

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
  isRadarPick?: boolean;
  organizerName?: string;
  organizerSlug?: string;
}

function getWeekend(): { fri: string; sun: string } {
  const now = new Date();
  const day = now.getDay();
  const fri = new Date(now);
  fri.setDate(now.getDate() + ((5 - day + 7) % 7));
  const sun = new Date(fri);
  sun.setDate(fri.getDate() + 2);
  return {
    fri: fri.toISOString().split("T")[0],
    sun: sun.toISOString().split("T")[0],
  };
}

function getTomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

function getNearestSaturday(): string {
  const now = new Date();
  const day = now.getDay();
  const sat = new Date(now);
  sat.setDate(now.getDate() + ((6 - day + 7) % 7));
  return sat.toISOString().split("T")[0];
}

const MODAL_CITY_MAP: Record<string, string> = {
  "Αθήνα": "Athens",
  "Θεσσαλονίκη": "Thessaloniki",
  "Όλη η Ελλάδα": "All Cities",
};

function groupByDay(evts: Event[]): Record<string, Event[]> {
  const groups: Record<string, Event[]> = {};
  evts.forEach((e) => {
    const day = new Date(e.date).toLocaleDateString("en-US", { weekday: "long" });
    if (!groups[day]) groups[day] = [];
    groups[day].push(e);
  });
  return groups;
}

// ── Section header ────────────────────────────────────────────
function SectionHeader({
  title, subtitle, count, href,
}: {
  title: string;
  subtitle?: string;
  count?: number;
  href?: string;
}) {
  return (
    <div className="flex items-end justify-between mb-4">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
          <span className="inline-block w-1 h-4 bg-amber-400 rounded-sm" />
          {title}
        </h2>
        {subtitle && <p className="text-xs text-white/50 mt-1">{subtitle}</p>}
      </div>
      {href && count !== undefined && count > 0 && (
        <a href={href} className="text-xs text-amber-400 hover:translate-x-1 transition-transform">
          Δες όλα {count} →
        </a>
      )}
    </div>
  );
}

export default function EventsClient({
  events,
  nearbyCity,
}: {
  events: Event[];
  nearbyCity: string;
}) {
  const { lang, t } = useLanguage();
  const searchParams = useSearchParams();
  const [genre, setGenre] = useState("All");
  const [city, setCity]   = useState("All Cities");
  const [dateFilter, setDateFilter] = useState("");
  const [query, setQuery] = useState("");

  // ── Filter modal ─────────────────────────────────────────────
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [modalWhen, setModalWhen] = useState<string | null>(null);
  const [modalMood, setModalMood] = useState<string | null>(null);
  const [modalCity, setModalCity] = useState<string | null>(null);

  useEffect(() => {
    const q = searchParams.get("q");
    const c = searchParams.get("city");
    const g = searchParams.get("genre");
    const d = searchParams.get("date");
    if (q) setQuery(q);
    if (c && CITIES.includes(c)) setCity(c);
    if (g && GENRES.includes(g)) setGenre(g);
    if (d) setDateFilter(d);
  }, [searchParams]);

  const today = new Date().toISOString().split("T")[0];
  const { fri, sun } = getWeekend();
  const el = lang === "el";

  // ── Derivations ──────────────────────────────────────────────
  const allHot = [...events]
    .filter((e) => e.featured)
    .sort((a, b) => (b.interestedCount + b.goingCount) - (a.interestedCount + a.goingCount));
  const hotEvents = allHot.slice(0, 3);
  const hotIds    = new Set(allHot.map((e) => e.id));

  const allPopular = [...events]
    .filter((e) => !hotIds.has(e.id))
    .sort((a, b) => (b.interestedCount + b.goingCount) - (a.interestedCount + a.goingCount));
  const popularEvents = allPopular.slice(0, 4);

  const allTonight    = events.filter((e) => e.date?.slice(0, 10) === today);
  const tonightEvents = allTonight.slice(0, 8);

  const allWeekend    = events.filter((e) => { const d = e.date?.slice(0, 10); return d >= fri && d <= sun; });
  const weekendEvents = allWeekend.slice(0, 8);

  const nearYouCount = events.filter((e) =>
    e.city?.toLowerCase().includes(nearbyCity.toLowerCase())
  ).length;

  // ── Filter ───────────────────────────────────────────────────
  const filtered = events.filter((e) => {
    if (genre !== "All" && e.genre !== genre) return false;
    if (city !== "All Cities" && e.city !== city) return false;
    if (dateFilter && e.date?.slice(0, 10) !== dateFilter) return false;
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

  const isFiltering = genre !== "All" || city !== "All Cities" || dateFilter || query;

  // ── Filter modal handlers ────────────────────────────────────
  function handleApplyFilters(result: EventsFilterResult) {
    if (result.when === "Απόψε") setDateFilter(today);
    else if (result.when === "Αύριο") setDateFilter(getTomorrow());
    else if (result.when === "Σαββατοκύριακο") setDateFilter(getNearestSaturday());
    setModalWhen(result.when);

    setCity(MODAL_CITY_MAP[result.city] ?? "All Cities");
    setModalCity(result.city === "Όλη η Ελλάδα" ? null : result.city);

    setModalMood(result.mood);
  }

  function clearModalWhen() {
    setDateFilter("");
    setModalWhen(null);
  }

  function clearModalCity() {
    setCity("All Cities");
    setModalCity(null);
  }

  function clearModalMood() {
    setModalMood(null);
  }

  function clearAllModalFilters() {
    clearModalWhen();
    clearModalCity();
    clearModalMood();
  }

  const hasModalFilters = !!(modalWhen || modalMood || modalCity);

  const labels = {
    hot:     t("events_section_hot"),
    popular: t("events_section_popular"),
    tonight: t("events_section_tonight"),
    weekend: t("events_section_weekend"),
    near:    t("events_section_near"),
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">

      {/* ── Hero ──────────────────────────────────────────── */}
      <div className="mb-8 animate-fade-up">
        <h1 className="text-3xl font-semibold mb-2">{t("events_hero_title")}</h1>
        <p className="text-gray-400">{t("events_hero_body")}</p>
      </div>

      {/* ── Modal filter chips ───────────────────────────────── */}
      {hasModalFilters && (
        <div className="flex items-center gap-2 flex-wrap mb-6 animate-fade-up">
          {modalWhen && (
            <span
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full"
              style={{ backgroundColor: "rgba(232,160,32,0.1)", color: "#E8A020", border: "1px solid rgba(232,160,32,0.25)" }}
            >
              {modalWhen}
              <button onClick={clearModalWhen} aria-label="Καθαρισμός ημερομηνίας" className="leading-none">×</button>
            </span>
          )}
          {modalMood && (
            <span
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full"
              style={{ backgroundColor: "rgba(232,160,32,0.1)", color: "#E8A020", border: "1px solid rgba(232,160,32,0.25)" }}
            >
              {modalMood}
              <button onClick={clearModalMood} aria-label="Καθαρισμός mood" className="leading-none">×</button>
            </span>
          )}
          {modalCity && (
            <span
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full"
              style={{ backgroundColor: "rgba(232,160,32,0.1)", color: "#E8A020", border: "1px solid rgba(232,160,32,0.25)" }}
            >
              {modalCity}
              <button onClick={clearModalCity} aria-label="Καθαρισμός πόλης" className="leading-none">×</button>
            </span>
          )}
          <button
            onClick={clearAllModalFilters}
            className="text-xs font-medium px-3 py-1.5 rounded-full transition-colors hover:bg-white/5"
            style={{ color: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            Καθαρισμός
          </button>
        </div>
      )}

      {/* ── Filters ───────────────────────────────────────── */}
      <div
        className="rounded-2xl p-4 mb-8 animate-fade-up"
        style={{ animationDelay: "0.03s", backgroundColor: "#0a0a14", border: "1px solid rgba(232,160,32,0.12)" }}
      >
        <div className="flex flex-col sm:flex-row gap-3 mb-3">
          <input
            type="text"
            placeholder={t("events_search_placeholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 px-3 py-2 rounded-xl text-sm outline-none focus-gold"
            style={{ backgroundColor: "#0d0d1a", color: "#fff", border: "1px solid rgba(232,160,32,0.15)" }}
          />
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm outline-none cursor-pointer focus-gold"
            style={{ backgroundColor: "#0d0d1a", color: "#fff", border: "1px solid rgba(232,160,32,0.15)" }}
          >
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
        /* ── Filtered results ─────────────────────────────── */
        <div>
          <p className="text-sm text-gray-400 mb-4">
            {filtered.length} result{filtered.length !== 1 ? "s" : ""}
          </p>
          {filtered.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              <p className="text-4xl mb-4">🎧</p>
              <p>{t("events_no_results")} {t("events_no_results_hint")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {filtered.map((e, i) => (
                <div
                  key={e.id}
                  className="animate-fade-up hover:scale-[1.02] hover:-translate-y-0.5 transition-all duration-300"
                  style={{ animationDelay: `${0.2 + i * 0.05}s` }}
                >
                  <EventCard {...e} badge={e.isRadarPick ? "Nightup Radar" : undefined} />
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ── Sectioned view ───────────────────────────────── */
        <div className="space-y-14">

          {/* ── Hot — featured layout ─────────────────────── */}
          {hotEvents.length > 0 && (
            <section className="animate-fade-up" style={{ animationDelay: `${0.05 + 0 * 0.1}s` }}>
              <SectionHeader
                title={labels.hot}
                subtitle="Επιλογές από το Nightup"
                count={allHot.length}
                href="/events/all"
              />

              {hotEvents.length === 1 && (
                <div className="animate-fade-up" style={{ animationDelay: `${0.2}s` }}>
                  <HotEventCard {...hotEvents[0]} variant="large" showHotBadge={true} />
                </div>
              )}

              {hotEvents.length === 2 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {hotEvents.map((e, i) => (
                    <div key={e.id} className="animate-fade-up" style={{ animationDelay: `${0.2 + i * 0.05}s` }}>
                      <HotEventCard {...e} variant="compact" showHotBadge={true} />
                    </div>
                  ))}
                </div>
              )}

              {hotEvents.length >= 3 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Large hero */}
                  <div className="animate-fade-up" style={{ animationDelay: "0.2s" }}>
                    <HotEventCard {...hotEvents[0]} variant="large" showHotBadge={true} />
                  </div>
                  {/* Two stacked */}
                  <div className="grid gap-4" style={{ gridTemplateRows: "1fr 1fr", height: "480px" }}>
                    {hotEvents.slice(1, 3).map((e, i) => (
                      <div key={e.id} className="animate-fade-up" style={{ animationDelay: `${0.25 + i * 0.05}s` }}>
                        <HotEventCard {...e} variant="compact" showHotBadge={true} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* ── Most Popular — 4-col ──────────────────────── */}
          {popularEvents.length > 0 && (
            <section className="animate-fade-up" style={{ animationDelay: `${0.05 + 1 * 0.1}s` }}>
              <SectionHeader
                title={labels.popular}
                subtitle="Με βάση τις αντιδράσεις"
                count={Math.min(allPopular.length, 20)}
                href="/events/all?sort=popular"
              />
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {popularEvents.map((e, i) => (
                  <div
                    key={e.id}
                    className="animate-fade-up hover:scale-[1.02] hover:-translate-y-0.5 transition-all duration-300"
                    style={{ animationDelay: `${0.2 + i * 0.05}s` }}
                  >
                    <EventCard {...e} badge={e.isRadarPick ? "Nightup Radar" : undefined} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Tonight | This Weekend ────────────────────── */}
          {(tonightEvents.length > 0 || weekendEvents.length > 0) && (
            <section className="animate-fade-up" style={{ animationDelay: `${0.05 + 2 * 0.1}s` }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                {/* Tonight — always render when section is visible */}
                <div>
                  <SectionHeader
                    title={labels.tonight}
                    count={allTonight.length}
                    href={`/events?date=${today}`}
                  />
                  {tonightEvents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
                        {el ? "Ήσυχη βραδιά απόψε" : "Quiet night tonight"}
                      </p>
                      <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.2)" }}>
                        {el ? "Δες το σαββατοκύριακο →" : "Check the weekend →"}
                      </p>
                    </div>
                  ) : (
                    <>
                      {tonightEvents.map((e, i) => (
                        <CompactEventItem key={e.id} {...e} delay={`${0.2 + i * 0.05}s`} />
                      ))}
                      {tonightEvents.length < 3 && (
                        <div
                          className="mt-4 p-3 rounded-lg text-xs text-center"
                          style={{ border: "1px solid rgba(255,255,255,0.05)", backgroundColor: "rgba(255,255,255,0.02)", color: "rgba(255,255,255,0.35)" }}
                        >
                          {el ? "Λίγα events απόψε — δες το σαββατοκύριακο →" : "Slow night — see the weekend →"}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* This Weekend — grouped by day when 4+ events */}
                {weekendEvents.length > 0 && (
                  <div>
                    <SectionHeader
                      title={labels.weekend}
                      count={allWeekend.length}
                      href="/events/all"
                    />
                    {weekendEvents.length >= 4
                      ? Object.entries(groupByDay(weekendEvents)).map(([day, items], gi) => (
                          <div key={day}>
                            <p
                              className="text-[10px] uppercase tracking-wider mb-2"
                              style={{ color: "rgba(232,160,32,0.7)", marginTop: gi === 0 ? 0 : "12px" }}
                            >
                              {day}
                            </p>
                            {items.map((e, i) => (
                              <CompactEventItem key={e.id} {...e} delay={`${0.2 + i * 0.05}s`} />
                            ))}
                          </div>
                        ))
                      : weekendEvents.map((e, i) => (
                          <CompactEventItem key={e.id} {...e} delay={`${0.2 + i * 0.05}s`} />
                        ))
                    }
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ── Near You — minimal CTA bar ────────────────── */}
          <div className="animate-fade-up" style={{ animationDelay: `${0.05 + 3 * 0.1}s` }}>
            <div
              className="rounded-xl flex items-center justify-between gap-4 px-5 py-4"
              style={{ border: "1px solid rgba(232,160,32,0.2)", backgroundColor: "rgba(255,255,255,0.03)" }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: "rgba(232,160,32,0.12)" }}
                >
                  <FiMapPin size={16} style={{ color: "var(--gold)" }} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white" style={{ fontFamily: "var(--font-sans)" }}>
                    {labels.near} · {nearbyCity}
                  </p>
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.45)", fontFamily: "var(--font-sans)" }}>
                    {nearYouCount > 0
                      ? `${nearYouCount} ${el ? "events κοντά σου" : "events near you"}`
                      : el ? "Δεν υπάρχουν events αυτή τη στιγμή" : "No events right now"}
                  </p>
                </div>
              </div>
              {nearYouCount > 0 && (
                <a
                  href={`/events?city=${encodeURIComponent(nearbyCity)}`}
                  className="text-xs font-medium whitespace-nowrap transition-colors hover:bg-amber-500/10 px-3 py-1.5 rounded-md flex-shrink-0"
                  style={{ color: "var(--gold)", border: "1px solid rgba(232,160,32,0.4)", fontFamily: "var(--font-sans)" }}
                >
                  {el ? "Εξερεύνηση" : "Explore"} →
                </a>
              )}
            </div>
          </div>

          {/* ── View All ──────────────────────────────────── */}
          <div className="text-center pt-4 animate-fade-up" style={{ animationDelay: "0.45s" }}>
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

      {/* ── Filter modal trigger ─────────────────────────────── */}
      <button
        onClick={() => setShowFilterModal(true)}
        style={{
          position: "fixed",
          bottom: 28,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 150,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "12px 20px",
          borderRadius: 6,
          backgroundColor: "#E8A020",
          color: "#0F0F1A",
          fontWeight: 700,
          fontSize: 13,
          border: "none",
          cursor: "pointer",
          boxShadow: "0 4px 24px rgba(232,160,32,0.35)",
          whiteSpace: "nowrap",
        }}
      >
        <FiFilter size={15} />
        Events
      </button>

      {showFilterModal && (
        <EventsFilterModal onClose={() => setShowFilterModal(false)} onApply={handleApplyFilters} />
      )}
    </div>
  );
}
