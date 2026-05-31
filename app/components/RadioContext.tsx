"use client";

import {
  createContext, useContext, useState, useRef, useCallback, useEffect, ReactNode,
} from "react";

export type RadioStatus = "idle" | "buffering" | "playing" | "paused" | "error";

export interface Station {
  id: string;
  name: string;
  genre: string;
  logo: string;
  description: string;
  streamUrls: string[];
  comingSoon?: boolean;
  zenoUuid?: string; // for Zeno SSE metadata: api.zeno.fm/mounts/metadata/subscribe/{uuid}
}

export const STATIONS: Station[] = [
  {
    id: "house",
    name: "Deep House Ibiza",
    genre: "",
    logo: "",
    description: "",
    streamUrls: [
      "https://radio4.vip-radios.fm:18015/stream-128kmp3-DeepHouseIbiza",
    ],
  },
  {
    id: "techno",
    name: "Minimal & Techno",
    genre: "",
    logo: "",
    description: "",
    streamUrls: ["https://listen.openstream.co/6521/audio"],
  },
  {
    id: "rnb",
    name: "Hip-Hop & R&B",
    genre: "",
    logo: "",
    description: "",
    streamUrls: ["https://playerservices.streamtheworld.com/api/livestream-redirect/977_JAMZ_SC"],
  },
];

export interface CurrentTrack {
  title: string;
  artist: string;
}

interface RadioContextType {
  currentStation: Station;
  status: RadioStatus;
  /** Derived: status === "playing". Kept for backward compat with RadioClient / HomeMiniRadio. */
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  currentTrack: CurrentTrack | null;
  /** Derived: status === "error". Kept for backward compat with RadioClient. */
  streamError: boolean;
  playStation: (station: Station) => void;
  togglePlay: () => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
}

const LS_VOL = "nup_radio_vol";
const LS_STA = "nup_radio_station";
const GLOBAL_TIMEOUT_MS = 12_000;
const URL_TIMEOUT_MS    =  6_000;

const RadioContext = createContext<RadioContextType | null>(null);

