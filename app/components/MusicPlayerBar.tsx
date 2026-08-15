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

  // Expanded (Spotify/SoundCloud-style) view — pure UI state, local to this
  // component so PlayerContext (playback logic) stays untouched.
  const [isExpanded, setIsExpanded] = useState(false);

  // Auto-dismiss after 3s when there's an error
  useEffect(() => {
    if (!playbackError) return;
    const t = setTimeout(clearTrack, 3000);
    return () => clearTimeout(t);
  }, [playbackError, clearTrack]);

  // A track closing should always drop back to mini — otherwise the next
  // track picked would open already-expanded from stale state.
  useEffect(() => {
    if (!currentTrack) setIsExpanded(false);
  }, [currentTrack]);

  const barRef = useRef<HTMLDivElement>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);

  const seekFromClientX = useCallback((clientX: number) => {
    if (!barRef.current || !duration) return;
    const rect = barRef.current.getBoundingClientRect();
    seekTo(Math.floor(Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * duration));
  }, [duration, seekTo]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    seekFromClientX(e.clientX);
  }, [seekFromClientX]);

  // Drag-to-seek on touch — mirrors handleSeek, but touch has no hover state
  // to preview against, so this seeks live as the finger moves.
  const handleTouchSeek = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    if (!touch) return;
    e.preventDefault();
    seekFromClientX(touch.clientX);
  }, [seekFromClientX]);

  // Tap anywhere on the mini bar (outside play/close, which stopPropagation)
  // expands the player. Desktop already has comfortable space in the mini
  // bar, so expand is a mobile-only affordance.
  const handleContainerClick = useCallback(() => {
    if (typeof window !== "undefined" && window.innerWidth > 768) return;
    setIsExpanded(true);
  }, []);

  if (!currentTrack) return null;

  const pct = duration > 0 ? Math.min((position / duration) * 100, 100) : 0;
  const isSpotifyOnly = !!currentTrack.spotifyUrl && !currentTrack.soundcloudUrl;
  const hasSiblings = currentTrack?.type === 'playlist' || currentTrack?.type === 'mix';

  return (
    <div
      onClick={handleContainerClick}
      className={`fixed left-4 z-50 w-[calc(100vw-32px)] max-w-[560px] rounded-xl border overflow-hidden transition-[height] duration-300 ease-out ${
        isExpanded ? "h-[520px] max-h-[calc(100vh-100px)] md:h-[88px]" : "h-[88px]"
      }`}
      style={{
        bottom: "calc(env(safe-area-inset-bottom) + 8px)",
        backgroundColor: "#0A0A14",
        borderColor: "rgba(232,160,32,0.25)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.7)",
        animation: "slideUp 0.2s ease-out",
        cursor: isExpanded ? "default" : "pointer",
      }}
    >
      {isExpanded ? (
        /* ══════════════════════════════════════════════════════════════
           EXPANDED — mobile only (md: collapses back to the mini bar
           via the height override above, so this content is simply
           clipped/unreachable on desktop rather than needing its own
           desktop layout).
        ══════════════════════════════════════════════════════════════ */
        <div className="h-full flex flex-col overflow-y-auto">
          {/* Header — collapse (chevron) vs close (X) are kept visually
              distinct so collapsing back to mini is never confused with
              stopping playback entirely. */}
          <div className="flex items-center justify-between px-2 pt-2 flex-shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}
              aria-label="Collapse player"
              className="w-11 h-11 rounded-full flex items-center justify-center transition-colors hover:bg-white/10 text-white/60"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); clearTrack(); }}
              aria-label="Close player"
              className="w-11 h-11 rounded-full flex items-center justify-center transition-colors hover:bg-white/10 text-white/50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Album art */}
          <div className="flex justify-center px-8 pt-2 pb-4 flex-shrink-0">
            <div
              className="relative w-[min(280px,60vw)] aspect-square rounded-2xl overflow-hidden"
              style={{ outline: "1px solid rgba(232,160,32,0.25)" }}
            >
              <Image src={currentTrack.cover || FALLBACK} alt={currentTrack.title} fill sizes="280px" className="object-cover" />
            </div>
          </div>

          {/* Artist / title */}
          <div className="text-center px-6 flex-shrink-0">
            <p className="text-base font-semibold truncate" style={{ color: "#E8A020" }}>{currentTrack.artist}</p>
            <p className="text-sm truncate mt-1" style={{ color: "#bbb" }}>{currentTrack.title}</p>
          </div>

          {playbackError ? (
            <div className="flex items-center justify-center gap-2 mt-6 px-6">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="#E8A020" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <span className="text-sm" style={{ color: "#E8A020" }}>{playbackError}</span>
            </div>
          ) : isSpotifyOnly ? (
            <div className="flex flex-col items-center gap-3 mt-6 px-6">
              <span className="text-sm text-gray-500">Spotify track</span>
              <a href={currentTrack.spotifyUrl} target="_blank" rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-sm font-semibold px-4 py-2 rounded-full transition-opacity hover:opacity-80"
                style={{ backgroundColor: "#1DB954", color: "#fff" }}>
                Open on Spotify →
              </a>
            </div>
          ) : (
            <>
              {/* Scrubber */}
              <div className="px-6 mt-6 flex-shrink-0">
                <div
                  onClick={(e) => { e.stopPropagation(); handleSeek(e); }}
                  onMouseMove={(e) => {
                    if (!barRef.current || !duration) return;
                    const rect = barRef.current.getBoundingClientRect();
                    const pctHover = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                    setHoverTime(Math.floor(pctHover * duration));
                  }}
                  onMouseLeave={() => setHoverTime(null)}
                  onTouchStart={handleTouchSeek}
                  onTouchMove={handleTouchSeek}
                  className="cursor-pointer relative"
                  style={{ padding: "10px 0" }}
                >
                  <div ref={barRef} className="rounded-full relative h-5" style={{ backgroundColor: "#1A1A2E" }}>
                    <div className="absolute inset-y-0 left-0 rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: "#E8A020", boxShadow: "0 0 6px rgba(232,160,32,0.4)", transition: "width 0.3s" }} />
                    {duration > 0 && (
                      <div style={{
                        position: "absolute", top: "50%", left: `${pct}%`,
                        transform: "translate(-50%, -50%)", width: "16px", height: "16px",
                        borderRadius: "50%", backgroundColor: "#E8A020",
                        boxShadow: "0 0 8px rgba(232,160,32,0.6)", pointerEvents: "none",
                        transition: "left 0.3s",
                      }} />
                    )}
                    {hoverTime !== null && (
                      <div style={{
                        position: "absolute", bottom: "18px", left: `${pct}%`,
                        transform: "translateX(-50%)", background: "#1A1A2E",
                        border: "1px solid rgba(232,160,32,0.3)", borderRadius: "4px",
                        padding: "2px 6px", fontFamily: "var(--font-mono)", fontSize: "10px",
                        color: "#E8A020", whiteSpace: "nowrap", pointerEvents: "none",
                      }}>
                        {fmt(hoverTime)}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs font-mono tabular-nums" style={{ color: "#555" }}>{fmt(position)}</span>
                  <span className="text-xs font-mono tabular-nums" style={{ color: "#555" }}>{duration > 0 ? fmt(duration) : "--:--"}</span>
                </div>
              </div>

              {/* Transport */}
              <div className="flex items-center justify-center gap-6 mt-4 pb-4 flex-shrink-0">
                {hasSiblings && (
                  <button onClick={(e) => { e.stopPropagation(); prevTrack(); }}
                    className="w-11 h-11 flex items-center justify-center transition-opacity hover:opacity-70"
                    style={{ color: "#888" }} aria-label="Previous">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>
                  </button>
                )}
                <button onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                  className="w-16 h-16 rounded-full flex items-center justify-center transition-transform hover:scale-105"
                  style={{ backgroundColor: "#E8A020", color: "#0F0F1A" }}
                  aria-label={isPlaying ? "Pause" : "Play"}>
                  {isPlaying ? (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" /></svg>
                  ) : (
                    <svg className="w-7 h-7 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                  )}
                </button>
                {hasSiblings && (
                  <button onClick={(e) => { e.stopPropagation(); nextTrack(); }}
                    className="w-11 h-11 flex items-center justify-center transition-opacity hover:opacity-70"
                    style={{ color: "#888" }} aria-label="Next">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zm2.5-6 6-4.25v8.5L8.5 12zM16 6h2v12h-2z"/></svg>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      ) : (
        /* ══════════════════════════════════════════════════════════════
           MINI — unchanged from the layout-overflow fix.
        ══════════════════════════════════════════════════════════════ */
        <div className="px-4 flex items-center gap-3 h-[88px]">

          {/* Cover + info — 88px on mobile so it doesn't crowd out the controls
              block once the close button also needs 44px there; 120px from md:. */}
          <div className="flex items-center gap-2 flex-shrink-0 w-[88px] md:w-[120px]">
            <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0" style={{ outline: "1px solid rgba(232,160,32,0.25)" }}>
              <Image src={currentTrack.cover || FALLBACK} alt={currentTrack.title} fill sizes="40px" className="object-cover" />
            </div>
            <div className="min-w-0 max-w-[40px] md:max-w-[72px]">
              <p className="text-xs font-semibold truncate" style={{ color: "#E8A020" }}>{currentTrack.artist}</p>
              <p className="text-xs truncate" style={{ color: "#bbb" }}>{currentTrack.title}</p>
            </div>
          </div>

          {/* Controls — flex-1 */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: "6px", minWidth: 0 }}>
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
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs font-semibold px-3 py-1 rounded-full transition-opacity hover:opacity-80"
                  style={{ backgroundColor: "#1DB954", color: "#fff" }}>
                  Open on Spotify →
                </a>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                {hasSiblings && (
                  <button onClick={(e) => { e.stopPropagation(); prevTrack(); }}
                    className="hidden min-[420px]:flex w-7 h-7 items-center justify-center flex-shrink-0 transition-opacity hover:opacity-70"
                    style={{ color: "#888" }} aria-label="Previous">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>
                  </button>
                )}
                <button onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-transform hover:scale-105"
                  style={{ backgroundColor: "#E8A020", color: "#0F0F1A" }}
                  aria-label={isPlaying ? "Pause" : "Play"}>
                  {isPlaying ? (
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" /></svg>
                  ) : (
                    <svg className="w-3.5 h-3.5 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                  )}
                </button>
                {hasSiblings && (
                  <button onClick={(e) => { e.stopPropagation(); nextTrack(); }}
                    className="hidden min-[420px]:flex w-7 h-7 items-center justify-center flex-shrink-0 transition-opacity hover:opacity-70"
                    style={{ color: "#888" }} aria-label="Next">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zm2.5-6 6-4.25v8.5L8.5 12zM16 6h2v12h-2z"/></svg>
                  </button>
                )}

                <div className="min-w-[60px] md:min-w-[120px]" style={{ flex: 1, display: "flex", alignItems: "center", gap: "8px" }}>
                  {/* Vertical padding here gives touch a bigger "fat finger" hit
                      area than the visual bar inside it — the bar itself stays
                      thin, but taps/drags a few px above or below it still seek. */}
                  <div
                    onClick={(e) => { e.stopPropagation(); handleSeek(e); }}
                    onMouseMove={(e) => {
                      if (!barRef.current || !duration) return;
                      const rect = barRef.current.getBoundingClientRect();
                      const pctHover = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                      setHoverTime(Math.floor(pctHover * duration));
                    }}
                    onMouseEnter={e => { const bar = barRef.current; if (bar) bar.style.height = "12px"; }}
                    onMouseLeave={() => {
                      const bar = barRef.current;
                      if (bar) bar.style.height = "";
                      setHoverTime(null);
                    }}
                    onTouchStart={handleTouchSeek}
                    onTouchMove={handleTouchSeek}
                    className="flex-1 cursor-pointer relative group"
                    style={{ padding: "8px 0" }}
                  >
                    <div
                      ref={barRef}
                      className="rounded-full relative h-3.5 md:h-2.5"
                      style={{ backgroundColor: "#1A1A2E", transition: "height 0.15s" }}
                    >
                      <div className="absolute inset-y-0 left-0 rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: "#E8A020", boxShadow: "0 0 6px rgba(232,160,32,0.4)", transition: "width 0.3s" }} />
                      {duration > 0 && (
                        <div style={{
                          position: "absolute",
                          top: "50%",
                          left: `${pct}%`,
                          transform: "translate(-50%, -50%)",
                          width: "10px",
                          height: "10px",
                          borderRadius: "50%",
                          backgroundColor: "#E8A020",
                          boxShadow: "0 0 8px rgba(232,160,32,0.6)",
                          pointerEvents: "none",
                          transition: "left 0.3s",
                        }} />
                      )}
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
                  </div>
                  <span className="hidden sm:inline text-xs font-mono flex-shrink-0 tabular-nums" style={{ color: "#555" }}>
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
                onClick={(e) => e.stopPropagation()}
                className="w-14 accent-amber-500" aria-label="Volume" />
            </div>
            <button onClick={(e) => { e.stopPropagation(); clearTrack(); }}
              className="w-11 h-11 md:w-7 md:h-7 rounded-full flex items-center justify-center transition-colors hover:bg-white/10 text-white/50 md:text-[#444]"
              aria-label="Close player">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
