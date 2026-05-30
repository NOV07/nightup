"use client";

import { useState, useEffect, useCallback } from "react";
import SpotCard from "./SpotCard";
import { SPOT_CATEGORIES, SUBCATEGORIES, MOODS, type Spot, type SpotCategory } from "../spots/types";

const SEEN_KEY = "nightup_tonight_seen";
const SEEN_HOURS = 12;

// client-side night builder (mirror του data.ts buildNight)
function buildNight(all: Spot[], mood: string): Spot[] {
  const pick = (c: SpotCategory): Spot | null => {
    const pool = all.filter((s) => s.category === c);
    return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
  };
  const seq: SpotCategory[] =
    mood === "food" ? ["food", "drink", "show"]
    : mood === "wild" ? ["food", "drink", "nightlife"]
    : mood === "diff" ? ["chill", "show", "drink"]
    : ["food", "drink", "nightlife"];
  return seq.map(pick).filter(Boolean) as Spot[];
}

const STOP_LABELS: Record<SpotCategory, string> = {
  food: "ΦΑΓΗΤΟ", drink: "ΠΟΤΟ", nightlife: "ΝΥΧΤΑ",
  show: "ENTERTAINMENT", chill: "ΧΑΛΑΡΑ", activity: "ΔΡΑΣΤΗΡΙΟΤΗΤΑ",
  art: "ΤΕΧΝΗ", wellness: "WELLNESS",
};
const STOP_TIMES = ["20:30", "22:00", "00:00"];
const WALKS = ["2 λεπτά με τα πόδια", "4 λεπτά με τα πόδια"];
const LOAD_STEPS = ["Βρίσκουμε πού να φας", "Ψάχνουμε ποτό δίπλα", "Κλείνουμε με χορό", "Μετράμε αποστάσεις…"];

