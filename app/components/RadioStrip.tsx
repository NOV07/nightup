"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRadio, STATIONS } from "./RadioContext";

const PILL_BARS = [3, 7, 11, 7, 3];

export default function RadioStrip() {
  const { currentStation, isPlaying, volume, setVolume, playStation, togglePlay } = useRadio();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  const liveStations = STATIONS.filter((s) => !s.comingSoon);

  const CHANNEL_META: Record<string, { genre: string; tint: string }> = {
    house:  { genre: "Deep · Tech · 128 BPM",      tint: "rgba(180,120,20,0.06)" },
    techno: { genre: "Dark · Industrial · 140 BPM", tint: "rgba(20,40,80,0.08)"  },
    rnb:    { genre: "Neo Soul · Funk · 90 BPM",    tint: "rgba(60,20,60,0.08)"  },
  };

  const meta = CHANNEL_META[currentStation.id] ?? { genre: "", tint: "transparent" };

  return (
    <div
      ref={ref}
      className="radio-strip-desktop"
      style={{ position: "fixed", bottom: "24px", right: "24px", zIndex: 500 }}
    >
      {/* ── Expanded panel ── */}
      {isOpen && (
        <div style={{
          position: "absolute", bottom: "52px", right: 0,
          width: "260px",
          background: "#0e0e1c",
          border: "1px solid rgba(232,160,32,0.18)",
          borderRadius: "12px",
          overflow: "hidden",
          boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
          zIndex: 499,
          animation: "panelIn 0.3s cubic-bezier(0.4,0,0.2,1) both",
          transformOrigin: "bottom right",
        }}>
          {/* Header */}
          <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "8px", letterSpacing: "0.2em", textTransform: "uppercase", color: "#71717A" }}>
              Nightwaves Radio
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#E8A020" }} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "8px", letterSpacing: "0.2em", textTransform: "uppercase", color: "#E8A020" }}>
                Live
              </span>
            </div>
          </div>

          {/* Station rows */}
          {liveStations.map((station) => {
            const active = currentStation.id === station.id;
            const stMeta = CHANNEL_META[station.id] ?? { genre: "", tint: "transparent" };
            return (
              <button
                key={station.id}
                onClick={() => { playStation(station); setIsOpen(false); }}
                style={{
                  display: "flex", alignItems: "center",
                  width: "100%", padding: "10px 16px", gap: "12px",
                  background: active ? "rgba(232,160,32,0.05)" : "transparent",
                  border: "none",
                  borderLeft: `2px solid ${active ? "#E8A020" : "transparent"}`,
                  borderBottom: "1px solid rgba(255,255,255,0.03)",
                  cursor: "pointer", outline: "none", textAlign: "left",
                  transition: "all 0.2s",
                }}
              >
                <div style={{
                  width: "20px", height: "20px", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: `1px solid ${active ? "rgba(232,160,32,0.5)" : "rgba(255,255,255,0.1)"}`,
                }}>
                  {active && isPlaying ? (
                    <div style={{ display: "flex", gap: "2px", alignItems: "center" }}>
                      <div className="wave-bar" style={{ height: "7px" }} />
                      <div className="wave-bar" style={{ height: "7px" }} />
                    </div>
                  ) : (
                    <div style={{ width: 0, height: 0, borderTop: "4px solid transparent", borderBottom: "4px solid transparent", borderLeft: `6px solid ${active ? "#E8A020" : "#555"}`, marginLeft: "1px" }} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "12px", color: active ? "#F4F4F5" : "#71717A", lineHeight: 1.3, marginBottom: "2px" }}>
                    {station.name}
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "8px", letterSpacing: "0.06em", textTransform: "uppercase", color: "#444" }}>
                    {stMeta.genre}
                  </div>
                </div>
                {active && isPlaying && (
                  <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                    {[7, 11, 7, 11].map((h, idx) => (
                      <div key={idx} className="wave-bar" style={{ height: `${h}px` }} />
                    ))}
                  </div>
                )}
              </button>
            );
          })}

          {/* Volume control */}
          <div style={{
            padding: "10px 16px",
            borderTop: "1px solid rgba(255,255,255,0.05)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ color: "#444", flexShrink: 0 }}>
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
            </svg>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              style={{
                flex: 1,
                accentColor: "#E8A020",
                cursor: "pointer",
              }}
            />
            <span style={{
              fontFamily: "var(--font-mono)",
              fontSize: "8px",
              color: "#555",
              minWidth: "24px",
              textAlign: "right",
            }}>
              {Math.round(volume * 100)}%
            </span>
          </div>

          {/* Footer */}
          <Link
            href="/nightwaves"
            onClick={() => setIsOpen(false)}
            style={{
              display: "block", padding: "10px 16px",
              fontFamily: "var(--font-mono)", fontSize: "8px",
              letterSpacing: "0.14em", textTransform: "uppercase",
              color: "#71717A", textDecoration: "none",
              borderTop: "1px solid rgba(255,255,255,0.04)",
              textAlign: "center",
            }}
          >
            Full Nightwaves player →
          </Link>
        </div>
      )}

      {/* ── Collapsed pill ── */}
      <div
        style={{
          position: "relative",
          height: "44px",
          width: "200px",
          background: "#0e0e1c",
          border: `1px solid rgba(232,160,32,${isPlaying ? "0.5" : "0.22"})`,
          borderRadius: "9999px",
          display: "flex", alignItems: "center",
          padding: "0 8px 0 14px",
          gap: "10px",
          boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
          cursor: "pointer",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", inset: 0, background: meta.tint, pointerEvents: "none" }} />

        {/* Waveform bars — click to toggle play */}
        <div
          onClick={(e) => { e.stopPropagation(); togglePlay(); }}
          style={{ display: "flex", alignItems: "center", gap: "1.5px", flexShrink: 0, position: "relative" }}
        >
          {PILL_BARS.map((h, i) =>
            isPlaying ? (
              <div key={i} className="wave-bar" style={{ height: `${h}px` }} />
            ) : (
              <div key={i} style={{ width: "2px", height: `${h}px`, background: "rgba(232,160,32,0.25)", borderRadius: "1px" }} />
            )
          )}
        </div>

        {/* Label — click to toggle play */}
        <span
          onClick={(e) => { e.stopPropagation(); togglePlay(); }}
          style={{
            flex: 1,
            fontFamily: "var(--font-mono)", fontSize: "9px",
            letterSpacing: "0.14em", textTransform: "uppercase",
            color: isPlaying ? "#D4D4D8" : "#71717A",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            position: "relative",
          }}
        >
          {isPlaying ? currentStation.name : "Nightwaves"}
        </span>

        {/* Menu toggle button */}
        <button
          onClick={() => setIsOpen((o) => !o)}
          style={{
            width: "32px", height: "32px", borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(232,160,32,0.08)",
            border: "1px solid rgba(232,160,32,0.25)",
            color: "#E8A020", fontSize: "18px", fontWeight: 300,
            cursor: "pointer", flexShrink: 0, lineHeight: 1,
            position: "relative",
          }}
        >
          {isOpen ? "×" : "+"}
        </button>
      </div>
    </div>
  );
}
