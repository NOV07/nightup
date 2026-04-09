"use client";

import { useRadio } from "./RadioContext";
import Link from "next/link";

interface Station {
  id: string;
  name: string;
  genre: string;
  streamUrl: string;
  logo: string;
  description: string;
}

export default function HomeMiniRadio({ stations }: { stations: Station[] }) {
  const { currentStation, isPlaying, playStation } = useRadio();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {stations.map((s) => {
        const active = currentStation?.id === s.id;
        return (
          <div
            key={s.id}
            className="flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all"
            style={{
              backgroundColor: active ? "#1A1A2E" : "#16213E",
              border: `1px solid ${active ? "#E8A020" : "#222"}`,
            }}
            onClick={() => playStation(s)}
          >
            {/* Visualizer / Play indicator */}
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: active && isPlaying ? "#E8A020" : "#1A1A2E", border: `2px solid ${active ? "#E8A020" : "#333"}` }}
            >
              {active && isPlaying ? (
                <span className="flex gap-0.5 items-end h-5">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-0.5 rounded-sm"
                      style={{
                        backgroundColor: "#0F0F1A",
                        animation: `visualizer 0.8s ease-in-out ${i * 0.2}s infinite`,
                        height: "16px",
                      }}
                    />
                  ))}
                </span>
              ) : (
                <svg className="w-4 h-4" fill={active ? "#E8A020" : "#666"} viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{s.name}</p>
              <p className="text-xs text-gray-400 truncate">{s.genre}</p>
              {active && isPlaying && (
                <p className="text-xs mt-1" style={{ color: "#E8A020" }}>● Live</p>
              )}
            </div>
          </div>
        );
      })}
      <div className="col-span-full text-right">
        <Link href="/radio" className="text-xs text-gray-500 hover:text-white transition-colors">
          Full radio player →
        </Link>
      </div>
    </div>
  );
}
