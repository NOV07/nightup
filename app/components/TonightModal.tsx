"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import SpotCard from "./SpotCard";
import { MOODS, loc, type Spot } from "../spots/types";
import { moodSequence, pickSequence } from "../spots/night";
import {
  SPOT_CATEGORIES, spotCategoryDef, spotCategoryLabel, spotInCategory, spotSubsInCategory, subsOf, type SpotCategory,
} from "../lib/spotCategories";
import { SpotCategoryIcon } from "../lib/spotIcons";
import { getEventMood } from "../lib/eventMood";
import { getEventCoverImage, getEventCrop } from "../lib/getEventCoverImage";
import CroppedImage from "../../components/ui/CroppedImage";
import { useLanguage } from "./LanguageContext";
import { useUserLocation } from "../lib/useUserLocation";

const SEEN_KEY = "nightup_tonight_seen";
const SEEN_HOURS = 12;

export interface EventLite {
  id: string;
  title: string;
  image_url: string | null;
  has_copyright_restriction: boolean;
  crop_x: number | null;
  crop_y: number | null;
  crop_width: number | null;
  crop_height: number | null;
  date: string;
  time: string | null;
  venue: string;
  city: string;
  type: string | null;
  genres: string[] | null;
  price: string | null;
}

// client-side night builder (fallback when /api/spots/build-night fails)
function buildNight(all: Spot[], mood: string): Spot[] {
  return pickSequence(all, moodSequence(mood), true);
}

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Tile/button with a light CSS-only 3D tilt (pointer events, so touch works too),
// a gold glare that follows the pointer and a ripple on click. Tilt is written via
// CSS vars straight to the DOM in rAF (no setState per move). The ripple lives in its own
// overflow:hidden wrapper so the tile itself keeps preserve-3d.
function TiltTile({ className = "", style, index = 0, max = 8, dim, pop, onPress, onActivate, children }: {
  className?: string; style?: React.CSSProperties; index?: number; max?: number;
  dim?: boolean; pop?: boolean; onPress?: () => void; onActivate: () => void; children: React.ReactNode;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const fx = useRef<HTMLSpanElement>(null);
  const raf = useRef<number | null>(null);
  const pt = useRef({ x: 0, y: 0 });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (raf.current != null) cancelAnimationFrame(raf.current);
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const reset = () => {
    const el = ref.current;
    if (!el) return;
    if (raf.current != null) { cancelAnimationFrame(raf.current); raf.current = null; }
    el.removeAttribute("data-track");
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
    el.style.setProperty("--go", "0");
  };
  const apply = () => {
    raf.current = null;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const px = Math.min(1, Math.max(0, (pt.current.x - r.left) / r.width));
    const py = Math.min(1, Math.max(0, (pt.current.y - r.top) / r.height));
    el.style.setProperty("--ry", `${((px - 0.5) * 2 * max).toFixed(2)}deg`);
    el.style.setProperty("--rx", `${(-(py - 0.5) * 2 * max).toFixed(2)}deg`);
    el.style.setProperty("--mx", `${(px * 100).toFixed(1)}%`);
    el.style.setProperty("--my", `${(py * 100).toFixed(1)}%`);
    el.style.setProperty("--go", "1");
  };
  const track = (e: React.PointerEvent) => {
    if (reducedMotion()) return;
    ref.current?.setAttribute("data-track", "");
    pt.current = { x: e.clientX, y: e.clientY };
    if (raf.current == null) raf.current = requestAnimationFrame(apply);
  };
  const end = (e: React.PointerEvent) => { if (e.type !== "pointerup" || e.pointerType !== "mouse") reset(); };

  const click = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (timer.current) return;
    if (reducedMotion()) { onActivate(); return; }
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.detail === 0 ? r.width / 2 : e.clientX - r.left;
    const y = e.detail === 0 ? r.height / 2 : e.clientY - r.top;
    const dot = document.createElement("span");
    dot.className = "tn-ripple";
    dot.style.left = `${x - 10}px`;
    dot.style.top = `${y - 10}px`;
    dot.addEventListener("animationend", () => dot.remove());
    fx.current?.appendChild(dot);
    onPress?.();
    timer.current = setTimeout(() => { timer.current = null; onActivate(); }, 250);
  };

  return (
    <button ref={ref} className={`tn ${className}${dim ? " tn-dim" : ""}${pop ? " tn-pop" : ""}`}
      style={{ ...style, "--i": index } as React.CSSProperties}
      onPointerEnter={track} onPointerMove={track} onPointerLeave={end} onPointerCancel={end} onPointerUp={end}
      onClick={click}>
      <span ref={fx} className="tn-fx" aria-hidden="true" />
      {children}
    </button>
  );
}

