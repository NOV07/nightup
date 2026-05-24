"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";
import { CITIES, GENRES, NETWORK } from "../app/lib/searchData";

export type SearchTab = "search" | "events" | "network";

interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  type: "event" | "magazine" | "nightwaves" | "profile";
  href: string;
}

interface SearchBarProps {
  open: boolean;
  activeTab: SearchTab;
  onClose: () => void;
  onTabChange: (tab: SearchTab) => void;
}

const AMBER = "#F59E0B";
const BG = "#09090f";
const BORDER = "rgba(255,255,255,0.07)";

const TYPE_LABEL: Record<SearchResult["type"], string> = {
  event: "Event",
  magazine: "Article",
  nightwaves: "Mix",
  profile: "Profile",
};

function getBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

function SelectField({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        background: "rgba(255,255,255,0.05)",
        border: `1px solid ${BORDER}`,
        borderRadius: "8px",
        color: "rgba(255,255,255,0.7)",
        fontFamily: "var(--font-sans)",
        fontSize: "12px",
        padding: "8px 10px",
        outline: "none",
        cursor: "pointer",
        minWidth: "130px",
        flex: 1,
      }}
    >
      {options.map((o) => (
        <option key={o} value={o} style={{ background: "#111" }}>
          {o}
        </option>
      ))}
    </select>
  );
}

const activeChipStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "3px 10px",
  borderRadius: 999,
  fontSize: 11,
  fontFamily: "var(--font-sans)",
  color: "#E8A020",
  background: "rgba(232,160,32,0.1)",
  border: "1px solid rgba(232,160,32,0.3)",
  cursor: "pointer",
  userSelect: "none",
};