export default function TonightModal({ spots, open, onClose }: { spots: Spot[]; open: boolean; onClose: () => void }) {
  const [view, setView] = useState<"tiles" | "subcats" | "results" | "night">("tiles");
  const [activeCat, setActiveCat] = useState<SpotCategory>("drink");
  const [activeSub, setActiveSub] = useState<string | null>(null);
  const [moodOpen, setMoodOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadStep, setLoadStep] = useState(0);
  const [night, setNight] = useState<Spot[]>([]);

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
    try { localStorage.setItem(SEEN_KEY, String(Date.now())); } catch {}
  }, [onClose]);

  // Escape to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, handleClose]);

  const goCategory = (c: SpotCategory) => { setActiveCat(c); setActiveSub(null); setView("subcats"); };
  const goResults = (sub: string | null) => { setActiveSub(sub); setView("results"); };

  const pickMood = (mood: string) => {
    setMoodOpen(false);
    setLoading(true);
    setLoadStep(0);
    let i = 0;
    const iv = setInterval(() => { i++; if (i < LOAD_STEPS.length) setLoadStep(i); }, 520);
    setTimeout(() => {
      clearInterval(iv);
      setNight(buildNight(spots, mood));
      setLoading(false);
      setView("night");
    }, 2150);
  };

  const reroll = () => {
    setLoading(true);
    setLoadStep(LOAD_STEPS.length - 1);
    setTimeout(() => {
      setNight(buildNight(spots, "chill"));
      setLoading(false);
    }, 1100);
  };

  const catSpots = spots.filter((s) =>
    s.category === activeCat && (!activeSub || s.subcategory === activeSub)
  );
  const now = new Date();
  const days = ["Κυριακή","Δευτέρα","Τρίτη","Τετάρτη","Πέμπτη","Παρασκευή","Σάββατο"];
  const kicker = `${days[now.getDay()]}  ${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}  Αθήνα`;

  if (!open) return null;

  return (
    <>
      <div style={S.scrim} onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
        <div style={S.modal}>
          {/* atmosphere */}
          <div style={S.blob1} /><div style={S.blob2} />

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
                <h2 style={S.h2}>Plan your <em style={S.em}>exit</em></h2>
                <p style={S.sub}>Διάλεξε διάθεση ή άσε μας να σου στήσουμε ολόκληρη τη βραδιά.</p>
                <div style={S.grid}>
                  {SPOT_CATEGORIES.map((c) => (
                    <button key={c.key} onClick={() => goCategory(c.key)} style={S.tile}
                      onMouseEnter={(e)=>{e.currentTarget.style.transform="translateY(-4px)";e.currentTarget.style.borderColor="rgba(232,160,32,0.15)";}}
                      onMouseLeave={(e)=>{e.currentTarget.style.transform="none";e.currentTarget.style.borderColor="rgba(255,255,255,0.055)";}}>
                      <div style={{ fontSize: 26 }}>{c.emoji}</div>
                      <div>
                        <div style={S.tileLabel}>{c.label}</div>
                        <div style={S.tileSub}>{c.sub}</div>
                      </div>
                    </button>
                  ))}
                </div>
                <button onClick={() => setMoodOpen(true)} style={S.surprise}
                  onMouseEnter={(e)=>{e.currentTarget.style.transform="translateY(-3px)";}}
                  onMouseLeave={(e)=>{e.currentTarget.style.transform="none";}}>
                  <span style={{ fontSize: 20 }}>✨</span>
                  <span>Εξέπληξέ με<br/><span style={{ fontWeight: 400, fontSize: 10.5, opacity: 0.7 }}>Ολόκληρη βραδιά σε 2 taps</span></span>
                </button>
                <div style={{ textAlign: "center", marginTop: 16 }}>
                  <button onClick={handleClose} style={S.skip}>Όχι τώρα — δες την αρχική →</button>
                </div>
              </div>
            )}

            {/* ── SUBCATS ── */}
            {view === "subcats" && (
              <div>
                <button onClick={() => setView("tiles")} style={S.back}>‹ Πίσω</button>
                <div style={S.resHead}>
                  {SPOT_CATEGORIES.find((c)=>c.key===activeCat)?.label} <em style={S.em}>· τι είδος;</em>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 9, marginTop: 18 }}>
                  <button onClick={() => goResults(null)} style={S.subChip}>Όλα</button>
                  {SUBCATEGORIES[activeCat].map((sub) => {
                    const count = spots.filter((s) => s.category === activeCat && s.subcategory === sub.value).length;
                    const disabled = count === 0;
                    return (
                      <button
                        key={sub.value}
                        onClick={() => !disabled && goResults(sub.value)}
                        disabled={disabled}
                        style={{
                          ...S.subChip,
                          opacity: disabled ? 0.4 : 1,
                          cursor: disabled ? "default" : "pointer",
                        }}
                      >
                        {sub.label}{disabled ? " · σύντομα" : ` · ${count}`}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── RESULTS ── */}
            {view === "results" && (
              <div>
                <button onClick={() => setView("subcats")} style={S.back}>‹ Πίσω</button>
                <div style={S.resHead}>
                  {activeSub
                    ? SUBCATEGORIES[activeCat].find((x) => x.value === activeSub)?.label ?? activeSub
                    : SPOT_CATEGORIES.find((c)=>c.key===activeCat)?.label}
                  {" "}<em style={S.em}>· κοντά σου</em>
                </div>
                <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
                  {catSpots.map((s) => <SpotCard key={s.id} spot={s} compact onNavigate={handleClose} />)}
                </div>
              </div>
            )}

            {/* ── NIGHT ── */}
            {view === "night" && (
              <div>
                <button onClick={() => setView("tiles")} style={S.back}>‹ Νέα αναζήτηση</button>
                <div style={S.nightKicker}>Η βραδιά σου · στημένη</div>
                <div style={S.nightTitle}>Η βραδιά <em style={S.em}>ανεβαίνει</em></div>
                <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 6 }}>
                  {night.map((s, i) => (
                    <div key={s.id}>
                      <div style={{ fontSize: 11.5, color: "#E8A020", fontWeight: 700, letterSpacing: "0.7px", marginBottom: 6 }}>
                        {STOP_TIMES[i]} · {STOP_LABELS[s.category]}
                      </div>
                      <SpotCard spot={s} compact onNavigate={handleClose} />
                      {i < night.length - 1 && (
                        <div style={{ fontSize: 11, color: "#E8A020", opacity: 0.82, margin: "8px 0 8px 6px" }}>
                          — {WALKS[i] ?? "λίγα λεπτά με τα πόδια"}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
                  <button onClick={reroll} style={S.btnGhost}>🔄 Άλλη πρόταση</button>
                  <button style={S.btnGold}>Κράτα τη βραδιά</button>
                </div>
              </div>
            )}
          </div>

          {/* mood sheet */}
          {moodOpen && (
            <div style={S.overlay} onClick={(e)=>{if(e.target===e.currentTarget)setMoodOpen(false);}}>
              <div style={S.sheet}>
                <div style={S.grab} />
                <h3 style={S.sheetH3}>Τι διάθεση έχεις;</h3>
                <p style={S.sheetP}>Μία ερώτηση και σου στήνουμε τη βραδιά.</p>
                <div style={S.moods}>
                  {MOODS.map((m) => (
                    <button key={m.key} onClick={() => pickMood(m.key)} style={S.mood}
                      onMouseEnter={(e)=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.borderColor="rgba(232,160,32,0.15)";}}
                      onMouseLeave={(e)=>{e.currentTarget.style.transform="none";e.currentTarget.style.borderColor="rgba(255,255,255,0.055)";}}>
                      <div style={{ fontSize: 25 }}>{m.emoji}</div>
                      <div style={S.moodLabel}>{m.label}</div>
                      <div style={S.moodDesc}>{m.desc}</div>
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
              <div style={S.loadTxt}>Στήνουμε τη βραδιά σου…</div>
              <div style={S.loadSub}>{LOAD_STEPS[loadStep]}</div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 480px) {
          .tonight-modal-scroll h2 { font-size: 28px !important; }
        }
      `}</style>
    </>
  );
}

const G = "#E8A020";
const S: Record<string, React.CSSProperties> = {
  scrim: { position: "fixed", inset: 0, zIndex: 70, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(3,3,5,0.5)", padding: 12 },
  modal: { position: "relative", width: 408, maxWidth: "100%", maxHeight: "88vh", overflow: "hidden", background: "linear-gradient(180deg,#0c0c0e,#0A0A12)", borderRadius: 24, border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 60px 160px rgba(0,0,0,0.78)", display: "flex", flexDirection: "column" },
  blob1: { position: "absolute", width: 300, height: 300, borderRadius: "50%", background: G, opacity: 0.1, filter: "blur(70px)", top: -200, left: -120, pointerEvents: "none" },
  blob2: { position: "absolute", width: 240, height: 240, borderRadius: "50%", background: "#16213E", opacity: 0.5, filter: "blur(70px)", bottom: -130, right: -90, pointerEvents: "none" },
  mtop: { position: "relative", zIndex: 5, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px 4px", flexShrink: 0 },
  close: { width: 34, height: 34, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.055)", background: "rgba(255,255,255,0.03)", color: "#A1A1AA", fontSize: 17, cursor: "pointer" },
  scroll: { position: "relative", zIndex: 5, overflowY: "auto", padding: "0 24px 26px" },
  kicker: { fontSize: 10.5, letterSpacing: "4px", textTransform: "uppercase", color: G, fontWeight: 700, marginTop: 10 },
  h2: { fontFamily: "var(--font-spectral),Georgia,serif", fontWeight: 700, fontSize: 34, lineHeight: 1, letterSpacing: "-1.2px", marginTop: 12, color: "#F4F4F5" },
  em: { fontStyle: "italic", fontWeight: 600, color: G },
  sub: { color: "#A1A1AA", fontSize: 14, marginTop: 13, lineHeight: 1.55 },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 24 },
  tile: { textAlign: "left", border: "1px solid rgba(255,255,255,0.055)", background: "#1A1A28", borderRadius: 6, padding: "16px 14px", minHeight: 104, display: "flex", flexDirection: "column", gap: 10, cursor: "pointer", transition: "all .3s cubic-bezier(.22,.61,.36,1)", color: "#F4F4F5" },
  tileLabel: { fontFamily: "var(--font-spectral),serif", fontWeight: 600, fontSize: 16, marginTop: "auto" },
  tileSub: { fontSize: 10.5, color: "#71717A", marginTop: 4 },
  surprise: { marginTop: 18, width: "100%", border: "none", borderRadius: 14, padding: 18, fontFamily: "var(--font-spectral),serif", fontWeight: 700, fontSize: 16.5, cursor: "pointer", color: "#1a1407", background: "linear-gradient(100deg,#b87d12,#E8A020 40%,#F5B335 60%,#E8A020)", boxShadow: "0 16px 42px rgba(232,160,32,0.3)", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, transition: "transform .3s cubic-bezier(.22,.61,.36,1)" },
  skip: { background: "none", border: "none", color: "#71717A", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-inter),sans-serif" },
  back: { background: "none", border: "none", color: "#A1A1AA", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 7, padding: "14px 0 4px", fontWeight: 600, fontFamily: "var(--font-inter),sans-serif" },
  resHead: { fontFamily: "var(--font-spectral),serif", fontWeight: 700, fontSize: 25, letterSpacing: "-0.6px", marginTop: 2, color: "#F4F4F5" },
  nightKicker: { fontSize: 10.5, letterSpacing: "3.5px", textTransform: "uppercase", color: G, fontWeight: 700, marginTop: 8 },
  nightTitle: { fontFamily: "var(--font-spectral),serif", fontWeight: 700, fontSize: 30, letterSpacing: "-0.8px", marginTop: 11, lineHeight: 1.05, color: "#F4F4F5" },
  btnGhost: { flex: 1, borderRadius: 12, padding: 15, fontFamily: "var(--font-spectral),serif", fontWeight: 700, fontSize: 14.5, cursor: "pointer", border: "1px solid rgba(255,255,255,0.055)", background: "#1A1A28", color: "#F4F4F5" },
  btnGold: { flex: 1, borderRadius: 12, padding: 15, fontFamily: "var(--font-spectral),serif", fontWeight: 700, fontSize: 14.5, cursor: "pointer", border: "none", background: "linear-gradient(100deg,#E8A020,#F5B335)", color: "#1a1407", boxShadow: "0 14px 34px rgba(232,160,32,0.3)" },
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
};