const STOP_TIMES = ["20:30", "22:00", "00:00"];
export default function TonightModal({ spots, open, onClose, events }: { spots: Spot[]; open: boolean; onClose: () => void; events: EventLite[] }) {
  const { t, lang } = useLanguage();
  const WALKS = [t("tonight_walk_2"), t("tonight_walk_4")];
  // The stop's own category (the one it was picked for), shown uppercase via CSS.
  const stopCategoryLabel = (s: Spot) => spotCategoryLabel(s.nightSlot ?? s.category, lang);
  const LOAD_STEPS = [t("tonight_load_1"), t("tonight_load_2"), t("tonight_load_3"), t("tonight_load_4")];
  const [view, setView] = useState<"tiles" | "subcats" | "results" | "night">("tiles");
  const [activeCat, setActiveCat] = useState<SpotCategory>("drink");
  const [activeSub, setActiveSub] = useState<string | null>(null);
  const [moodOpen, setMoodOpen] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadStep, setLoadStep] = useState(0);
  const [night, setNight] = useState<Spot[]>([]);
  const [matchedEvent, setMatchedEvent] = useState<EventLite | null>(null);
  const [copied, setCopied] = useState(false);
  const [pendingMood, setPendingMood] = useState<string | null>(null);
  const { lat, lng, status, requestLocation } = useUserLocation();

  // Sync body class and reset view whenever open prop changes
  useEffect(() => {
    if (open) {
      setView("tiles");
      document.body.classList.add("tonight-open");
    } else {
      document.body.classList.remove("tonight-open");
    }
  }, [open]);

  const handleClose = useCallback(() => {
    onClose();
    setMoodOpen(false);
  }, [onClose]);

  // Escape to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, handleClose]);

  const goCategory = (c: SpotCategory) => { setActiveCat(c); setActiveSub(null); setView("subcats"); };
  const goResults = (sub: string | null) => { setActiveSub(sub); setView("results"); };

  const fetchNight = (mood: string): Promise<Spot[]> =>
    fetch("/api/spots/build-night", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mood, lat: lat ?? undefined, lng: lng ?? undefined }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("build-night request failed");
        const data = await res.json();
        if (!Array.isArray(data.spots) || data.spots.length === 0) throw new Error("empty night");
        return data.spots as Spot[];
      })
      .catch(() => buildNight(spots, mood));

  const runMoodBuild = (mood: string) => {
    setLoading(true);
    setLoadStep(0);
    let i = 0;
    const iv = setInterval(() => { i++; if (i < LOAD_STEPS.length) setLoadStep(i); }, 520);
    const minDelay = new Promise<void>((resolve) => setTimeout(resolve, 2150));
    Promise.all([fetchNight(mood), minDelay]).then(([nightSpots]) => {
      clearInterval(iv);
      setNight(nightSpots);
      const matchingEvents = events.filter((e) => getEventMood(e) === mood);
      setMatchedEvent(matchingEvents.length > 0 ? matchingEvents[Math.floor(Math.random() * matchingEvents.length)] : null);
      setLoading(false);
      setView("night");
    });
  };

  const pickMood = (mood: string) => {
    setMoodOpen(false);
    if (status === "idle") {
      setPendingMood(mood);
      requestLocation();
      return;
    }
    runMoodBuild(mood);
  };

  // Resume the mood build once a pending location request has resolved
  // (granted/denied/unsupported) — fires the deferred runMoodBuild call.
  useEffect(() => {
    if (pendingMood && status !== "idle" && status !== "loading") {
      const mood = pendingMood;
      setPendingMood(null);
      runMoodBuild(mood);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, pendingMood]);

  const keepNight = async () => {
    const lines = night.map((s, i) =>
      `${STOP_TIMES[i] ?? ""} · ${stopCategoryLabel(s).toUpperCase()}\n${s.name}${s.address ? `, ${s.address}` : ""}${s.neighborhood ? `, ${s.neighborhood}` : ""}`
    );
    const text = `${t("tonight_share_text")}\n\n${lines.join("\n\n")}\n\nvia nightup.gr`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const reroll = () => {
    setLoading(true);
    setLoadStep(LOAD_STEPS.length - 1);
    const minDelay = new Promise<void>((resolve) => setTimeout(resolve, 1100));
    Promise.all([fetchNight("chill"), minDelay]).then(([nightSpots]) => {
      setNight(nightSpots);
      setLoading(false);
    });
  };

  const catSpots = spots.filter((s) =>
    spotInCategory(s, activeCat) && (!activeSub || spotSubsInCategory(s, activeCat).includes(activeSub))
  );
  const now = new Date();
  const days = t("tonight_days").split(",");
  const kicker = `${days[now.getDay()]}  ${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}  ${t("filter_athens")}`;
  const activeCatDef = spotCategoryDef(activeCat);

  if (!open) return null;

  return (
    <>
      <div style={S.scrim} onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
        <div style={S.modal}>
          {/* atmosphere */}
          <div className="tn-blob1" style={S.blob1} /><div className="tn-blob2" style={S.blob2} />

          {/* top */}
          <div style={S.mtop}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
              <span style={{ fontWeight: 100, letterSpacing: "0.2em", fontSize: 19, textTransform: "uppercase", color: "#fff" }}>Night</span>
              <span style={{ fontWeight: 100, letterSpacing: "0.2em", fontSize: 19, textTransform: "uppercase", color: "#E8A020" }}>up</span>
            </div>
            <button onClick={handleClose} style={S.close} aria-label="Close">✕</button>
          </div>

          <div style={S.scroll} className="tonight-modal-scroll">
            {/* ── TILES ── */}
            {view === "tiles" && (
              <div>
                <div style={S.kicker}>{kicker}</div>
                <h2 style={S.h2}>{t("tonight_what_doing")} <em style={S.em}>{t("spots_hero_em")}</em></h2>
                <p style={S.sub}>{t("tonight_sub")}</p>
                <div style={S.grid}>
                  {SPOT_CATEGORIES.map((c, i) => (
                    <TiltTile key={c.key} className="tn-tile" style={S.tile} index={i}
                      dim={picked !== null && picked !== c.key} pop={picked === c.key}
                      onPress={() => setPicked(c.key)}
                      onActivate={() => { setPicked(null); goCategory(c.key); }}>
                      <div className="tn-icon" style={{ animationDelay: `${-i * 0.6}s` }}><SpotCategoryIcon category={c.key} size={22} /></div>
                      <div>
                        <div className="tn-label" style={S.tileLabel}>{loc(lang, c.label_el, c.label_en)}</div>
                        <div className="tn-sub" style={S.tileSub}>{loc(lang, c.hint_el, c.hint_en)}</div>
                      </div>
                    </TiltTile>
                  ))}
                </div>
                <TiltTile className="tn-surprise" style={S.surprise} max={3}
                  dim={picked !== null && picked !== "__surprise"} pop={picked === "__surprise"}
                  onPress={() => setPicked("__surprise")}
                  onActivate={() => { setPicked(null); setMoodOpen(true); }}>
                  <span className="tn-twinkle" style={{ fontSize: 20 }}>✨</span>
                  <span>{t("tonight_surprise")}<br/><span style={{ fontWeight: 400, fontSize: 10.5, opacity: 0.7 }}>{t("tonight_surprise_sub")}</span></span>
                </TiltTile>
                <div style={{ textAlign: "center", marginTop: 16 }}>
                  <button onClick={handleClose} style={S.skip}>{t("tonight_skip")}</button>
                </div>
              </div>
            )}

            {/* ── SUBCATS ── */}
            {view === "subcats" && (
              <div>
                <button onClick={() => setView("tiles")} style={S.back}>{t("tonight_back")}</button>
                <div style={S.resHead}>
                  {activeCatDef ? loc(lang, activeCatDef.label_el, activeCatDef.label_en) : null} <em style={S.em}>· {t("tonight_vibe_q")}</em>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 9, marginTop: 18 }}>
                  <button onClick={() => goResults(null)} style={S.subChip}>{t("tonight_all_sub")}</button>
                  {subsOf(activeCat).map((sub) => {
                    const count = spots.filter((s) => spotInCategory(s, activeCat) && spotSubsInCategory(s, activeCat).includes(sub.key)).length;
                    const disabled = count === 0;
                    return (
                      <button
                        key={sub.key}
                        onClick={() => !disabled && goResults(sub.key)}
                        disabled={disabled}
                        style={{
                          ...S.subChip,
                          opacity: disabled ? 0.4 : 1,
                          cursor: disabled ? "default" : "pointer",
                        }}
                      >
                        {loc(lang, sub.label_el, sub.label_en)}{disabled ? ` · ${t("tonight_coming_soon")}` : ` · ${count}`}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── RESULTS ── */}
            {view === "results" && (
              <div>
                <button onClick={() => setView("subcats")} style={S.back}>{t("tonight_back")}</button>
                <div style={S.resHead}>
                  {(() => {
                    if (activeSub) {
                      const s = subsOf(activeCat).find((x) => x.key === activeSub);
                      return s ? loc(lang, s.label_el, s.label_en) : activeSub;
                    }
                    return activeCatDef ? loc(lang, activeCatDef.label_el, activeCatDef.label_en) : null;
                  })()}
                  {" "}<em style={S.em}>· {t("tonight_near")}</em>
                </div>
                <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
                  {catSpots.map((s) => <SpotCard key={s.id} spot={s} compact onNavigate={handleClose} />)}
                </div>
              </div>
            )}

            {/* ── NIGHT ── */}
            {view === "night" && (
              <div>
                <button onClick={() => setView("tiles")} style={S.back}>{t("tonight_new_search")}</button>
                <div style={S.nightKicker}>{t("tonight_kicker")}</div>
                <div style={S.nightTitle}>{t("tonight_title")} <em style={S.em}>{t("tonight_title_em")}</em></div>
                <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 6 }}>
                  {night.map((s, i) => (
                    <div key={s.id}>
                      <div style={{ fontSize: 11.5, color: "#E8A020", fontWeight: 700, letterSpacing: "0.7px", marginBottom: 6 }}>
                        {STOP_TIMES[i]} · <span style={{ textTransform: "uppercase" }}>{stopCategoryLabel(s)}</span>
                      </div>
                      <SpotCard spot={s} compact onNavigate={handleClose} />
                      {i < night.length - 1 && (
                        <div style={{ fontSize: 11, color: "#E8A020", opacity: 0.82, margin: "8px 0 8px 6px" }}>
                          · {WALKS[i] ?? t("tonight_walk_min")}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {matchedEvent && (
                  <Link href={`/events/${matchedEvent.id}`} onClick={handleClose} style={S.eventCard}>
                    <div style={S.eventKicker}>🎉 {t("tonight_try_event")}</div>
                    <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 10 }}>
                      <div style={{ position: "relative", ...S.eventImg }}>
                        <CroppedImage src={getEventCoverImage(matchedEvent)} alt={matchedEvent.title} crop={getEventCrop(matchedEvent)} sizes="52px" style={{ borderRadius: S.eventImg.borderRadius }} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={S.eventTitle}>{matchedEvent.title}</div>
                        <div style={S.eventMeta}>{matchedEvent.date}{matchedEvent.time ? ` · ${matchedEvent.time}` : ""}</div>
                        <div style={S.eventMeta}>{matchedEvent.venue}</div>
                      </div>
                    </div>
                  </Link>
                )}
                <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
                  <button onClick={reroll} style={S.btnGhost}>{t("tonight_reroll")}</button>
                  <button onClick={keepNight} style={S.btnGold}>{copied ? t("tonight_copied") : t("tonight_keep")}</button>
                </div>
              </div>
            )}
          </div>

          {/* mood sheet */}
          {moodOpen && (
            <div style={S.overlay} onClick={(e)=>{if(e.target===e.currentTarget)setMoodOpen(false);}}>
              <div style={S.sheet}>
                <div style={S.grab} />
                <h3 style={S.sheetH3}>{t("tonight_sheet_h")}</h3>
                <p style={S.sheetP}>{t("tonight_sheet_p")}</p>
                <div style={S.moods}>
                  {MOODS.map((m) => (
                    <button key={m.key} onClick={() => pickMood(m.key)} style={S.mood}
                      onMouseEnter={(e)=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.borderColor="rgba(232,160,32,0.15)";}}
                      onMouseLeave={(e)=>{e.currentTarget.style.transform="none";e.currentTarget.style.borderColor="rgba(255,255,255,0.055)";}}>
                      <div style={{ fontSize: 25 }}>{m.emoji}</div>
                      <div style={S.moodLabel}>{loc(lang, m.label, m.label_en)}</div>
                      <div style={S.moodDesc}>{loc(lang, m.desc, m.desc_en)}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* loader */}
          {loading && (
            <div style={S.loader}>
              <div style={S.orbit}>
                <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid transparent", borderTopColor: "#E8A020", borderRightColor: "#E8A020", animation: "spin 1s linear infinite" }} />
                <div style={{ position: "absolute", inset: 13, borderRadius: "50%", border: "2px solid transparent", borderBottomColor: "#F5B335", borderLeftColor: "#F5B335", animation: "spin 1.4s linear infinite reverse" }} />
                <div style={S.orbitCore}>🌙</div>
              </div>
              <div style={S.loadTxt}>{t("tonight_building")}</div>
              <div style={S.loadSub}>{LOAD_STEPS[loadStep]}</div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes tn-rise { from { opacity: 0; transform: translateY(18px) rotateX(-14deg); } to { opacity: 1; transform: none; } }
        @keyframes tn-float { from { transform: translateZ(26px) translateY(3px); } to { transform: translateZ(26px) translateY(-3px); } }
        @keyframes tn-ripple { from { transform: scale(0); opacity: 1; } to { transform: scale(18); opacity: 0; } }
        @keyframes tn-pop {
          0% { scale: 1; }
          35% { scale: .94; }
          70% { scale: 1.04; border-color: rgba(232,160,32,.7); box-shadow: 0 0 26px rgba(232,160,32,.35); }
          100% { scale: 1; }
        }
        @keyframes tn-shimmer { 0%, 70%, 100% { transform: translateX(-130%) skewX(-20deg); } 90% { transform: translateX(330%) skewX(-20deg); } }
        @keyframes tn-twinkle { 0%, 100% { opacity: 1; scale: 1; } 50% { opacity: .55; scale: .86; } }
        @keyframes tn-b1 { to { transform: translate(40px, 30px); } }
        @keyframes tn-b2 { to { transform: translate(-36px, -26px); } }
        .tn-blob1 { animation: tn-b1 14s ease-in-out infinite alternate; }
        .tn-blob2 { animation: tn-b2 18s ease-in-out infinite alternate; }
        .tn { position: relative; transform-style: preserve-3d; -webkit-tap-highlight-color: transparent;
          transform: rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg));
          transition: transform .35s cubic-bezier(.22,.61,.36,1), opacity .3s, scale .3s, border-color .3s;
          animation: tn-rise .6s cubic-bezier(.22,.61,.36,1) calc(var(--i, 0) * 70ms + 120ms) backwards; }
        .tn[data-track] { transition: transform .08s linear, opacity .3s, scale .3s, border-color .3s; }
        .tn::after { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
          background: radial-gradient(circle at var(--mx, 50%) var(--my, 50%), rgba(232,160,32,.22), transparent 60%);
          opacity: var(--go, 0); transition: opacity .3s; }
        @media (hover: hover) { .tn-tile:hover { border-color: rgba(232,160,32,.15) !important; } }
        .tn-fx { position: absolute; inset: 0; overflow: hidden; border-radius: inherit; pointer-events: none; }
        .tn-ripple { position: absolute; width: 20px; height: 20px; border-radius: 50%;
          background: radial-gradient(circle, rgba(232,160,32,.55), rgba(232,160,32,0) 70%);
          animation: tn-ripple .6s ease-out forwards; }
        .tn-icon { transform: translateZ(26px); will-change: transform; animation: tn-float 4.5s ease-in-out infinite alternate; align-self: flex-start; }
        .tn-label { transform: translateZ(14px); }
        .tn-sub { transform: translateZ(8px); }
        .tn-surprise { transform: perspective(900px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg)); animation-duration: .6s; animation-delay: .75s; }
        .tn-surprise:active { scale: .98; }
        .tn-surprise .tn-fx::before { content: ""; position: absolute; top: 0; bottom: 0; left: 0; width: 40%;
          background: linear-gradient(100deg, transparent, rgba(255,255,255,.35), transparent);
          animation: tn-shimmer 4.5s ease-in-out infinite; }
        .tn-twinkle { display: inline-block; animation: tn-twinkle 3s ease-in-out infinite; }
        .tn-dim { opacity: .35; scale: .96; }
        .tn-pop { opacity: 1; animation: tn-pop .45s ease; }
        @media (prefers-reduced-motion: reduce) {
          .tn, .tn *, .tn::after, .tn-blob1, .tn-blob2 { animation: none !important; transition: none !important; }
          .tn { transform: none !important; opacity: 1 !important; scale: none !important; }
          .tn-icon, .tn-label, .tn-sub { transform: none !important; }
          .tn::after { opacity: 0 !important; }
        }
        @media (max-width: 480px) {
          .tonight-modal-scroll h2 { font-size: 28px !important; }
        }
      `}</style>
    </>
  );
}

const G = "#E8A020";
const S: Record<string, React.CSSProperties> = {
  scrim: { position: "fixed", inset: 0, zIndex: 70, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(3,3,5,0.5)", padding: 12, paddingTop: "max(12px, env(safe-area-inset-top))" },
  modal: { position: "relative", width: 408, maxWidth: "100%", maxHeight: "88dvh", overflow: "clip", background: "linear-gradient(180deg,#0c0c0e,#0A0A12)", borderRadius: 24, border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 60px 160px rgba(0,0,0,0.78)", display: "flex", flexDirection: "column" },
  blob1: { position: "absolute", width: 300, height: 300, borderRadius: "50%", background: G, opacity: 0.1, filter: "blur(70px)", top: -200, left: -120, pointerEvents: "none" },
  blob2: { position: "absolute", width: 240, height: 240, borderRadius: "50%", background: "#16213E", opacity: 0.5, filter: "blur(70px)", bottom: -130, right: 0, pointerEvents: "none" },
  mtop: { position: "relative", zIndex: 5, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px 4px", flexShrink: 0 },
  close: { width: 34, height: 34, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.055)", background: "rgba(255,255,255,0.03)", color: "#A1A1AA", fontSize: 17, cursor: "pointer" },
  scroll: { position: "relative", zIndex: 5, overflowY: "auto", padding: "0 24px 26px" },
  kicker: { fontSize: 10.5, letterSpacing: "4px", textTransform: "uppercase", color: G, fontWeight: 700, marginTop: 10 },
  h2: { fontFamily: "var(--font-spectral),Georgia,serif", fontWeight: 700, fontSize: 34, lineHeight: 1, letterSpacing: "-1.2px", marginTop: 12, color: "#F4F4F5" },
  em: { fontStyle: "italic", fontWeight: 600, color: G },
  sub: { color: "#A1A1AA", fontSize: 14, marginTop: 13, lineHeight: 1.55 },
  grid: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12, marginTop: 24, perspective: 900 },
  tile: { textAlign: "left", border: "1px solid rgba(255,255,255,0.055)", background: "#1A1A28", borderRadius: 20, padding: "16px 14px", minHeight: 104, display: "flex", flexDirection: "column", gap: 10, cursor: "pointer", color: "#F4F4F5", width: "100%", boxSizing: "border-box" as const },
  tileLabel: { fontFamily: "var(--font-spectral),serif", fontWeight: 600, fontSize: 16, marginTop: "auto" },
  tileSub: { fontSize: 10.5, color: "#71717A", marginTop: 4 },
  surprise: { marginTop: 18, width: "100%", border: "none", borderRadius: 20, padding: 18, fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: 16.5, cursor: "pointer", color: "#1a1407", background: "linear-gradient(100deg,#b87d12,#E8A020 40%,#F5B335 60%,#E8A020)", boxShadow: "0 16px 42px rgba(232,160,32,0.3)", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 },
  skip: { background: "none", border: "none", color: "#71717A", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-inter),sans-serif" },
  back: { background: "none", border: "none", color: "#A1A1AA", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 7, padding: "14px 0 4px", fontWeight: 600, fontFamily: "var(--font-inter),sans-serif" },
  resHead: { fontFamily: "var(--font-spectral),serif", fontWeight: 700, fontSize: 25, letterSpacing: "-0.6px", marginTop: 2, color: "#F4F4F5" },
  nightKicker: { fontSize: 10.5, letterSpacing: "3.5px", textTransform: "uppercase", color: G, fontWeight: 700, marginTop: 8 },
  nightTitle: { fontFamily: "var(--font-spectral),serif", fontWeight: 700, fontSize: 30, letterSpacing: "-0.8px", marginTop: 11, lineHeight: 1.05, color: "#F4F4F5" },
  btnGhost: { flex: 1, borderRadius: 12, padding: 15, fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: 14.5, cursor: "pointer", border: "1px solid rgba(255,255,255,0.055)", background: "#1A1A28", color: "#F4F4F5" },
  btnGold: { flex: 1, borderRadius: 12, padding: 15, fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: 14.5, cursor: "pointer", border: "none", background: "linear-gradient(100deg,#E8A020,#F5B335)", color: "#1a1407", boxShadow: "0 14px 34px rgba(232,160,32,0.3)" },
  overlay: { position: "absolute", inset: 0, background: "rgba(5,5,7,0.82)", backdropFilter: "blur(14px)", zIndex: 20, display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: 16, borderRadius: 28 },
  sheet: { background: "linear-gradient(#0e0e10,#0A0A12)", border: "1px solid rgba(232,160,32,0.15)", borderRadius: 22, padding: 24 },
  grab: { width: 38, height: 4, background: "rgba(255,255,255,0.055)", borderRadius: 4, margin: "0 auto 18px" },
  sheetH3: { fontFamily: "var(--font-spectral),serif", fontWeight: 700, fontSize: 21, letterSpacing: "-0.4px", color: "#F4F4F5" },
  sheetP: { color: "#A1A1AA", fontSize: 13, marginTop: 6 },
  moods: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 11, marginTop: 20 },
  mood: { background: "#1A1A28", border: "1px solid rgba(255,255,255,0.055)", borderRadius: 14, padding: "16px 14px", cursor: "pointer", textAlign: "left", transition: "all .3s cubic-bezier(.22,.61,.36,1)" },
  moodLabel: { fontFamily: "var(--font-spectral),serif", fontWeight: 600, fontSize: 15, marginTop: 9, color: "#F4F4F5" },
  moodDesc: { fontSize: 10.5, color: "#71717A", marginTop: 3 },
  loader: { position: "absolute", inset: 0, zIndex: 30, background: "rgba(7,7,8,0.94)", backdropFilter: "blur(16px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRadius: 28, textAlign: "center", padding: 40 },
  orbit: { width: 84, height: 84, position: "relative", marginBottom: 26 },
  orbitCore: { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 },
  loadTxt: { fontFamily: "var(--font-spectral),serif", fontWeight: 700, fontSize: 18, color: "#F4F4F5" },
  loadSub: { color: "#A1A1AA", fontSize: 12.5, marginTop: 9 },
  subChip: { whiteSpace: "nowrap", fontSize: 13, fontWeight: 600, color: "#A1A1AA", background: "#1A1A28", border: "1px solid rgba(255,255,255,0.055)", padding: "9px 15px", borderRadius: 6, cursor: "pointer", transition: "all .2s" },
  eventCard: { display: "block", marginTop: 16, padding: 14, borderRadius: 14, border: "1px solid rgba(232,160,32,0.3)", background: "rgba(232,160,32,0.04)", textDecoration: "none", color: "inherit" },
  eventKicker: { fontSize: 10.5, letterSpacing: "0.5px", color: G, fontWeight: 700 },
  eventImg: { width: 52, height: 52, borderRadius: 10, objectFit: "cover" as const, flexShrink: 0 },
  eventTitle: { fontFamily: "var(--font-spectral),serif", fontWeight: 600, fontSize: 14.5, color: "#F4F4F5", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  eventMeta: { fontSize: 11.5, color: "#A1A1AA", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
};
