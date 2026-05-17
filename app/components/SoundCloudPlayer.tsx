"use client";

import { useRef, useCallback } from "react";
import { usePlayerStore, PlayerTrack } from "./PlayerContext";

function fmt(ms: number): string {
  if (!ms || isNaN(ms) || ms < 0) return "0:00";
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

interface Props {
  track: PlayerTrack;
}

export default function SoundCloudPlayer({ track }: Props) {
  const { currentTrack, isPlaying, volume, position, duration, setTrack, togglePlay, setVolume, seekTo } = usePlayerStore();
  const barRef = useRef<HTMLDivElement>(null);

  const isThis = currentTrack?.soundcloudUrl === track.soundcloudUrl && !!track.soundcloudUrl;
  const thisPlaying = isThis && isPlaying;
  const pos = isThis ? position : 0;
  const dur = isThis ? duration : 0;
  const pct = dur > 0 ? Math.min((pos / dur) * 100, 100) : 0;

  const handlePlay = () => {
    if (isThis) togglePlay();
    else setTrack(track);
  };

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!barRef.current) return;
    const rect = barRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    if (isThis && dur > 0) seekTo(Math.floor(ratio * dur));
    else setTrack(track);
  }, [isThis, dur, seekTo, setTrack, track]);

  const validSoundCloudUrl =
    track.soundcloudUrl &&
    /^https?:\/\/(www\.)?soundcloud\.com\/.+/.test(track.soundcloudUrl.trim())
      ? track.soundcloudUrl.trim()
      : null;

  // Invalid or missing SC URL — fall through to Spotify or null
  if (!validSoundCloudUrl && track.spotifyUrl) {
    return (
      <div className="rounded-2xl p-5 flex items-center justify-between gap-4 flex-wrap"
        style={{ backgroundColor: "#0a0a14", border: "1px solid #1e1e30" }}>
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 flex-shrink-0" fill="#1DB954" viewBox="0 0 24 24">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
          </svg>
          <span className="text-sm text-gray-400">Available on Spotify</span>
        </div>
        <a href={track.spotifyUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
          style={{ backgroundColor: "#1DB954", color: "#fff" }}>
          Open on Spotify →
        </a>
      </div>
    );
  }

  if (!validSoundCloudUrl) return null;


  return (
    <div className="rounded-2xl p-5"
      style={{ backgroundColor: "#0a0a14", border: "1px solid rgba(232,160,32,0.15)" }}>
      <div className="flex items-center gap-4">
        {/* Play/Pause */}
        <button onClick={handlePlay}
          className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 transition-all hover:scale-105"
          style={{ backgroundColor: thisPlaying ? "#E8A020" : "#111120", color: thisPlaying ? "#0F0F1A" : "#E8A020", border: "1px solid #E8A020" }}
          aria-label={thisPlaying ? "Pause" : "Play"}>
          {thisPlaying ? (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" /></svg>
          ) : (
            <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
          )}
        </button>

        {/* Progress + time */}
        <div className="flex-1 flex flex-col gap-2 min-w-0">
          <div ref={barRef} onClick={handleSeek}
            className="w-full h-1.5 rounded-full cursor-pointer relative overflow-hidden group"
            style={{ backgroundColor: "#1A1A2E" }}>
            <div className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-300"
              style={{ width: `${pct}%`, backgroundColor: "#E8A020" }} />
            <div className="absolute inset-y-0 w-0.5 bg-white/30 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
              style={{ left: `${pct}%` }} />
          </div>
          <div className="flex justify-between">
            <span className="text-xs font-mono" style={{ color: "#555" }}>{fmt(pos)}</span>
            <span className="text-xs font-mono" style={{ color: "#444" }}>{dur > 0 ? fmt(dur) : "--:--"}</span>
          </div>
        </div>

        {/* Volume */}
        <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" style={{ color: "#444" }}>
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
          </svg>
          <input type="range" min={0} max={100} value={volume}
            onChange={(e) => setVolume(parseInt(e.target.value))}
            className="w-20 accent-amber-500" aria-label="Volume" />
        </div>

        {/* SC link */}
        <a href={track.soundcloudUrl} target="_blank" rel="noopener noreferrer"
          className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-lg transition-opacity hover:opacity-80"
          style={{ backgroundColor: "#FF5500", color: "#fff" }} title="Open on SoundCloud">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M1.175 12.225c-.042 0-.083.006-.124.012l-.23-1.278.23-1.241c.041.006.082.012.124.012.258 0 .467-.209.467-.467s-.209-.467-.467-.467c-.262 0-.467.205-.467.467l.23 2.974-.23 2.975c0 .262.205.467.467.467s.467-.205.467-.467-.209-.467-.467-.467zm1.875 0c.261 0 .467-.205.467-.467s-.206-.467-.467-.467-.467.205-.467.467.206.467.467.467zm1.875 0c.261 0 .467-.205.467-.467s-.206-.467-.467-.467-.467.205-.467.467.206.467.467.467zm1.872 0c.261 0 .467-.205.467-.467s-.206-.467-.467-.467-.467.205-.467.467.206.467.467.467zM12 6c-3.313 0-6 2.687-6 6s2.687 6 6 6 6-2.687 6-6-2.687-6-6-6zm0 11c-2.761 0-5-2.239-5-5s2.239-5 5-5 5 2.239 5 5-2.239 5-5 5zm6-5c0 .261.205.467.467.467s.467-.206.467-.467-.205-.467-.467-.467-.467.206-.467.467zm1.875 0c0 .261.205.467.467.467s.467-.206.467-.467-.205-.467-.467-.467-.467.206-.467.467zm1.875-3.75c-.261 0-.467.206-.467.467s.206.467.467.467c.262 0 .467-.205.467-.467s-.205-.467-.467-.467zm0 7.5c-.261 0-.467.205-.467.467s.206.467.467.467c.262 0 .467-.206.467-.467s-.205-.467-.467-.467z" />
          </svg>
        </a>
      </div>
    </div>
  );
}
