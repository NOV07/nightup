"use client";

import { useRadio } from "../components/RadioContext";
import Image from "next/image";

interface Station {
  id: string;
  name: string;
  genre: string;
  streamUrl: string;
  logo: string;
  description: string;
}

interface Track {
  time: string;
  artist: string;
  track: string;
}

export default function RadioClient({
  stations,
  tracklist,
}: {
  stations: Station[];
  tracklist: Track[];
}) {
  const { currentStation, isPlaying, volume, playStation, togglePlay, setVolume } = useRadio();

  const activeStation = currentStation;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-semibold mb-3">Live from Athens.</h1>
        <p className="text-gray-400">House. Techno. R&amp;B. Always on.</p>
      </div>

      {/* Now Playing */}
      <div
        className="rounded-3xl p-8 mb-8 text-center"
        style={{ background: "linear-gradient(135deg, #1A1A2E, #16213E)", border: "1px solid #E8A020" }}
      >
        {/* Station Logo */}
        <div className="relative w-24 h-24 mx-auto rounded-full overflow-hidden mb-4 ring-4" style={{ outlineColor: "#E8A020" }}>
          <Image src={activeStation.logo} alt={activeStation.name} fill className="object-cover" />
        </div>

        {/* Visualizer */}
        {isPlaying && (
          <div className="flex justify-center items-end gap-1 h-8 mb-4">
            {Array.from({ length: 20 }, (_, i) => (
              <div
                key={i}
                className="w-1 rounded-full"
                style={{
                  backgroundColor: "#E8A020",
                  animation: `visualizer ${0.6 + Math.random() * 0.8}s ease-in-out ${i * 0.05}s infinite`,
                  minHeight: "4px",
                }}
              />
            ))}
          </div>
        )}

        <p className="text-xs tracking-widest uppercase text-gray-400 mb-1">
          {isPlaying && currentStation ? "● LIVE NOW" : "PAUSED"}
        </p>
        <h2 className="text-2xl font-bold mb-1">{activeStation.name}</h2>
        <p className="text-sm text-gray-400 mb-6">{activeStation.genre}</p>

        {/* Controls */}
        <div className="flex items-center justify-center gap-6 mb-6">
          <button
            onClick={() => {
              const idx = stations.findIndex((s) => s.id === activeStation.id);
              const prev = stations[(idx - 1 + stations.length) % stations.length];
              playStation(prev);
            }}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
            </svg>
          </button>

          <button
            onClick={togglePlay}
            className="w-16 h-16 rounded-full flex items-center justify-center transition-transform hover:scale-105"
            style={{ backgroundColor: "#E8A020", color: "#0F0F1A" }}
          >
            {isPlaying ? (
              <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          <button
            onClick={() => {
              const idx = stations.findIndex((s) => s.id === activeStation.id);
              const next = stations[(idx + 1) % stations.length];
              playStation(next);
            }}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 18l8.5-6L6 6v12zm2.5-6l5.5 3.9V8.1L8.5 12zm7.5 6h2V6h-2v12z" />
            </svg>
          </button>
        </div>

        {/* Volume */}
        <div className="flex items-center justify-center gap-3">
          <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z" />
          </svg>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-32 accent-amber-500"
          />
          <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
          </svg>
        </div>
      </div>

      {/* Stations */}
      <div className="mb-10">
        <h2 className="text-lg font-semibold mb-4">All Stations</h2>
        <div className="space-y-3">
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
                <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                  <Image src={s.logo} alt={s.name} fill className="object-cover" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{s.name}</p>
                  <p className="text-sm text-gray-400">{s.genre}</p>
                  <p className="text-xs text-gray-500 line-clamp-1">{s.description}</p>
                </div>

                <div className="flex-shrink-0">
                  {active && isPlaying ? (
                    <span className="flex gap-0.5 items-end h-5">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="w-0.5 rounded-sm"
                          style={{
                            backgroundColor: "#E8A020",
                            animation: `visualizer 0.8s ease-in-out ${i * 0.2}s infinite`,
                            height: "16px",
                          }}
                        />
                      ))}
                    </span>
                  ) : (
                    <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tracklist */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Recent Tracklist</h2>
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #1A1A2E" }}>
          {tracklist.map((t, i) => (
            <div
              key={i}
              className="flex items-center gap-4 px-4 py-3 border-b transition-colors hover:opacity-80"
              style={{
                borderColor: "#1A1A2E",
                backgroundColor: i === 0 ? "#1A1A2E" : i % 2 === 0 ? "#0D0D1F" : "#0F0F1A",
              }}
            >
              <span className="text-xs text-gray-500 w-12 flex-shrink-0">{t.time}</span>
              {i === 0 && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
                  style={{ backgroundColor: "#E8A020", color: "#0F0F1A" }}
                >
                  NOW
                </span>
              )}
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium">{t.artist}</span>
                <span className="text-sm text-gray-400"> · {t.track}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
