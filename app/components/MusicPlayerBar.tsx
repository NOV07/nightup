"use client";

import Image from "next/image";
import { useRef, useCallback, useEffect, useState } from "react";
import { usePlayerStore } from "./PlayerContext";

const FALLBACK = "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80";

function fmt(ms: number): string {
  if (!ms || isNaN(ms) || ms < 0) return "0:00";
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function MusicPlayerBar() {
  const { currentTrack, isPlaying, volume, position, duration, playbackError, togglePlay, setVolume, clearTrack, seekTo, nextTrack, prevTrack } = usePlayerStore();

  // Auto-dismiss after 3s when there's an error
  useEffect(() => {
    if (!playbackError) return;
    const t = setTimeout(clearTrack, 3000);
    return () => clearTimeout(t);
  }, [playbackError, clearTrack]);
  const barRef = useRef<HTMLDivElement>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!barRef.current || !duration) return;
    const rect = barRef.current.getBoundingClientRect();
    seekTo(Math.floor(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * duration));
  }, [duration, seekTo]);

  if (!currentTrack) return null;

  const pct = duration > 0 ? Math.min((position / duration) * 100, 100) : 0;
  const isSpotifyOnly = !!currentTrack.spotifyUrl && !currentTrack.soundcloudUrl;

  return (
    <div
      className="fixed bottom-[calc(56px+env(safe-area-inset-bottom)+8px)] md:bottom-4 left-4 z-50 w-[calc(100vw-32px)] max-w-[400px] rounded-xl border overflow-hidden"
      style={{
        backgroundColor: "#0A0A14",
        borderColor: "rgba(232,160,32,0.25)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.7)",
        animation: "slideUp 0.2s ease-out",
      }}
    >
      <div className="px-3 flex items-center gap-3 h-[80px]">

        {/* Cover + info */}
        <div className="flex items-center gap-2.5 flex-shrink-0" style={{ width: "clamp(100px, 18%, 180px)" }}>
          <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0" style={{ outline: "1px solid rgba(232,160,32,0.25)" }}>
            <Image src={currentTrack.cover || FALLBACK} alt={currentTrack.title} fill sizes="40px" className="object-cover" />
          </div>
          <div className="min-w-0 hidden sm:block">
            <p className="text-xs font-semibold truncate" style={{ color: "#E8A020" }}>{currentTrack.artist}</p>
            <p className="text-xs truncate" style={{ color: "#bbb" }}>{currentTrack.title}</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex-1 flex flex-col justify-center gap-1.5 min-w-0">
          {playbackError ? (
            <div className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="#E8A020" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <span className="text-xs" style={{ color: "#E8A020" }}>{playbackError}</span>
              <span className="text-xs" style={{ color: "#555" }}>· closing in 3s</span>
            </div>
          ) : isSpotifyOnly ? (
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">Spotify track</span>
              <a href={currentTrack.spotifyUrl} target="_blank" rel="noopener noreferrer"
                className="text-xs font-semibold px-3 py-1 rounded-full transition-opacity hover:opacity-80"
                style={{ backgroundColor: "#1DB954", color: "#fff" }}>
                Open on Spotify →
              </a>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              {(currentTrack?.type === 'playlist' || currentTrack?.type === 'mix') && (
                <button onClick={prevTrack}
                  className="w-7 h-7 flex items-center justify-center flex-shrink-0 transition-opacity hover:opacity-70"
                  style={{ color: "#888" }} aria-label="Previous">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>
                </button>
              )}
              <button onClick={togglePlay}
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-transform hover:scale-105"
                style={{ backgroundColor: "#E8A020", color: "#0F0F1A" }}
                aria-label={isPlaying ? "Pause" : "Play"}>
                {isPlaying ? (
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" /></svg>
                ) : (
                  <svg className="w-3.5 h-3.5 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                )}
              </button>
              {(currentTrack?.type === 'playlist' || currentTrack?.type === 'mix') && (
                <button onClick={nextTrack}
                  className="w-7 h-7 flex items-center justify-center flex-shrink-0 transition-opacity hover:opacity-70"
                  style={{ color: "#888" }} aria-label="Next">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zm2.5-6 6-4.25v8.5L8.5 12zM16 6h2v12h-2z"/></svg>
                </button>
              )}

              <div className="flex-1 flex items-center gap-2 min-w-0">
                <div
                  ref={barRef}
                  onClick={handleSeek}
                  onMouseMove={(e) => {
                    if (!barRef.current || !duration) return;
                    const rect = barRef.current.getBoundingClientRect();
                    const pctHover = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                    setHoverTime(Math.floor(pctHover * duration));
                  }}
                  onMouseLeave={() => setHoverTime(null)}
                  className="flex-1 h-1.5 rounded-full cursor-pointer relative group"
                  style={{ backgroundColor: "#1A1A2E" }}
                >
                  <div className="absolute inset-y-0 left-0 rounded-full"
                    style={{ width: `${pct}%`, backgroundColor: "#E8A020", transition: "width 0.3s" }} />
                  {hoverTime !== null && (
                    <div style={{
                      position: "absolute",
                      bottom: "12px",
                      left: `${pct}%`,
                      transform: "translateX(-50%)",
                      background: "#1A1A2E",
                      border: "1px solid rgba(232,160,32,0.3)",
                      borderRadius: "4px",
                      padding: "2px 6px",
                      fontFamily: "var(--font-mono)",
                      fontSize: "9px",
                      color: "#E8A020",
                      whiteSpace: "nowrap",
                      pointerEvents: "none",
                    }}>
                      {fmt(hoverTime)}
                    </div>
                  )}
                </div>
                <span className="text-xs font-mono flex-shrink-0 tabular-nums" style={{ color: "#555" }}>
                  {duration > 0 ? `${fmt(position)} / ${fmt(duration)}` : "--:--"}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Volume + close */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="hidden md:flex items-center gap-1">
            <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24" style={{ color: "#444" }}>
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
            </svg>
            <input type="range" min={0} max={100} value={volume}
              onChange={(e) => setVolume(parseInt(e.target.value))}
              className="w-14 accent-amber-500" aria-label="Volume" />
          </div>
          <button onClick={clearTrack}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
            style={{ color: "#444" }} aria-label="Close player">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

      </div>
    </div>
  );
}
