"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRadio, STATIONS } from "./RadioContext";
import type { RadioStatus } from "./RadioContext";
import { usePlayerStore } from "./PlayerContext";

// ── Per-station visual metadata ───────────────────────────────────────────────
const META: Record<string, { emoji: string; genre: string; tagline: string }> = {
  house:  { emoji: "🎵", genre: "Deep House · 128 BPM",    tagline: "Midnight Ibiza frequencies" },
  techno: { emoji: "⚡", genre: "Dark Techno · 140 BPM",   tagline: "Subterranean pulse" },
  rnb:    { emoji: "🎷", genre: "Neo Soul · Funk · 90 BPM", tagline: "Groove after midnight" },
};
const DEFAULT_META = { emoji: "🎙", genre: "", tagline: "" };

// ── Sub-components ────────────────────────────────────────────────────────────
function Equalizer({ animate, bars = 5 }: { animate: boolean; bars?: number }) {
  const REST = [4, 9, 13, 7, 4];
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 14 }}>
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className={animate ? `eq-b eq-b-${i}` : undefined}
          style={{
            width: 2,
            height: animate ? undefined : REST[i] ?? 6,
            background: "linear-gradient(to top, #E8A020, #F5B335)",
            borderRadius: 1,
            opacity: animate ? 1 : 0.28,
            flexShrink: 0,
          }}
        />
      ))}
    </div>
  );
}

