"use client";

import { useRadio, STATIONS } from "./RadioContext";

export default function MiniPlayer() {
  const { currentStation, isPlaying, volume, streamError, playStation, togglePlay, setVolume } = useRadio();

  const activeStations = STATIONS.filter((s) => !s.comingSoon);

  return (
    <div
      className="fixed bottom-14 md:bottom-0 left-0 right-0 z-[52] border-t"
      style={{ backgroundColor: "#1A1A2E", borderColor: "#E8A020" }}
    >
      <div className="max-w-7xl mx-auto px-3 py-2 flex items-center gap-3">

        {/* Status / genre */}
        <div className="flex-1 min-w-0 hidden sm:flex items-center gap-2 overflow-hidden">
          {streamError ? (
            <span className="text-xs text-red-400 truncate">Stream unavailable</span>
          ) : isPlaying ? (
            <>
              <span className="flex gap-0.5 items-end h-4 flex-shrink-0">
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
              <span className="flex items-center gap-1 flex-shrink-0">
                <span className="w-1.5 h-1.5 rounded-full animate-live-pulse" style={{ backgroundColor: "#E8A020" }} />
                <span className="text-xs font-bold" style={{ color: "#E8A020" }}>LIVE</span>
              </span>
            </>
          ) : null}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={togglePlay}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:opacity-80"
            style={{ backgroundColor: "#E8A020", color: "#0F0F1A" }}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          <div className="hidden sm:flex items-center gap-2">
            <svg className="w-3 h-3 text-gray-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
            </svg>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-16 accent-amber-500"
              aria-label="Volume"
            />
          </div>
        </div>

      </div>
    </div>
  );
}
