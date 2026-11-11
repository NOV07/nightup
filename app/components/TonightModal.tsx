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
import { useTilt, reducedMotion } from "./useTilt";

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

// Tile/button with the tilt (useTilt), a gold glare and a ripple on click.
// The ripple lives in its own overflow:hidden wrapper so the tile itself keeps preserve-3d while tilting.
function TiltTile({ className = "", style, index = 0, max = 8, dim, pop, onPress, onActivate, children }: {
  className?: string; style?: React.CSSProperties; index?: number; max?: number;
  dim?: boolean; pop?: boolean; onPress?: () => void; onActivate: () => void; children: React.ReactNode;
}) {
  const { ref, handlers } = useTilt<HTMLButtonElement>(max);
  const fx = useRef<HTMLSpanElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

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
      {...handlers} onClick={click}>
      <span ref={fx} className="tn-fx" aria-hidden="true" />
      {children}
    </button>
  );
}

const VIEW_RANK = { tiles: 0, subcats: 1, results: 2, night: 3 } as const;
const STOP_TIMES = ["20:30", "22:00", "00:00"];
export default function TonightModal({ spots, open, onClose, events }: { spots: Spot[]; open: boolean; onClose: () => void; events: EventLite[] }) {
  const { t, lang } = useLanguage();
  const WALKS = [t("tonight_walk_2"), t("tonight_walk_4")];
  // The stop's own category (the one it was picked for), shown uppercase via CSS.
  const stopCategoryLabel = (s: Spot) => spotCategoryLabel(s.nightSlot ?? s.category, lang);
  const LOAD_STEPS = [t("tonight_load_1"), t("tonight_load_2"), t("tonight_load_3"), t("tonight_load_4")];
  type View = "tiles" | "subcats" | "results" | "night";
  const [view, setViewRaw] = useState<View>("tiles");
  // Screen transition: the previous view stays mounted for 300ms (leave) while the new one enters.
  const [dir, setDir] = useState<"fwd" | "back" | null>(null);
  const [leave, setLeave] = useState<View | null>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setView = (v: View) => {
    if (v === view) return;
    if (reducedMotion()) { setViewRaw(v); return; }
    setDir(VIEW_RANK[v] > VIEW_RANK[view] ? "fwd" : "back");
    setLeave(view);
    setViewRaw(v);
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    leaveTimer.current = setTimeout(() => setLeave(null), 300);
  };
  const [nightKey, setNightKey] = useState(0);
  const [moodClosing, setMoodClosing] = useState(false);
  const [subPicked, setSubPicked] = useState<string | null>(null);
  const uiTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    uiTimers.current.forEach(clearTimeout);
  }, []);
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
      setViewRaw("tiles");
      setDir(null);
      setLeave(null);
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

  // Mood sheet closes with a short exit animation before it unmounts.
  const closeMood = () => {
    if (reducedMotion()) { setMoodOpen(false); return; }
    setMoodClosing(true);
    uiTimers.current.push(setTimeout(() => { setMoodOpen(false); setMoodClosing(false); }, 250));
  };
  const pickSub = (key: string | null) => {
    if (reducedMotion()) { goResults(key); return; }
    setSubPicked(key ?? "__all");
    uiTimers.current.push(setTimeout(() => { setSubPicked(null); goResults(key); }, 200));
  };

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
    closeMood();
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
      setNightKey((k) => k + 1);
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

  const renderView = (v: View) => (
    <>
      {/* ── TILES ── */}
      {v === "tiles" && (
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
                <div className="tn-icon"><SpotCategoryIcon category={c.key} size={22} /></div>
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
      {v === "subcats" && (
        <div>
          <button onClick={() => setView("tiles")} style={S.back}>{t("tonight_back")}</button>
          <div style={S.resHead}>
            {activeCatDef ? loc(lang, activeCatDef.label_el, activeCatDef.label_en) : null} <em style={S.em}>· {t("tonight_vibe_q")}</em>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 9, marginTop: 18 }}>
            <button onClick={() => pickSub(null)} className={`tn-chip${subPicked === "__all" ? " tn-chip-pop" : ""}`} style={{ ...S.subChip, "--i": 0 } as React.CSSProperties}>{t("tonight_all_sub")}</button>
            {subsOf(activeCat).map((sub, si) => {
              const count = spots.filter((s) => spotInCategory(s, activeCat) && spotSubsInCategory(s, activeCat).includes(sub.key)).length;
              const disabled = count === 0;
              return (
                <button
                  key={sub.key}
                  onClick={() => !disabled && pickSub(sub.key)}
                  disabled={disabled}
                  className={`tn-chip${subPicked === sub.key ? " tn-chip-pop" : ""}`}
                  style={{
                    ...S.subChip,
                    "--i": si + 1,
                    opacity: disabled ? 0.4 : 1,
                    cursor: disabled ? "default" : "pointer",
                  } as React.CSSProperties}
                >
                  {loc(lang, sub.label_el, sub.label_en)}{disabled ? ` · ${t("tonight_coming_soon")}` : ` · ${count}`}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── RESULTS ── */}
      {v === "results" && (
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
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12, perspective: 900 }}>
            {catSpots.map((s, i) => <SpotCard key={s.id} spot={s} compact animated index={i} onNavigate={handleClose} />)}
          </div>
        </div>
      )}

      {/* ── NIGHT ── */}
      {v === "night" && (
        <div>
          <button onClick={() => setView("tiles")} style={S.back}>{t("tonight_new_search")}</button>
          <div style={S.nightKicker}>{t("tonight_kicker")}</div>
          <div style={S.nightTitle}>{t("tonight_title")} <em style={S.em}>{t("tonight_title_em")}</em></div>
          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 6 }}>
            {night.map((s, i) => (
              <div key={`${nightKey}-${s.id}`} className="tn-appear" style={{ "--d": `${i * 850 + 200}ms` } as React.CSSProperties}>
                <div style={{ fontSize: 11.5, color: "#E8A020", fontWeight: 700, letterSpacing: "0.7px", marginBottom: 6 }}>
                  {STOP_TIMES[i]} · <span style={{ textTransform: "uppercase" }}>{stopCategoryLabel(s)}</span>
                </div>
                <SpotCard spot={s} compact onNavigate={handleClose} />
                {i < night.length - 1 && (
                  <div className="tn-walk" style={{ "--d": `${i * 850 + 700}ms`, "--dt": `${i * 850 + 1000}ms` } as React.CSSProperties}>
                    <span className="tn-walk-line" />
                    <span className="tn-walk-txt">· {WALKS[i] ?? t("tonight_walk_min")}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
          {matchedEvent && (
            <Link key={`ev-${nightKey}`} href={`/events/${matchedEvent.id}`} onClick={handleClose} className="tn-appear" style={{ ...S.eventCard, "--d": "3000ms" } as React.CSSProperties}>
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
          <div key={`btn-${nightKey}`} className="tn-appear tn-actions" style={{ "--d": "300ms" } as React.CSSProperties}>
            <button onClick={reroll} style={S.btnGhost}>{t("tonight_reroll")}</button>
            <button onClick={keepNight} style={S.btnGold}>{copied ? t("tonight_copied") : t("tonight_keep")}</button>
          </div>
        </div>
      )}
    </>
  );

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
            {leave && <div key={`l-${leave}`} className="tn-leave" data-dir={dir} aria-hidden="true">{renderView(leave)}</div>}
            <div key={view} className={dir ? "tn-enter" : undefined} data-dir={dir ?? undefined}>{renderView(view)}</div>
          </div>

          {/* mood sheet */}
          {moodOpen && (
            <div className={`tn-overlay${moodClosing ? " tn-closing" : ""}`} style={S.overlay} onClick={(e)=>{if(e.target===e.currentTarget)closeMood();}}>
              <div className={`tn-sheet${moodClosing ? " tn-closing" : ""}`} style={S.sheet}>
                <div style={S.grab} />
                <h3 style={S.sheetH3}>{t("tonight_sheet_h")}</h3>
                <p style={S.sheetP}>{t("tonight_sheet_p")}</p>
                <div style={S.moods}>
                  {MOODS.map((m, mi) => (
                    <button key={m.key} onClick={() => pickMood(m.key)} className="tn-mood" style={{ ...S.mood, "--i": mi } as React.CSSProperties}>
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
        @keyframes tn-rise { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
        @keyframes tn-icon-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes tn-in-fwd { from { opacity: 0; transform: translateX(34px); } }
        @keyframes tn-in-back { from { opacity: 0; transform: translateX(-34px); } }
        @keyframes tn-out-fwd { to { opacity: 0; transform: translateX(-34px); } }
        @keyframes tn-out-back { to { opacity: 0; transform: translateX(34px); } }
        @keyframes tn-appear { from { opacity: 0; transform: translateY(18px); } }
        @keyframes tn-chip-in { from { opacity: 0; transform: translateY(10px) scale(.85); } 70% { transform: translateY(0) scale(1.04); } to { transform: none; } }
        @keyframes tn-chip-pop { 0% { scale: 1; } 40% { scale: .92; } 75% { scale: 1.06; } 100% { scale: 1; } }
        @keyframes tn-line { from { transform: scaleY(0); } }
        @keyframes tn-fade { from { opacity: 0; } }
        @keyframes tn-fade-out { to { opacity: 0; } }
        @keyframes tn-sheet-in { from { transform: translateY(110%); } }
        @keyframes tn-sheet-out { to { transform: translateY(110%); } }
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
        .tn { position: relative; transform-style: flat; -webkit-tap-highlight-color: transparent; transform: none;
          transition: transform .35s cubic-bezier(.22,.61,.36,1), opacity .3s, scale .3s, border-color .3s;
          animation: tn-rise .6s cubic-bezier(.22,.61,.36,1) calc(var(--i, 0) * 70ms + 120ms) backwards; }
        /* 3D only while the pointer is on the tile (data-3d is kept ~400ms after leave so the tile
           eases back to flat before it stops being preserve-3d, no snap). */
        .tn[data-3d] { transform-style: preserve-3d; transform: rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg)); }
        .tn[data-track] { transition: transform .08s linear, opacity .3s, scale .3s, border-color .3s; }
        .tn::after { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
          background: radial-gradient(circle at var(--mx, 50%) var(--my, 50%), rgba(232,160,32,.22), transparent 60%);
          opacity: var(--go, 0); transition: opacity .3s; }
        @media (hover: hover) { .tn-tile:hover { border-color: rgba(232,160,32,.15) !important; } }
        .tn-fx { position: absolute; inset: 0; overflow: hidden; border-radius: inherit; pointer-events: none; }
        .tn-ripple { position: absolute; width: 20px; height: 20px; border-radius: 50%;
          background: radial-gradient(circle, rgba(232,160,32,.55), rgba(232,160,32,0) 70%);
          animation: tn-ripple .6s ease-out forwards; }
        .tn-icon { position: relative; isolation: isolate; align-self: flex-start; line-height: 0; transition: transform .25s cubic-bezier(.22,.61,.36,1);
          animation: tn-icon-in .5s ease-out calc(var(--i, 0) * 70ms + 120ms) backwards; }
        .tn-icon::before { content: ""; position: absolute; inset: -14px; border-radius: 50%; pointer-events: none; z-index: -1;
          background: radial-gradient(circle, rgba(232,160,32,.5), transparent 68%);
          opacity: 0; scale: .6; transition: opacity .35s, scale .35s; }
        .tn[data-track] .tn-icon::before { opacity: 1; scale: 1; }
        .tn-label, .tn-sub { transition: transform .25s cubic-bezier(.22,.61,.36,1); }
        .tn[data-track] .tn-icon { transform: translateZ(26px); }
        .tn[data-track] .tn-label { transform: translateZ(14px); }
        .tn[data-track] .tn-sub { transform: translateZ(8px); }
        .tn-surprise { transform: perspective(900px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg)); animation-duration: .6s; animation-delay: .75s; }
        .tn-surprise[data-3d] { transform: perspective(900px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg)); transform-style: flat; }
        .tn-surprise:active { scale: .98; }
        .tn-surprise .tn-fx::before { content: ""; position: absolute; top: 0; bottom: 0; left: 0; width: 40%;
          background: linear-gradient(100deg, transparent, rgba(255,255,255,.35), transparent);
          animation: tn-shimmer 4.5s ease-in-out infinite; }
        .tn-twinkle { display: inline-block; animation: tn-twinkle 3s ease-in-out infinite; }
        .tn-dim { opacity: .35; scale: .96; }
        .tn-pop { opacity: 1; animation: tn-pop .45s ease; }
        .tn-enter { animation: .38s cubic-bezier(.22,.61,.36,1) backwards; }
        .tn-enter[data-dir="fwd"] { animation-name: tn-in-fwd; }
        .tn-enter[data-dir="back"] { animation-name: tn-in-back; }
        .tn-leave { position: absolute; top: 0; left: 24px; right: 24px; pointer-events: none; animation: .3s cubic-bezier(.22,.61,.36,1) forwards; }
        .tn-leave[data-dir="fwd"] { animation-name: tn-out-fwd; }
        .tn-leave[data-dir="back"] { animation-name: tn-out-back; }
        .tn-card { border-radius: 20px !important; animation-delay: calc(var(--i, 0) * 90ms + 100ms); }
        .tn-appear { animation: tn-appear .6s cubic-bezier(.22,.61,.36,1) var(--d, 0ms) backwards; }
        .tn-chip { animation: tn-chip-in .45s cubic-bezier(.22,.61,.36,1) calc(var(--i, 0) * 55ms + 120ms) backwards; }
        .tn-chip-pop { animation: tn-chip-pop .2s ease; }
        @media (hover: hover) { .tn-chip:not(:disabled):hover { border-color: rgba(232,160,32,.55) !important; color: #E8A020 !important; } }
        .tn-actions { position: sticky; bottom: 0; z-index: 3; display: flex; gap: 10px; margin: 8px -24px 0;
          padding: 28px 24px calc(14px + env(safe-area-inset-bottom));
          background: linear-gradient(to bottom, rgba(10,10,18,0), #0A0A12 38%); }
        .tn-walk { display: flex; gap: 10px; align-items: stretch; margin: 6px 0 6px 6px; min-height: 30px; }
        .tn-walk-line { width: 2px; border-radius: 2px; background: linear-gradient(to bottom, #E8A020, rgba(232,160,32,.15));
          transform-origin: top; animation: tn-line .6s cubic-bezier(.22,.61,.36,1) var(--d, 0ms) backwards; }
        .tn-walk-txt { align-self: center; font-size: 11px; color: #E8A020; opacity: .82; animation: tn-fade .4s ease var(--dt, 0ms) backwards; }
        .tn-overlay { animation: tn-fade .3s ease backwards; }
        .tn-overlay.tn-closing { animation: tn-fade-out .25s ease forwards; }
        .tn-sheet { animation: tn-sheet-in .6s cubic-bezier(.34,1.45,.5,1) backwards; }
        .tn-sheet.tn-closing { animation: tn-sheet-out .25s ease-in forwards; }
        .tn-mood { animation: tn-appear .5s cubic-bezier(.22,.61,.36,1) calc(var(--i, 0) * 70ms + 280ms) backwards; }
        @media (hover: hover) { .tn-mood:hover { border-color: rgba(232,160,32,.55) !important; transform: translateY(-3px); } }
        @media (prefers-reduced-motion: reduce) {
          .tn-enter, .tn-card, .tn-appear, .tn-chip, .tn-chip-pop, .tn-walk-line, .tn-walk-txt, .tn-overlay, .tn-sheet, .tn-mood,
          .tn-icon, .tn-icon::before { animation: none !important; transition: none !important; }
          .tn-leave { display: none !important; }
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
  subChip: { whiteSpace: "nowrap", fontSize: 13, fontWeight: 600, color: "#A1A1AA", background: "#1A1A28", border: "1px solid rgba(255,255,255,0.055)", padding: "9px 15px", borderRadius: 999, cursor: "pointer", transition: "all .2s" },
  eventCard: { display: "block", marginTop: 16, padding: 14, borderRadius: 14, border: "1px solid rgba(232,160,32,0.3)", background: "rgba(232,160,32,0.04)", textDecoration: "none", color: "inherit" },
  eventKicker: { fontSize: 10.5, letterSpacing: "0.5px", color: G, fontWeight: 700 },
  eventImg: { width: 52, height: 52, borderRadius: 10, objectFit: "cover" as const, flexShrink: 0 },
  eventTitle: { fontFamily: "var(--font-spectral),serif", fontWeight: 600, fontSize: 14.5, color: "#F4F4F5", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  eventMeta: { fontSize: 11.5, color: "#A1A1AA", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
};
