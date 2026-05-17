"use client";

import { useRadio, STATIONS } from "../components/RadioContext";
import { useLanguage } from "../components/LanguageContext";

export default function RadioClient() {
  const { t } = useLanguage();
  const { currentStation, isPlaying, volume, streamError, playStation, togglePlay, setVolume } = useRadio();

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-semibold mb-3">{t("radio_hero_title")}</h1>
        <p className="text-gray-400">{t("radio_hero_body")}</p>
      </div>

      {/* Now Playing */}
      <div
        className="rounded-3xl p-8 mb-8 text-center"
        style={{ background: "linear-gradient(135deg, #1A1A2E, #16213E)", border: "1px solid #E8A020" }}
      >
        {/* Station Logo */}
        <div className="relative w-24 h-24 mx-auto rounded-full overflow-hidden mb-4 flex items-center justify-center" style={{ outline: "3px solid #E8A020", background: "linear-gradient(135deg,#1a1a2e,#111120)" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase", color: "#E8A020" }}>
            {currentStation.name.split(" ").map((w: string) => w[0]).join("").slice(0, 3)}
          </span>
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
                  animation: `visualizer ${0.6 + (i % 5) * 0.15}s ease-in-out ${i * 0.05}s infinite`,
                  minHeight: "4px",
                }}
              />
            ))}
          </div>
        )}

        {/* Live / error badge */}
        <div className="flex items-center justify-center gap-2 mb-2">
          {streamError ? (
            <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ backgroundColor: "#3a1010", color: "#f87171", border: "1px solid #f8717140" }}>
              Stream temporarily unavailable
            </span>
          ) : isPlaying ? (
            <span className="flex items-center gap-1.5 text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full" style={{ backgroundColor: "rgba(232,160,32,0.12)", color: "#E8A020", border: "1px solid rgba(232,160,32,0.3)" }}>
              <span className="w-1.5 h-1.5 rounded-full animate-live-pulse" style={{ backgroundColor: "#E8A020" }} />
              Live
            </span>
          ) : (
            <span className="text-xs tracking-widest uppercase text-gray-500">{t("radio_paused")}</span>
          )}
        </div>

        <h2 className="text-2xl font-bold mb-6">{currentStation.name}</h2>

        {/* Controls */}
        <div className="flex items-center justify-center gap-6 mb-6">
          <button
            onClick={() => {
              const live = STATIONS.filter((s) => !s.comingSoon);
              const idx = live.findIndex((s) => s.id === currentStation.id);
              playStation(live[(idx - 1 + live.length) % live.length]);
            }}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Previous station"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
            </svg>
          </button>

          <button
            onClick={togglePlay}
            className="w-16 h-16 rounded-full flex items-center justify-center transition-transform hover:scale-105"
            style={{ backgroundColor: "#E8A020", color: "#0F0F1A" }}
            aria-label={isPlaying ? "Pause" : "Play"}
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
              const live = STATIONS.filter((s) => !s.comingSoon);
              const idx = live.findIndex((s) => s.id === currentStation.id);
              playStation(live[(idx + 1) % live.length]);
            }}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Next station"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 18l8.5-6L6 6v12zm2.5-6 5.5 3.9V8.1L8.5 12zM16 6h2v12h-2V6z" />
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
            aria-label="Volume"
          />
          <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
          </svg>
        </div>
      </div>

      {/* All Stations */}
      <div className="mb-10">
        <h2 className="text-lg font-semibold mb-4">{t("radio_stations")}</h2>
        <div className="space-y-3">
          {STATIONS.map((s) => {
            const active = currentStation.id === s.id;
            if (s.comingSoon) {
              return (
                <div
                  key={s.id}
                  className="flex items-center gap-4 p-4 rounded-xl opacity-40 cursor-default"
                  style={{ backgroundColor: "#16213E", border: "1px solid #222" }}
                >
                  <div className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center" style={{ background: "linear-gradient(135deg,#1a1a2e,#111120)", border: "1px solid rgba(232,160,32,0.15)" }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase", color: "#E8A020" }}>
                      {s.name.split(" ").map((w: string) => w[0]).join("").slice(0, 3)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{s.name}</p>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: "#2a2a3e", color: "#888" }}>
                    {t("radio_coming_soon")}
                  </span>
                </div>
              );
            }
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
                <div className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center" style={{ background: "linear-gradient(135deg,#1a1a2e,#111120)", border: `1px solid ${active ? "rgba(232,160,32,0.4)" : "rgba(232,160,32,0.1)"}` }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase", color: "#E8A020" }}>
                    {s.name.split(" ").map((w: string) => w[0]).join("").slice(0, 3)}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-semibold">{s.name}</p>
                    {active && isPlaying && (
                      <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(232,160,32,0.12)", color: "#E8A020", border: "1px solid rgba(232,160,32,0.25)" }}>
                        <span className="w-1 h-1 rounded-full animate-live-pulse" style={{ backgroundColor: "#E8A020" }} />
                        LIVE
                      </span>
                    )}
                  </div>
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
    </div>
  );
}
