"use client";

import { useRadio, STATIONS } from "./RadioContext";
import Link from "next/link";

export default function HomeMiniRadio() {
  const { currentStation, isPlaying, playStation } = useRadio();
  const liveStations = STATIONS.filter((s) => !s.comingSoon);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {liveStations.slice(0, 3).map((s) => {
        const active = currentStation.id === s.id && isPlaying;
        return (
          <button
            key={s.id}
            onClick={() => playStation(s)}
            className="group flex items-center gap-4 p-4 rounded-2xl text-left transition-all duration-300 w-full"
            style={{
              backgroundColor: active ? "#111120" : "rgba(255,255,255,0.02)",
              border: `1px solid ${active ? "#E8A020" : "rgba(255,255,255,0.06)"}`,
              boxShadow: active ? "0 0 32px rgba(232,160,32,0.12), inset 0 0 24px rgba(232,160,32,0.03)" : "none",
              transform: active ? "translateY(-2px)" : "none",
            }}
          >
            {/* Play icon / EQ bars */}
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300"
              style={{
                backgroundColor: active ? "#E8A020" : "rgba(232,160,32,0.08)",
                border: `1.5px solid ${active ? "#E8A020" : "rgba(232,160,32,0.2)"}`,
              }}
            >
              {active ? (
                <span className="flex gap-0.5 items-end h-4">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="w-0.5 rounded-sm"
                      style={{ backgroundColor: "#0F0F1A", animation: `visualizer 0.8s ease-in-out ${i * 0.2}s infinite`, height: "14px" }} />
                  ))}
                </span>
              ) : (
                <svg className="w-4 h-4 ml-0.5 transition-colors" fill="currentColor" viewBox="0 0 24 24"
                  style={{ color: "#E8A020" }}>
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm truncate"
                style={{ color: active ? "#fff" : "rgba(255,255,255,0.8)" }}>{s.name}</p>
              {active && (
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="w-1.5 h-1.5 rounded-full animate-live-pulse" style={{ backgroundColor: "#E8A020" }} />
                  <span className="text-xs font-semibold" style={{ color: "#E8A020" }}>Live</span>
                </div>
              )}
            </div>
          </button>
        );
      })}

      <div className="col-span-full flex justify-end mt-1">
        <Link href="/nightwaves"
          className="group flex items-center gap-1 text-xs font-medium transition-colors hover:text-white"
          style={{ color: "#555" }}>
          Full radio player
          <svg className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