function PlayIcon({ size = 22 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden>
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon({ size = 22 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden>
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
  );
}

function VolumeIcon({ muted }: { muted: boolean }) {
  if (muted) {
    return (
      <svg viewBox="0 0 24 24" width={15} height={15} fill="currentColor" aria-hidden>
        <path d="M16.5 12A4.5 4.5 0 0014 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0021 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27l4.73 4.73H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06A8.995 8.995 0 0017.73 18L19 19.27 20.27 18 5.27 3 4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width={15} height={15} fill="currentColor" aria-hidden>
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
    </svg>
  );
}

// ── Transport button label by status ─────────────────────────────────────────
function transportLabel(status: RadioStatus) {
  if (status === "playing")   return "Pause";
  if (status === "buffering") return "Buffering…";
  if (status === "error")     return "Retry";
  return "Play";
}

// ── Main component ────────────────────────────────────────────────────────────
export default function RadioStrip() {
  const {
    currentStation, status, isPlaying, isMuted,
    volume, currentTrack, playStation, togglePlay, setVolume, toggleMute,
  } = useRadio();
  const { currentTrack: playerTrack } = usePlayerStore();

  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const meta = META[currentStation.id] ?? DEFAULT_META;

  // Close on outside click
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  // Spacebar on root = togglePlay (only when root div itself is focused)
  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === " " && e.target === e.currentTarget) {
      e.preventDefault();
      togglePlay();
    }
  }, [togglePlay]);

  const handlePillPlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    togglePlay();
  };

  const openMenu = () => setIsOpen((o) => !o);

  // Track title: prefer SSE title over station name fallback
  const trackTitle = currentTrack?.title && currentTrack.title !== currentStation.name
    ? currentTrack.title
    : null;

  // Volume slider fill (gold filled portion)
  const volFillPct = `${Math.round(volume * 100)}%`;
  const sliderBg = `linear-gradient(to right, ${isMuted ? "rgba(232,160,32,0.3)" : "#E8A020"} ${volFillPct}, rgba(255,255,255,0.1) ${volFillPct})`;

  return (
    <div
      ref={ref}
      className={`radio-strip-desktop${playerTrack ? " rs-has-track" : ""}`}
      tabIndex={0}
      onKeyDown={onKeyDown}
      aria-label="Nightwaves Radio"
      style={{
        position: "fixed", bottom: 24, right: 24, zIndex: 500,
        maxWidth: "calc(100vw - 48px)",
        userSelect: "none", outline: "none",
      }}
    >

      {/* ══════════════════════════════════════════════════════════════════
          EXPANDED PANEL
      ══════════════════════════════════════════════════════════════════ */}
      {isOpen && (
        <div
          className="rs-panel"
          style={{
            position: "absolute", bottom: "calc(100% + 10px)", right: 0,
            width: 308, maxWidth: "calc(100vw - 32px)",
            background: "linear-gradient(160deg, #0F0F1A 0%, #12121f 55%, #16213E 100%)",
            border: "1px solid rgba(232,160,32,0.18)",
            borderRadius: 18,
            boxShadow: "0 24px 80px rgba(0,0,0,0.72), 0 0 0 1px rgba(232,160,32,0.05) inset",
            backdropFilter: "blur(12px)",
            overflow: "hidden",
            animation: "rsPanelIn 0.25s cubic-bezier(.22,.61,.36,1) both",
            transformOrigin: "bottom right",
          }}
        >

          {/* ── Header ──────────────────────────────────────────────────── */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "15px 18px 11px",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{
                fontFamily: "var(--font-inter), sans-serif",
                fontSize: 12.5, fontWeight: 800,
                letterSpacing: "0.22em", textTransform: "uppercase",
                color: "#F4F4F5",
              }}>
                NIGHT<span style={{ color: "#E8A020" }}>WAVES</span>
              </span>
              {status === "playing" && (
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div className="rs-live-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "#E8A020", flexShrink: 0 }} />
                  <span style={{
                    fontFamily: "var(--font-inter), sans-serif",
                    fontSize: 8.5, fontWeight: 700,
                    letterSpacing: "0.2em", textTransform: "uppercase",
                    color: "#E8A020",
                  }}>LIVE</span>
                </div>
              )}
            </div>
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Close radio panel"
              style={{
                width: 28, height: 28, borderRadius: "50%",
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.04)",
                color: "#71717A", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 15, lineHeight: 1, flexShrink: 0,
              }}
            >×</button>
          </div>

          {/* ── Now Playing hero ─────────────────────────────────────────── */}
          <div style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ position: "relative", overflow: "hidden", borderRadius: 0 }}>
              {/* Banner photo */}
              {currentStation.banner && (
                <img
                  src={currentStation.banner}
                  alt=""
                  aria-hidden
                  style={{
                    position: "absolute", inset: 0,
                    width: "100%", height: "100%",
                    objectFit: "cover",
                    opacity: 0.35,
                  }}
                />
              )}
              {/* Gradient overlay */}
              <div style={{
                position: "absolute", inset: 0,
                background: "linear-gradient(to bottom, rgba(15,15,26,0.55) 0%, rgba(15,15,26,0.82) 100%)",
              }} />

              {/* Content */}
              <div style={{ position: "relative", zIndex: 1, padding: "16px 16px 12px" }}>
                <div style={{ display: "flex", gap: 14, alignItems: "center" }}>

                  {/* Artwork */}
                  <div style={{
                    position: "relative", width: 62, height: 62, flexShrink: 0,
                    borderRadius: 10,
                    border: "1px solid rgba(232,160,32,0.25)",
                    overflow: "hidden",
                  }}>
                    <img
                      src={currentStation.cover}
                      alt={currentStation.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                    {status === "playing" && (
                      <div style={{
                        position: "absolute", inset: 0,
                        background: "linear-gradient(135deg, rgba(232,160,32,0.18), transparent)",
                      }} />
                    )}
                  </div>

                  {/* Station info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: "var(--font-spectral), Georgia, serif",
                      fontSize: 18, fontWeight: 700,
                      color: "#F4F4F5", letterSpacing: "-0.3px", lineHeight: 1.2,
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>
                      {currentStation.name}
                    </div>
                    <div style={{
                      fontFamily: "var(--font-inter), sans-serif",
                      fontSize: 10.5, color: "#71717A", marginTop: 4, letterSpacing: "0.02em",
                    }}>
                      {meta.genre}
                    </div>
                    <div style={{
                      fontFamily: "var(--font-inter), sans-serif",
                      fontSize: 11, color: "#A1A1AA", marginTop: 3,
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>
                      {trackTitle ? `♪ ${trackTitle}` : meta.tagline}
                    </div>
                  </div>
                </div>

                {/* ── Transport ───────────────────────────────────────────── */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginTop: 18 }}>
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    {/* Buffering ring */}
                    {status === "buffering" && (
                      <div className="rs-spin-ring" style={{
                        position: "absolute", inset: -5,
                        borderRadius: "50%",
                        border: "2px solid transparent",
                        borderTopColor: "#E8A020",
                        borderRightColor: "rgba(232,160,32,0.25)",
                      }} />
                    )}
                    <button
                      onClick={() => playStation(currentStation)}
                      aria-label={transportLabel(status)}
                      style={{
                        width: 52, height: 52, borderRadius: "50%", border: "none",
                        background: status === "error"
                          ? "rgba(239,68,68,0.18)"
                          : "linear-gradient(135deg, #E8A020, #F5B335)",
                        color: status === "error" ? "#EF4444" : "#1a1407",
                        cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: status === "playing"
                          ? "0 0 28px rgba(232,160,32,0.45)"
                          : "0 4px 18px rgba(0,0,0,0.5)",
                        transition: "box-shadow 0.3s, background 0.2s",
                        flexShrink: 0,
                      }}
                    >
                      {status === "buffering" ? (
                        <span style={{ fontSize: 18, opacity: 0.6, letterSpacing: "-1px" }}>···</span>
                      ) : status === "error" ? (
                        <span style={{ fontSize: 20, fontWeight: 700 }}>!</span>
                      ) : status === "playing" ? (
                        <PauseIcon />
                      ) : (
                        <PlayIcon />
                      )}
                    </button>
                  </div>
                </div>

                {/* Status message */}
                <div style={{ textAlign: "center", marginTop: 8, minHeight: 16 }}>
                  {status === "buffering" && (
                    <span style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: 10.5, color: "#71717A", letterSpacing: "0.04em" }}>
                      Συντονισμός…
                    </span>
                  )}
                  {status === "error" && (
                    <span style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: 10.5, color: "#EF4444" }}>
                      Προσωρινά μη διαθέσιμο — tap to retry
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Volume ──────────────────────────────────────────────────── */}
          <div style={{
            padding: "11px 18px",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <button
              onClick={toggleMute}
              aria-label={isMuted ? "Unmute" : "Mute"}
              style={{
                background: "none", border: "none",
                color: isMuted ? "#444" : "#71717A",
                cursor: "pointer", padding: 4,
                display: "flex", alignItems: "center", flexShrink: 0,
                borderRadius: 4, transition: "color 0.2s",
              }}
            >
              <VolumeIcon muted={isMuted} />
            </button>
            <input
              type="range"
              min={0} max={1} step={0.01}
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              aria-label="Volume"
              className="rs-vol-slider"
              style={{ flex: 1, background: sliderBg }}
            />
            <span style={{
              fontFamily: "var(--font-inter), sans-serif",
              fontSize: 9.5, color: "#555",
              minWidth: 26, textAlign: "right",
            }}>
              {isMuted ? "0" : Math.round(volume * 100)}%
            </span>
          </div>

          {/* ── Station list ────────────────────────────────────────────── */}
          <div style={{ padding: "6px 0" }}>
            {STATIONS.map((station) => {
              const active = currentStation.id === station.id;
              const sm = META[station.id] ?? DEFAULT_META;
              return (
                <button
                  key={station.id}
                  onClick={() => { if (!station.comingSoon) playStation(station); }}
                  disabled={!!station.comingSoon}
                  aria-label={`Play ${station.name}${station.comingSoon ? " (coming soon)" : ""}`}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    width: "100%", padding: "9px 18px",
                    background: active ? "rgba(232,160,32,0.07)" : "transparent",
                    border: "none",
                    borderLeft: `3px solid ${active ? "#E8A020" : "transparent"}`,
                    cursor: station.comingSoon ? "default" : "pointer",
                    opacity: station.comingSoon ? 0.42 : 1,
                    textAlign: "left",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    if (!active && !station.comingSoon)
                      e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                  }}
                  onMouseLeave={(e) => {
                    if (!active) e.currentTarget.style.background = "transparent";
                  }}
                >
                  {/* Thumbnail */}
                  <div style={{
                    position: "relative", width: 44, height: 44, flexShrink: 0,
                    borderRadius: 10,
                    border: `1px solid ${active ? "rgba(232,160,32,0.3)" : "rgba(232,160,32,0.2)"}`,
                    overflow: "hidden",
                  }}>
                    <img
                      src={station.cover}
                      alt={station.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                    {active && status === "playing" && (
                      <div style={{
                        position: "absolute", inset: 0,
                        background: "rgba(10,10,18,0.55)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <Equalizer animate bars={3} />
                      </div>
                    )}
                  </div>

                  {/* Name + genre */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: "var(--font-inter), sans-serif",
                      fontSize: 12.5,
                      fontWeight: active ? 600 : 400,
                      color: active ? "#F4F4F5" : "#A1A1AA",
                      lineHeight: 1.3,
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>
                      {station.name}
                    </div>
                    <div style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: 9.5, color: "#555", marginTop: 2 }}>
                      {sm.genre}
                    </div>
                  </div>

                  {/* Right indicator */}
                  {station.comingSoon ? (
                    <span style={{
                      fontSize: 8.5, fontFamily: "var(--font-inter), sans-serif",
                      letterSpacing: "0.1em", color: "#555",
                      background: "rgba(255,255,255,0.05)",
                      padding: "2px 7px", borderRadius: 20, flexShrink: 0,
                      textTransform: "uppercase",
                    }}>
                      ΣΎΝΤΟΜΑ
                    </span>
                  ) : active && (
                    <div style={{ flexShrink: 0 }}>
                      <Equalizer animate={status === "playing"} bars={4} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* ── Footer link ─────────────────────────────────────────────── */}
          <Link
            href="/nightwaves"
            onClick={() => setIsOpen(false)}
            style={{
              display: "block", padding: "10px 18px",
              fontFamily: "var(--font-inter), sans-serif",
              fontSize: 10, letterSpacing: "0.16em",
              textTransform: "uppercase", fontWeight: 600,
              color: "#555", textDecoration: "none",
              borderTop: "1px solid rgba(255,255,255,0.04)",
              textAlign: "center", transition: "color 0.15s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#E8A020"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#555"; }}
          >
            Nightwaves Player →
          </Link>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          COLLAPSED PILL
      ══════════════════════════════════════════════════════════════════ */}
      <div
        className="rs-pill"
        style={{
          position: "relative", height: 44,
          minWidth: 185,
          background: "#12121f",
          border: `1px solid rgba(232,160,32,${isPlaying ? "0.38" : "0.18"})`,
          borderRadius: 9999,
          display: "flex", alignItems: "center",
          padding: "0 6px 0 10px",
          gap: 8,
          boxShadow: isPlaying
            ? "0 0 0 1px rgba(232,160,32,0.07), 0 6px 28px rgba(0,0,0,0.55)"
            : "0 4px 20px rgba(0,0,0,0.5)",
          cursor: "pointer",
          overflow: "clip",
          transition: "border-color 0.3s, box-shadow 0.3s",
        }}
        onClick={openMenu}
      >
        {/* Equalizer / play-toggle zone */}
        <button
          onClick={handlePillPlay}
          aria-label={isPlaying ? "Pause Nightwaves Radio" : "Play Nightwaves Radio"}
          style={{
            background: "none", border: "none", cursor: "pointer",
            padding: "0 3px", display: "flex", alignItems: "center",
            flexShrink: 0, borderRadius: 4,
            minWidth: 22, minHeight: 22,
          }}
        >
          <Equalizer animate={status === "playing"} />
        </button>

        {/* Station name / status text */}
        <span style={{
          flex: 1,
          fontFamily: "var(--font-inter), sans-serif",
          fontSize: 9.5, fontWeight: 600,
          letterSpacing: "0.15em", textTransform: "uppercase",
          color: status === "error" ? "#EF4444"
               : isPlaying        ? "#D4D4D8"
               : "#71717A",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {status === "buffering" ? "Συντονισμός…"
         : status === "error"     ? "Μη διαθέσιμο"
         : isPlaying              ? currentStation.name
         : "Nightwaves"}
        </span>

        {/* Pulsing LIVE dot */}
        {status === "playing" && (
          <div
            className="rs-live-dot"
            style={{ width: 5, height: 5, borderRadius: "50%", background: "#E8A020", flexShrink: 0 }}
          />
        )}

        {/* Menu toggle */}
        <button
          onClick={(e) => { e.stopPropagation(); setIsOpen((o) => !o); }}
          aria-label={isOpen ? "Close radio menu" : "Open radio menu"}
          style={{
            width: 30, height: 30, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(232,160,32,0.07)",
            border: "1px solid rgba(232,160,32,0.2)",
            color: "#E8A020", cursor: "pointer", flexShrink: 0,
            transition: "background 0.15s",
          }}
        >
          {isOpen ? (
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
              <line x1="1.5" y1="1.5" x2="9.5" y2="9.5" />
              <line x1="9.5" y1="1.5" x2="1.5" y2="9.5" />
            </svg>
          ) : (
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
              <line x1="1.5" y1="3"   x2="9.5" y2="3" />
              <line x1="1.5" y1="5.5" x2="9.5" y2="5.5" />
              <line x1="1.5" y1="8"   x2="9.5" y2="8" />
            </svg>
          )}
        </button>
      </div>

      {/* ── Component-scoped CSS ── */}
      <style>{`
        /* Panel entrance */
        @keyframes rsPanelIn {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);   }
        }

        /* Buffering ring spin */
        @keyframes rsSpinRing {
          to { transform: rotate(360deg); }
        }
        .rs-spin-ring {
          animation: rsSpinRing 0.75s linear infinite;
        }

        /* Pulsing LIVE dot */
        @keyframes rsLivePulse {
          0%, 100% { opacity: 1;   transform: scale(1);    }
          50%       { opacity: 0.4; transform: scale(0.82); }
        }
        .rs-live-dot {
          animation: rsLivePulse 1.8s ease-in-out infinite;
        }

        /* Equalizer bars — 5 independent keyframes, staggered */
        @keyframes rsEq0 { 0%,100% { height:4px  } 50%  { height:13px } }
        @keyframes rsEq1 { 0%,100% { height:9px  } 30%  { height:4px  } 70% { height:13px } }
        @keyframes rsEq2 { 0%,100% { height:13px } 40%  { height:5px  } }
        @keyframes rsEq3 { 0%,100% { height:7px  } 60%  { height:13px } }
        @keyframes rsEq4 { 0%,100% { height:4px  } 50%  { height:10px } }
        .eq-b-0 { animation: rsEq0 0.65s ease-in-out infinite;       }
        .eq-b-1 { animation: rsEq1 0.80s ease-in-out infinite 0.10s; }
        .eq-b-2 { animation: rsEq2 0.70s ease-in-out infinite 0.25s; }
        .eq-b-3 { animation: rsEq3 0.88s ease-in-out infinite 0.15s; }
        .eq-b-4 { animation: rsEq4 0.75s ease-in-out infinite 0.05s; }

        /* Volume slider */
        .rs-vol-slider {
          -webkit-appearance: none;
          appearance: none;
          height: 3px;
          border-radius: 2px;
          outline: none;
          cursor: pointer;
        }
        .rs-vol-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 12px; height: 12px;
          border-radius: 50%;
          background: #E8A020;
          cursor: pointer;
          box-shadow: 0 0 6px rgba(232,160,32,0.45);
        }
        .rs-vol-slider::-moz-range-thumb {
          width: 12px; height: 12px;
          border-radius: 50%;
          background: #E8A020;
          cursor: pointer;
          border: none;
          box-shadow: 0 0 6px rgba(232,160,32,0.45);
        }
        /* Focus rings */
        .rs-vol-slider:focus-visible { outline: 2px solid rgba(232,160,32,0.6); outline-offset: 3px; }

        /* Lift pill above MusicPlayerBar on small screens when a track is loaded.
           MusicPlayerBar: bottom = safe-area + 8px, height = 88px → top edge ≈ 96px+.
           We use env(safe-area-inset-bottom) so notched phones are covered too. */
        @media (max-width: 768px) {
          .rs-has-track {
            bottom: calc(env(safe-area-inset-bottom, 0px) + 108px) !important;
          }
        }
      `}</style>
    </div>
  );
}