export function RadioProvider({ children }: { children: ReactNode }) {
  const [currentStation, setCurrentStation] = useState<Station>(STATIONS[0]);
  const [status, setStatus]     = useState<RadioStatus>("idle");
  const [isMuted, setIsMuted]   = useState(false);
  const [volume, setVolumeState] = useState(0.8);
  const [currentTrack, setCurrentTrack] = useState<CurrentTrack | null>(null);

  // ── Restore from localStorage on mount (no autoplay) ──────────────────────
  useEffect(() => {
    try {
      const sid = localStorage.getItem(LS_STA);
      const found = STATIONS.find((s) => s.id === sid);
      if (found) setCurrentStation(found);
      const vol = parseFloat(localStorage.getItem(LS_VOL) ?? "");
      if (!isNaN(vol)) setVolumeState(Math.max(0, Math.min(1, vol)));
    } catch {}
  }, []);

  useEffect(() => { try { localStorage.setItem(LS_VOL, String(volume));        } catch {} }, [volume]);
  useEffect(() => { try { localStorage.setItem(LS_STA, currentStation.id);     } catch {} }, [currentStation.id]);

  // ── Stable refs (avoid stale closures in async callbacks) ─────────────────
  const audioRef       = useRef<HTMLAudioElement | null>(null);
  const stationRef     = useRef(currentStation);
  const statusRef      = useRef<RadioStatus>("idle");
  const volumeRef      = useRef(0.8);
  const isMutedRef     = useRef(false);
  const globalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const urlTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sseRef         = useRef<EventSource | null>(null);

  useEffect(() => { stationRef.current = currentStation; }, [currentStation]);
  useEffect(() => { statusRef.current  = status;         }, [status]);
  useEffect(() => {
    volumeRef.current = volume;
    if (audioRef.current) audioRef.current.volume = isMutedRef.current ? 0 : volume;
  }, [volume]);

  // Ref to the recursive createAndPlay (avoids stale-closure issues)
  const createAndPlayRef = useRef<(station: Station, urlIndex?: number) => void>(() => {});

  // ── SSE ───────────────────────────────────────────────────────────────────
  const closeSse = useCallback(() => {
    if (sseRef.current) { sseRef.current.close(); sseRef.current = null; }
  }, []);

  const openSse = useCallback((station: Station) => {
    closeSse();
    if (!station.zenoUuid) return;
    const es = new EventSource(
      `https://api.zeno.fm/mounts/metadata/subscribe/${station.zenoUuid}`
    );
    sseRef.current = es;
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        const title: string = data.streamTitle ?? data.title ?? "";
        if (title) setCurrentTrack({ title, artist: station.name });
      } catch {}
    };
    es.onerror = () => closeSse();
  }, [closeSse]);

  // ── Core play engine ──────────────────────────────────────────────────────
  const createAndPlay = useCallback((station: Station, urlIndex = 0) => {
    // Clear per-URL timer first (safe regardless of urlIndex)
    if (urlTimerRef.current) { clearTimeout(urlTimerRef.current); urlTimerRef.current = null; }
    closeSse();

    // Null ref BEFORE pause so stale event listeners see audioRef.current === null
    if (audioRef.current) {
      const prev = audioRef.current;
      audioRef.current = null;
      prev.pause();
      prev.src = "";
    }

    if (urlIndex >= station.streamUrls.length) {
      if (globalTimerRef.current) { clearTimeout(globalTimerRef.current); globalTimerRef.current = null; }
      console.error(`[Radio] ${station.name}: all streams failed`);
      setStatus("error");
      return;
    }

    // Start/reset the 12 s global timeout only on the first URL attempt
    if (urlIndex === 0) {
      if (globalTimerRef.current) { clearTimeout(globalTimerRef.current); globalTimerRef.current = null; }
      globalTimerRef.current = setTimeout(() => {
        globalTimerRef.current = null;
        if (statusRef.current !== "playing") {
          if (urlTimerRef.current) { clearTimeout(urlTimerRef.current); urlTimerRef.current = null; }
          if (audioRef.current) {
            const a = audioRef.current;
            audioRef.current = null;
            a.pause();
            a.src = "";
          }
          console.warn(`[Radio] global timeout: ${station.name}`);
          setStatus("error");
        }
      }, GLOBAL_TIMEOUT_MS);
    }

    setStatus("buffering");
    setCurrentTrack({ title: station.name, artist: station.genre });

    const url   = station.streamUrls[urlIndex];
    const audio = new Audio(url);
    audio.volume   = isMutedRef.current ? 0 : volumeRef.current;
    audioRef.current = audio;

    const tryNext = () => {
      if (urlTimerRef.current) { clearTimeout(urlTimerRef.current); urlTimerRef.current = null; }
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeEventListener("error",   onError);
      createAndPlayRef.current(station, urlIndex + 1);
    };

    const onCanPlay = async () => {
      if (urlTimerRef.current) { clearTimeout(urlTimerRef.current); urlTimerRef.current = null; }
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeEventListener("error",   onError);
      if (audioRef.current !== audio) return; // superseded by a newer call
      try {
        await audio.play();
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          console.warn("[Radio] play() rejected:", err?.name);
          tryNext();
        }
      }
    };

    const onError = () => {
      console.warn(`[Radio] stream error: ${url}`);
      tryNext();
    };

    // Per-URL timeout
    urlTimerRef.current = setTimeout(() => {
      console.warn(`[Radio] url timeout: ${url}`);
      tryNext();
    }, URL_TIMEOUT_MS);

    audio.addEventListener("canplay", onCanPlay, { once: true });
    audio.addEventListener("error",   onError,   { once: true });

    // ── Status-driving events (guarded: only current audio updates state) ──
    audio.addEventListener("loadstart", () => {
      if (audioRef.current === audio && statusRef.current !== "error") setStatus("buffering");
    });
    audio.addEventListener("waiting", () => {
      if (audioRef.current === audio) setStatus("buffering");
    });
    audio.addEventListener("playing", () => {
      if (audioRef.current !== audio) return;
      if (globalTimerRef.current) { clearTimeout(globalTimerRef.current); globalTimerRef.current = null; }
      if (urlTimerRef.current)    { clearTimeout(urlTimerRef.current);    urlTimerRef.current    = null; }
      setStatus("playing");
      openSse(station);
    });
    audio.addEventListener("pause", () => {
      if (audioRef.current === audio && statusRef.current === "playing") setStatus("paused");
    });

    audio.load();
  }, [closeSse, openSse]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { createAndPlayRef.current = createAndPlay; }, [createAndPlay]);

  // ── Public API ────────────────────────────────────────────────────────────
  const playStation = useCallback((station: Station) => {
    if (station.comingSoon) return;

    // Same station: toggle
    if (stationRef.current.id === station.id) {
      if (statusRef.current === "playing") {
        audioRef.current?.pause();
      } else if (audioRef.current) {
        setStatus("buffering");
        audioRef.current.play().catch(() => createAndPlay(station));
      } else {
        createAndPlay(station);
      }
      return;
    }

    // New station
    setCurrentStation(station);
    stationRef.current = station;
    createAndPlay(station);
  }, [createAndPlay]);

  const togglePlay = useCallback(() => {
    const station = stationRef.current;
    if (station.comingSoon) return;

    if (statusRef.current === "playing") {
      audioRef.current?.pause();
    } else if (audioRef.current) {
      setStatus("buffering");
      audioRef.current.play().catch(() => createAndPlay(station));
    } else {
      createAndPlay(station);
    }
  }, [createAndPlay]);

  const setVolume = useCallback((v: number) => {
    const c = Math.max(0, Math.min(1, v));
    setVolumeState(c);
    volumeRef.current = c;
    if (audioRef.current) audioRef.current.volume = isMutedRef.current ? 0 : c;
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      isMutedRef.current = next;
      if (audioRef.current) audioRef.current.volume = next ? 0 : volumeRef.current;
      return next;
    });
  }, []);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (globalTimerRef.current) clearTimeout(globalTimerRef.current);
      if (urlTimerRef.current)    clearTimeout(urlTimerRef.current);
      closeSse();
      if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; }
    };
  }, [closeSse]);

  return (
    <RadioContext.Provider value={{
      currentStation,
      status,
      isPlaying:   status === "playing",
      isMuted,
      volume,
      currentTrack,
      streamError: status === "error",
      playStation,
      togglePlay,
      setVolume,
      toggleMute,
    }}>
      {children}
    </RadioContext.Provider>
  );
}

export function useRadio() {
  const ctx = useContext(RadioContext);
  if (!ctx) throw new Error("useRadio must be used within RadioProvider");
  return ctx;
}
