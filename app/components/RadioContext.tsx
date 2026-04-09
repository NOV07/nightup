"use client";

import { createContext, useContext, useState, useRef, useCallback, useEffect, ReactNode } from "react";
import { radioStations } from "@/app/lib/data";

type Station = typeof radioStations[number];

interface RadioContextType {
  currentStation: Station;
  isPlaying: boolean;
  volume: number;
  playStation: (station: Station) => void;
  togglePlay: () => void;
  setVolume: (v: number) => void;
}

const RadioContext = createContext<RadioContextType | null>(null);

export function RadioProvider({ children }: { children: ReactNode }) {
  const [currentStation, setCurrentStation] = useState<Station>(radioStations[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(0.8);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Prime the audio element with the default station src on mount.
  // Do NOT call play() here — browsers block autoplay without user gesture.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.src = radioStations[0].streamUrl;
    audio.volume = 0.8;
  }, []);

  const playStation = useCallback((station: Station) => {
    const audio = audioRef.current;
    if (!audio) return;

    if (currentStation.id === station.id) {
      // Same station — just toggle
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        audio.play().catch(() => {});
        setIsPlaying(true);
      }
      return;
    }

    // New station — swap src and play
    audio.src = station.streamUrl;
    audio.volume = volume;
    audio.play().catch(() => {});
    setCurrentStation(station);
    setIsPlaying(true);
  }, [currentStation, isPlaying, volume]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().catch(() => {});
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
    if (audioRef.current) audioRef.current.volume = v;
  }, []);

  return (
    <RadioContext.Provider value={{ currentStation, isPlaying, volume, playStation, togglePlay, setVolume }}>
      <audio ref={audioRef} preload="none" />
      {children}
    </RadioContext.Provider>
  );
}

export function useRadio() {
  const ctx = useContext(RadioContext);
  if (!ctx) throw new Error("useRadio must be used within RadioProvider");
  return ctx;
}