export default function SearchBar({ open, activeTab, onClose, onTabChange }: SearchBarProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  // Events filters
  const [evCity, setEvCity] = useState(CITIES[0]);
  const [evGenre, setEvGenre] = useState(GENRES[0]);
  const [evDate, setEvDate] = useState("");

  // Network filters
  const [netCity, setNetCity] = useState(CITIES[0]);
  const [netSection, setNetSection] = useState<keyof typeof NETWORK>("Plan Your Event");
  const [netCategory, setNetCategory] = useState("");
  const [netSubcategory, setNetSubcategory] = useState("");

  // Focus input when search tab opens
  useEffect(() => {
    if (open && activeTab === "search") {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open, activeTab]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Clear results when switching away from search tab
  useEffect(() => {
    if (activeTab !== "search") {
      setQuery("");
      setResults([]);
    }
  }, [activeTab]);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const sb = getBrowserClient();
    const pattern = `%${q}%`;
    const [evRes, artRes, mixRes, profRes] = await Promise.all([
      sb.from("events").select("id, title, venue, city").ilike("title", pattern).eq("status", "approved").limit(3),
      sb.from("articles").select("id, title, category").ilike("title", pattern).eq("status", "published").limit(3),
      sb.from("mixes").select("id, title, artist").ilike("title", pattern).eq("status", "approved").limit(2),
      sb.from("profiles").select("id, username, display_name, network_subcategory, location").not("network_tab", "is", null).or(`display_name.ilike.%${q}%,network_subcategory.ilike.%${q}%`).limit(4),
    ]);
    const found: SearchResult[] = [];
    evRes.data?.forEach((e: any) =>
      found.push({ id: `ev-${e.id}`, title: e.title, subtitle: [e.venue, e.city].filter(Boolean).join(" · "), type: "event", href: `/events/${e.id}` })
    );
    artRes.data?.forEach((a: any) =>
      found.push({ id: `art-${a.id}`, title: a.title, subtitle: a.category, type: "magazine", href: `/magazine/${a.id}` })
    );
    mixRes.data?.forEach((m: any) =>
      found.push({ id: `mix-${m.id}`, title: m.title, subtitle: m.artist, type: "nightwaves", href: `/nightwaves/mix/${m.id}` })
    );
    profRes.data?.forEach((p: any) =>
      found.push({ id: `prof-${p.id}`, title: p.display_name, subtitle: [p.network_subcategory, p.location].filter(Boolean).join(" · "), type: "profile", href: `/profile/${p.username}` })
    );
    setResults(found);
    setLoading(false);
  }, []);

  useEffect(() => {
    clearTimeout(timerRef.current);
    if (activeTab === "search") {
      timerRef.current = setTimeout(() => doSearch(query), 300);
    }
    return () => clearTimeout(timerRef.current);
  }, [query, activeTab, doSearch]);

  const handleEventsSearch = () => {
    const params = new URLSearchParams();
    if (evCity !== CITIES[0]) params.set("city", evCity);
    if (evGenre !== GENRES[0]) params.set("genre", evGenre);
    if (evDate) params.set("date", evDate);
    router.push(`/events${params.size ? `?${params}` : ""}`);
    onClose();
  };

  const handleNetworkSearch = () => {
    const params = new URLSearchParams();
    params.set("tab", netSection === "Plan Your Event" ? "plan-your-event" : "for-artists");
    if (netCategory) params.set("category", netCategory);
    if (netSubcategory) params.set("subcategory", netSubcategory);
    if (netCity !== CITIES[0]) params.set("city", netCity);
    router.push(`/network?${params}`);
    onClose();
  };

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 45,
          backgroundColor: "rgba(0,0,0,0.65)",
          backdropFilter: "blur(4px)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.25s ease",
        }}
      />

      {/* Panel — desktop: slides from top; mobile: slides from bottom */}
      <div
        style={{
          position: "fixed",
          zIndex: 50,
          left: 0,
          right: 0,
          backgroundColor: BG,
          borderBottom: `1px solid ${BORDER}`,
          boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
          transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.25s ease",
        }}
        className={[
          // Desktop: slides from top (below navbar)
          "md:top-[60px] md:bottom-auto",
          // Mobile: bottom sheet
          "top-auto bottom-0 max-h-[80vh] overflow-y-auto rounded-t-2xl",
          "md:rounded-none md:max-h-none md:overflow-visible",
          // Animation
          open
            ? "md:[transform:translateY(0)] [transform:translateY(0)] opacity-100 pointer-events-auto"
            : "md:[transform:translateY(-12px)] [transform:translateY(100%)] opacity-0 pointer-events-none",
        ].join(" ")}
      >
        <div className="max-w-3xl mx-auto px-4 py-5">
          {/* Tab bar */}
          <div className="flex items-center gap-1 mb-5">
            {(["search", "events", "network"] as SearchTab[]).map((tab) => {
              const labels = { search: "Search", events: "Events", network: "Network" };
              const active = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => onTabChange(tab)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: 600,
                    fontFamily: "var(--font-sans)",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    border: "none",
                    cursor: "pointer",
                    transition: "all 0.18s",
                    backgroundColor: active ? AMBER : "rgba(255,255,255,0.05)",
                    color: active ? "#09090f" : "rgba(255,255,255,0.45)",
                  }}
                >
                  {labels[tab]}
                </button>
              );
            })}
            <div style={{ flex: 1 }} />
            <button
              onClick={onClose}
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.07)",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "rgba(255,255,255,0.5)",
              }}
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <line x1="1" y1="1" x2="12" y2="12" />
                <line x1="12" y1="1" x2="1" y2="12" />
              </svg>
            </button>
          </div>

          {/* — Search tab — */}
          {activeTab === "search" && (
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  background: "rgba(255,255,255,0.05)",
                  border: `1px solid ${BORDER}`,
                  borderRadius: "10px",
                  padding: "0 14px",
                  height: "48px",
                }}
              >
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.6" strokeLinecap="round">
                  <circle cx="6.5" cy="6.5" r="5" />
                  <line x1="10.5" y1="10.5" x2="14" y2="14" />
                </svg>
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search events, articles, mixes..."
                  style={{
                    flex: 1,
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    fontFamily: "var(--font-sans)",
                    fontSize: "14px",
                    color: "rgba(255,255,255,0.8)",
                  }}
                />
                {loading && (
                  <div
                    style={{
                      width: 14,
                      height: 14,
                      border: `2px solid rgba(255,255,255,0.1)`,
                      borderTopColor: AMBER,
                      borderRadius: "50%",
                    }}
                    className="animate-spin"
                  />
                )}
                {query && !loading && (
                  <button
                    onClick={() => { setQuery(""); setResults([]); inputRef.current?.focus(); }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)", padding: 0, lineHeight: 1 }}
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                      <line x1="1" y1="1" x2="11" y2="11" />
                      <line x1="11" y1="1" x2="1" y2="11" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Results */}
              {results.length > 0 && (
                <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "2px" }}>
                  {results.map((r) => (
                    <Link
                      key={r.id}
                      href={r.href}
                      onClick={onClose}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "10px 12px",
                        borderRadius: "8px",
                        textDecoration: "none",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <span
                        style={{
                          fontSize: "9px",
                          fontWeight: 700,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          color: AMBER,
                          border: `1px solid ${AMBER}40`,
                          borderRadius: "4px",
                          padding: "2px 5px",
                          flexShrink: 0,
                          fontFamily: "var(--font-sans)",
                          minWidth: "48px",
                          textAlign: "center",
                        }}
                      >
                        {TYPE_LABEL[r.type]}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: "13px", fontWeight: 500, color: "rgba(255,255,255,0.85)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {r.title}
                        </p>
                        {r.subtitle && (
                          <p style={{ margin: 0, fontSize: "11px", color: "rgba(255,255,255,0.4)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {r.subtitle}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {query && !loading && results.length === 0 && (
                <p style={{ margin: "20px 0 0", textAlign: "center", fontSize: "13px", color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-sans)" }}>
                  No results for &ldquo;{query}&rdquo;
                </p>
              )}

              {!query && (
                <p style={{ margin: "16px 0 0", fontSize: "11px", color: "rgba(255,255,255,0.2)", fontFamily: "var(--font-sans)", textAlign: "center" }}>
                  Search across Events · Magazine · Nightwaves
                </p>
              )}
            </div>
          )}

          {/* — Events tab — */}
          {activeTab === "events" && (
            <div>
              <div className="flex flex-wrap gap-2 items-end">
                <SelectField value={evCity} onChange={setEvCity} options={CITIES} />
                <SelectField value={evGenre} onChange={setEvGenre} options={GENRES} />
                <input
                  type="date"
                  value={evDate}
                  onChange={(e) => setEvDate(e.target.value)}
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: `1px solid ${BORDER}`,
                    borderRadius: "8px",
                    color: evDate ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.3)",
                    fontFamily: "var(--font-sans)",
                    fontSize: "12px",
                    padding: "8px 10px",
                    outline: "none",
                    cursor: "pointer",
                    colorScheme: "dark",
                    flex: 1,
                    minWidth: "130px",
                  }}
                />
              </div>
              {(evCity !== CITIES[0] || evGenre !== GENRES[0] || evDate) && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10, marginBottom: 4, alignItems: "center" }}>
                  {evCity !== CITIES[0] && (
                    <span style={activeChipStyle} onClick={() => setEvCity(CITIES[0])}>
                      📍 {evCity} ✕
                    </span>
                  )}
                  {evGenre !== GENRES[0] && (
                    <span style={activeChipStyle} onClick={() => setEvGenre(GENRES[0])}>
                      🎵 {evGenre} ✕
                    </span>
                  )}
                  {evDate && (
                    <span style={activeChipStyle} onClick={() => setEvDate("")}>
                      📅 {evDate} ✕
                    </span>
                  )}
                  <span
                    onClick={() => { setEvCity(CITIES[0]); setEvGenre(GENRES[0]); setEvDate(""); }}
                    style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", cursor: "pointer", marginLeft: 4, fontFamily: "var(--font-sans)" }}
                  >
                    Clear all
                  </span>
                </div>
              )}
              <div style={{ marginTop: 10 }}>
                <button
                  onClick={handleEventsSearch}
                  style={{
                    padding: "9px 22px",
                    borderRadius: "8px",
                    background: AMBER,
                    color: "#09090f",
                    fontFamily: "var(--font-sans)",
                    fontSize: "12px",
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Search Events
                </button>
              </div>
            </div>
          )}

          {/* — Network tab — */}
          {activeTab === "network" && (
            <div>
              {/* Section sub-tabs */}
              <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                {(Object.keys(NETWORK) as Array<keyof typeof NETWORK>).map((section) => (
                  <button
                    key={section}
                    onClick={() => { setNetSection(section); setNetCategory(""); setNetSubcategory(""); }}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: 600,
                      fontFamily: "var(--font-sans)",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      border: "none",
                      cursor: "pointer",
                      transition: "all 0.18s",
                      backgroundColor: netSection === section ? AMBER : "rgba(255,255,255,0.05)",
                      color: netSection === section ? "#09090f" : "rgba(255,255,255,0.45)",
                    }}
                  >
                    {section}
                  </button>
                ))}
              </div>

              {/* Category pills */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
                {Object.keys(NETWORK[netSection]).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => { setNetCategory(netCategory === cat ? "" : cat); setNetSubcategory(""); }}
                    style={{
                      padding: "5px 12px",
                      borderRadius: "20px",
                      fontSize: "12px",
                      fontFamily: "var(--font-sans)",
                      border: `1px solid ${netCategory === cat ? AMBER : BORDER}`,
                      cursor: "pointer",
                      transition: "all 0.15s",
                      backgroundColor: netCategory === cat ? `${AMBER}1a` : "rgba(255,255,255,0.04)",
                      color: netCategory === cat ? AMBER : "rgba(255,255,255,0.55)",
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Subcategory chips */}
              {netCategory && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "16px" }}>
                  {((NETWORK[netSection] as Record<string, string[]>)[netCategory] ?? []).map((sub) => (
                    <button
                      key={sub}
                      onClick={() => setNetSubcategory(netSubcategory === sub ? "" : sub)}
                      style={{
                        padding: "4px 10px",
                        borderRadius: "4px",
                        fontSize: "11px",
                        fontFamily: "var(--font-sans)",
                        border: `1px solid ${netSubcategory === sub ? AMBER : "rgba(255,255,255,0.1)"}`,
                        cursor: "pointer",
                        transition: "all 0.15s",
                        backgroundColor: netSubcategory === sub ? `${AMBER}22` : "transparent",
                        color: netSubcategory === sub ? AMBER : "rgba(255,255,255,0.4)",
                      }}
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              )}

              {/* City + CTA */}
              <div className="flex flex-wrap gap-2 items-end">
                <SelectField value={netCity} onChange={setNetCity} options={CITIES} />
              </div>
              {(netCity !== CITIES[0] || netCategory || netSubcategory) && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10, marginBottom: 4, alignItems: "center" }}>
                  {netCity !== CITIES[0] && (
                    <span style={activeChipStyle} onClick={() => setNetCity(CITIES[0])}>
                      📍 {netCity} ✕
                    </span>
                  )}
                  {netCategory && (
                    <span style={activeChipStyle} onClick={() => { setNetCategory(""); setNetSubcategory(""); }}>
                      {netCategory} ✕
                    </span>
                  )}
                  {netSubcategory && (
                    <span style={activeChipStyle} onClick={() => setNetSubcategory("")}>
                      {netSubcategory} ✕
                    </span>
                  )}
                  <span
                    onClick={() => { setNetCity(CITIES[0]); setNetSection("Plan Your Event"); setNetCategory(""); setNetSubcategory(""); }}
                    style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", cursor: "pointer", marginLeft: 4, fontFamily: "var(--font-sans)" }}
                  >
                    Clear all
                  </span>
                </div>
              )}
              <div style={{ marginTop: 10 }}>
                <button
                  onClick={handleNetworkSearch}
                  style={{
                    padding: "9px 22px",
                    borderRadius: "8px",
                    background: AMBER,
                    color: "#09090f",
                    fontFamily: "var(--font-sans)",
                    fontSize: "12px",
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Browse Network
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
