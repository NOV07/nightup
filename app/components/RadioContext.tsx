"use client";

import {
  createContext, useContext, useState, useRef, useCallback, useEffect, ReactNode,
} from "react";

export interface Station {
  id: string;
  name: string;
  genre: string;
  logo: string;
  description: string;
  streamUrls: string[];
  comingSoon?: boolean;
}

export const STATIONS: Station[] = [
  {
    id: "house",
    name: "House Vibes",
    genre: "",
    logo: "",
    description: "",
    streamUrls: ["https://deeperlink.com:8022/deep"],
  },
  {
    id: "techno",
    name: "Techno Underground",
    genre: "",
    logo: "",
    description: "",
    streamUrls: ["https://stream.zeno.fm/crhcz6q6twzuv"],
  },
  {
    id: "rnb",
    name: "R&B & Soul",
    genre: "",
    logo: "",
    description: "",
    streamUrls: ["https://stream.zeno.fm/1bwpzrn2p5zuv"],
  },
];

export interface CurrentTrack {
  title: string;
  artist: string;
}

interface RadioContextType {
  currentStation: Station;
  isPlaying: boolean;
  volume: number;
  currentTrack: CurrentTrack | null;
  streamError: boolean;
  playStation: (station: Station) => void;
  togglePlay: () => void;
  setVolume: (v: number) => void;
}

const RadioContext = createContext<RadioContextType | null>(null);

export function RadioProvider({ children }: { children: ReactNode }) {
  const [currentStation, setCurrentStation] = useState<Station>(STATIONS[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(0.8);
  const [currentTrack, setCurrentTrack] = useState<CurrentTrack | null>(null);
  const [streamError, setStreamError] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentStationRef = useRef(STATIONS[0]);
  const isPlayingRef = useRef(false);
  const volumeRef = useRef(0.8);

  useEffect(() => { currentStationRef.current = currentStation; }, [currentStation]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { volumeRef.current = volume; }, [volume]);

  const stopCurrent = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
  }, []);

  // Try URLs in order using canplay + 5s timeout
  const createAndPlay = useCallback((station: Station, urlIndex = 0) => {
    stopCurrent();

    if (urlIndex >= station.streamUrls.length) {
      console.error(`[Radio] ${station.name}: all streams failed — tried: ${station.streamUrls.join(", ")}`);
      setStreamError(true);
      setIsPlaying(false);
      return;
    }

    const url = station.streamUrls[urlIndex];
    const audio = new Audio(url);
    audio.volume = volumeRef.current;
    audioRef.current = audio;

    setStreamError(false);
    setCurrentTrack({ title: station.name, artist: station.genre });

    let timer: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (timer) { clearTimeout(timer); timer = null; }
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeEventListener("error", onError);
    };

    const onCanPlay = () => {
      cleanup();
      audio.play().catch(() => createAndPlay(station, urlIndex + 1));
      setIsPlaying(true);
    };

    const onError = () => {
      cleanup();
      console.warn(`[Radio] stream failed: ${url}`);
      createAndPlay(station, urlIndex + 1);
    };

    // 6-second timeout before trying next URL
    timer = setTimeout(() => {
      cleanup();
      console.warn(`[Radio] stream timeout: ${url}`);
      createAndPlay(station, urlIndex + 1);
    }, 6000);

    audio.addEventListener("canplay", onCanPlay, { once: true });
    audio.addEventListener("error", onError, { once: true });
    audio.load();
  }, [stopCurrent]); // eslint-disable-line react-hooks/exhaustive-deps

  const playStation = useCallback((station: Station) => {
    if (station.comingSoon) return;

    if (currentStationRef.current.id === station.id) {
      if (isPlayingRef.current) {
        audioRef.current?.pause();
        setIsPlaying(false);
      } else {
        if (audioRef.current) {
          audioRef.current.play().catch(() => createAndPlay(station));
          setIsPlaying(true);
        } else {
          createAndPlay(station);
        }
      }
      return;
    }

    setCurrentStation(station);
    createAndPlay(station);
  }, [createAndPlay]);

  const togglePlay = useCallback(() => {
    const station = currentStationRef.current;
    if (station.comingSoon) return;

    if (isPlayingRef.current) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      if (audioRef.current) {
        audioRef.current.play().catch(() => createAndPlay(station));
        setIsPlaying(true);
      } else {
        createAndPlay(station);
      }
    }
  }, [createAndPlay]);

  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
    volumeRef.current = v;
    if (audioRef.current) audioRef.current.volume = v;
  }, []);

  useEffect(() => {
    return () => { stopCurrent(); };
  }, [stopCurrent]);

  return (
    <RadioContext.Provider value={{ currentStation, isPlaying, volume, currentTrack, streamError, playStation, togglePlay, setVolume }}>
      {children}
    </RadioContext.Provider>
  );
}

export function useRadio() {
  const ctx = useContext(RadioContext);
  if (!ctx) throw new Error("useRadio must be used within RadioProvider");
  return ctx;
}
