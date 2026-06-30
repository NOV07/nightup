"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { FiMapPin } from "react-icons/fi";
import EventCard from "../components/EventCard";
import HotEventCard from "../components/HotEventCard";
import CompactEventItem from "../components/CompactEventItem";
import { useLanguage } from "../components/LanguageContext";
import EventsFilterModal, { EventsFilterResult } from "@/components/EventsFilterModal";

import { CITIES, GENRES, CITY_LABELS, GENRE_LABELS } from "../lib/searchConstants";

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
  type?: string | null;
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
  title, count, href,
}: {
  title: string;
  count?: number;
  href?: string;
}) {
  const { t } = useLanguage();
  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
            {title}
          </p>
          <div style={{ width: '24px', height: '1px', background: '#E8A020', marginTop: '6px' }} />
        </div>
        {href && count !== undefined && count > 0 && (
          <a href={href} style={{ color: '#E8A020', fontSize: '11px', letterSpacing: '0.05em', textDecoration: 'none' }}>
            {t("events_view_all")} {count} →
          </a>
        )}
      </div>
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
  const [activeCategory, setActiveCategory] = useState<'music' | 'culture' | 'sports' | 'other'>('music');

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

  const categoryTypeMap: Record<string, string> = {
    culture: 'culture',
    sports: 'sports',
    other: 'other',
  };
  const categoryEvents = events.filter(
    (e) => e.type === categoryTypeMap[activeCategory]
  );

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

  useEffect(() => {
    const segments: [string, boolean][] = [
      ['Every night has its ', false],
      ['sound.', true],
    ]
    const fullText = segments.map(s => s[0]).join('')
    const goldStart = segments[0][0].length
    const typed = document.getElementById('hero-typed')
    const cursor = document.getElementById('hero-cursor')
    const eyebrow = document.getElementById('hero-eyebrow')
    if (!typed || !cursor || !eyebrow) return
    let i = 0
    const interval = setInterval(() => {
      if (i >= fullText.length) {
        clearInterval(interval)
        setTimeout(() => { eyebrow.style.animation = 'cn-eyebrow 0.8s ease-out forwards' }, 200)
        setTimeout(() => { if (cursor) cursor.style.display = 'none' }, 1700)
        return
      }
      typed.innerHTML = ''
      const before = fullText.slice(0, Math.min(i + 1, goldStart))
      const after = i >= goldStart ? fullText.slice(goldStart, i + 1) : ''
      before.split('\n').forEach((line, idx) => {
        if (idx > 0) typed.appendChild(document.createElement('br'))
        typed.appendChild(document.createTextNode(line))
      })
      if (after) {
        const span = document.createElement('span')
        span.style.cssText = 'color:#E8A020;font-style:italic'
        span.textContent = after
        typed.appendChild(span)
      }
      i++
    }, 38)
    return () => clearInterval(interval)
  }, [])

  return (
    <>
      {/* ── Cinematic Hero ──────────────────────────────── */}
      <div style={{ position: 'relative', background: '#080808', overflow: 'hidden', minHeight: '280px', display: 'flex', alignItems: 'flex-end', padding: '32px 0 48px' }}>
        <style>{`
          @keyframes cn-flash { 0%{opacity:1} 100%{opacity:0} }
          @keyframes cn-float { from{transform:translateY(0) translateX(0);opacity:var(--op)} to{transform:translateY(-40px) translateX(var(--dx));opacity:calc(var(--op)*0.2)} }
          @keyframes cn-trail { 0%{transform:translateY(0);opacity:0} 10%{opacity:1} 90%{opacity:0.5} 100%{transform:translateY(-100px);opacity:0} }
          @keyframes cn-flare { 0%,100%{opacity:0.03;transform:scale(1)} 50%{opacity:0.08;transform:scale(1.12)} }
          @keyframes cn-blink { 0%,100%{opacity:1} 50%{opacity:0} }
          @keyframes cn-eyebrow { from{opacity:0;letter-spacing:0.6em} to{opacity:1;letter-spacing:0.35em} }
          @keyframes cn-particles-in { from{opacity:0} to{opacity:1} }
        `}</style>

        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'radial-gradient(ellipse 60% 80% at 20% 60%, rgba(232,160,32,0.35), transparent 60%)', animation: 'cn-flash 0.15s ease-out forwards', pointerEvents: 'none', zIndex: 20 }} />

        {([[20,20,200],[45,50,280],[70,15,160],[85,60,220]] as [number,number,number][]).map(([l,t,s],i) => (
          <div key={`f${i}`} style={{ position: 'absolute', width: s, height: s, left: `${l}%`, top: `${t}%`, transform: 'translate(-50%,-50%)', borderRadius: '50%', background: 'radial-gradient(circle, rgba(232,160,32,0.06) 0%, transparent 70%)', animation: `cn-flare ${6+i*2}s ease-in-out infinite`, animationDelay: `${i*1.5}s`, pointerEvents: 'none', zIndex: 1 }} />
        ))}

        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, animation: 'cn-particles-in 2s ease-out forwards', animationDelay: '0.15s', opacity: 0, pointerEvents: 'none', zIndex: 1 }}>
          {[...Array(50)].map((_, i) => {
            const size = i%5===0 ? 2.5 : i%3===0 ? 1.5 : 1
            const op = 0.15+(i%6)*0.08
            const dx = ((i*7)%60)-30
            const dur = 8+(i%5)*3
            const blur = i%4===0
            return (
              <div key={`p${i}`} style={{ position: 'absolute', width: size, height: size, borderRadius: '50%', background: i%7===0 ? '#E8A020' : '#ffffff', opacity: op, left: `${(i*13+7)%96}%`, top: `${(i*19+5)%90}%`, filter: blur ? 'blur(1px)' : 'none', ['--op' as any]: op, ['--dx' as any]: `${dx}px`, animation: `cn-float ${dur}s ease-in-out infinite alternate`, animationDelay: `${(i*0.3)%4}s` }} />
            )
          })}
          {[...Array(14)].map((_,i) => (
            <div key={`t${i}`} style={{ position: 'absolute', width: '1px', height: `${10+(i%4)*8}px`, left: `${(i*17+3)%95}%`, top: `${60+(i%4)*8}%`, background: `linear-gradient(to top, transparent, rgba(255,255,255,${0.1+(i%3)*0.08}), transparent)`, animation: `cn-trail ${4+(i%4)*1.5}s ease-in infinite`, animationDelay: `${(i*0.6)%5}s` }} />
          ))}
        </div>

        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '100px', background: 'linear-gradient(transparent, #0F0F1A)', pointerEvents: 'none', zIndex: 5 }} />
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '160px', background: 'linear-gradient(to right, #0F0F1A, transparent)', pointerEvents: 'none', zIndex: 5 }} />

        <div style={{ position: 'relative', zIndex: 10, maxWidth: '80rem', margin: '0 auto', padding: '0 24px' }}>
          <div id="hero-eyebrow" style={{ fontSize: '9px', letterSpacing: '0.35em', textTransform: 'uppercase', color: '#E8A020', marginBottom: '10px', opacity: 0, fontFamily: 'var(--font-sans)' }}>Events</div>
          <h1 style={{ fontFamily: 'var(--font-spectral)', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 300, color: '#fff', lineHeight: 1.15, margin: 0, minHeight: '4rem' }}>
            <span id="hero-typed"></span>
            <span id="hero-cursor" style={{ display: 'inline-block', width: '2px', height: '0.85em', background: '#E8A020', verticalAlign: 'middle', marginLeft: '3px', animation: 'cn-blink 0.7s step-end infinite' }} />
          </h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8" style={{ backgroundColor: '#0A0A12' }}>

      {/* ── Category tabs ─────────────────────────────────── */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", marginBottom: "24px", display: "flex" }}>
        {(['music', 'culture', 'sports', 'other'] as const).map((key) => {
          const catLabels = { music: t('event_cat_music'), culture: t('event_cat_culture'), sports: t('event_cat_sports'), other: t('event_cat_other') };
          const isActive = activeCategory === key;
          return (
            <button
              key={key}
              onClick={() => setActiveCategory(key)}
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = '#EDEDF2'; }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = '#5A5A6A'; }}
              style={{
                padding: "12px 20px",
                fontSize: "13px",
                letterSpacing: "0.08em",
                background: "none",
                border: "none",
                borderBottom: isActive ? `2px solid ${key === 'music' ? '#E8A020' : '#ffffff'}` : "2px solid transparent",
                color: isActive ? (key === 'music' ? '#E8A020' : '#ffffff') : "#5A5A6A",
                cursor: "pointer",
                transition: "color 0.15s",
                fontFamily: "var(--font-sans), Inter, sans-serif",
                marginBottom: "-1px",
              }}
            >
              {catLabels[key]}
            </button>
          );
        })}
      </div>

      {activeCategory === 'music' ? (
      <>
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
            className="outline-none cursor-pointer focus-gold"
            style={{ borderRadius: 6, padding: "0.4rem 0.75rem", fontSize: "0.8rem", backgroundColor: "#1A1A28", color: city !== "All Cities" ? "white" : "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            {CITIES.map((c) => <option key={c} value={c}>{CITY_LABELS[c] ?? c}</option>)}
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
              className="flex-shrink-0"
              style={{
                borderRadius: 6,
                padding: "7px 14px",
                fontSize: 12.5,
                fontWeight: 600,
                whiteSpace: "nowrap",
                transition: "all .2s",
                backgroundColor: genre === g ? "rgba(232,160,32,0.12)" : "#1A1A28",
                color: genre === g ? "#F5B335" : "#A1A1AA",
                border: `1px solid ${genre === g ? "rgba(232,160,32,0.15)" : "rgba(255,255,255,0.06)"}`,
              }}
            >
              {g === "All" ? t("events_filter_all") : GENRE_LABELS[g] ?? g}
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
                        {t("events_quiet_tonight")}
                      </p>
                      <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.2)" }}>
                        {t("events_check_weekend")}
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
                          {t("events_slow_night")}
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
                    {labels.near} · {CITY_LABELS[nearbyCity] ?? nearbyCity}
                  </p>
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.45)", fontFamily: "var(--font-sans)" }}>
                    {nearYouCount > 0
                      ? `${nearYouCount} ${t("events_near_count")}`
                      : t("events_none_now")}
                  </p>
                </div>
              </div>
              {nearYouCount > 0 && (
                <a
                  href={`/events?city=${encodeURIComponent(nearbyCity)}`}
                  className="text-xs font-medium whitespace-nowrap transition-colors hover:bg-amber-500/10 px-3 py-1.5 rounded-md flex-shrink-0"
                  style={{ color: "var(--gold)", border: "1px solid rgba(232,160,32,0.4)", fontFamily: "var(--font-sans)" }}
                >
                  {t("events_explore")} →
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
              {t("events_view_all_arrow")}
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
          zIndex: 200,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 22px",
          borderRadius: 999,
          background: "linear-gradient(135deg, #E8A020, #F5B335)",
          color: "#0A0A12",
          fontWeight: 700,
          fontSize: 13,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          border: "none",
          cursor: "pointer",
          boxShadow: "0 4px 24px rgba(232,160,32,0.35)",
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ fontSize: 14 }}>✦</span> {t("events_find")}
      </button>

      {showFilterModal && (
        <EventsFilterModal onClose={() => setShowFilterModal(false)} onApply={handleApplyFilters} />
      )}
      </>
      ) : (
        categoryEvents.length === 0 ? (
          <div style={{ padding: "96px 0", textAlign: "center" }}>
            <p
              style={{
                fontFamily: "var(--font-spectral), Georgia, serif",
                fontStyle: "italic",
                fontSize: "26px",
                fontWeight: 300,
                color: "#5A5A6A",
                marginBottom: "10px",
              }}
            >
              Σύντομα
            </p>
            <p style={{ fontSize: "13px", color: "#3A3A4A" }}>
              Ετοιμάζουμε events για αυτή την κατηγορία.
            </p>
          </div>
        ) : (
          <div style={{ padding: "24px 0" }}>
            <p
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                color: "#E8A020",
                letterSpacing: "0.15em",
                marginBottom: 20,
              }}
            >
              {categoryEvents.length} events
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {categoryEvents.map((e, i) => (
                <div
                  key={e.id}
                  className="animate-fade-up hover:scale-[1.02] hover:-translate-y-0.5 transition-all duration-300"
                  style={{ animationDelay: `${0.1 + i * 0.05}s` }}
                >
                  <EventCard {...e} badge={e.isRadarPick ? "Nightup Radar" : undefined} />
                </div>
              ))}
            </div>
          </div>
        )
      )}
    </div>
    </>
  );
}
