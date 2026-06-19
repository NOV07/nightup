"use client";

import { createContext, useContext, useState, useRef, useCallback, useEffect, ReactNode } from "react";
import { radioPause, playerPause } from "./audioCoordinator";

export interface PlayerTrack {
  id?: string;
  title: string;
  artist: string;
  cover?: string;
  soundcloudUrl?: string;
  spotifyUrl?: string;
  type: "mix" | "release" | "playlist";
}

interface PlayerContextType {
  currentTrack: PlayerTrack | null;
  isPlaying: boolean;
  volume: number;
  position: number;
  duration: number;
  playbackError: string | null;
  setTrack: (track: PlayerTrack) => void;
  togglePlay: () => void;
  setVolume: (v: number) => void;
  clearTrack: () => void;
  seekTo: (ms: number) => void;
  nextTrack: () => void;
  prevTrack: () => void;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

function normalizeSCUrl(url: string): string {
  if (url.includes("w.soundcloud.com/player")) {
    const m = url.match(/[?&]url=([^&]+)/);
    if (m) return decodeURIComponent(m[1]);
  }
  return url;
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<PlayerTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(80);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const widgetRef = useRef<any>(null);
  const isReadyRef = useRef(false);
  const pendingUrlRef = useRef<string | null>(null);
  const isPlayingRef = useRef(false);
  const lastPosRef = useRef(0);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  // Register this context's pause callback so RadioContext can pause the SC player
  // without a direct import (which would be circular — RadioProvider is the ancestor).
  useEffect(() => {
    playerPause.fn = () => {
      if (widgetRef.current && isReadyRef.current) widgetRef.current.pause();
    };
    return () => { playerPause.fn = () => {}; };
  }, []);

  // Load SC Widget API script once
  useEffect(() => {
    if (document.getElementById("sc-api-script")) return;
    const s = document.createElement("script");
    s.id = "sc-api-script";
    s.src = "https://w.soundcloud.com/player/api.js";
    document.head.appendChild(s);
  }, []);

  // Create hidden iframe once — never touched by React after creation
  useEffect(() => {
    const iframe = document.createElement("iframe");
    iframe.id = "sc-hidden-player";
    iframe.allow = "autoplay";
    iframe.style.cssText = "display:none;position:absolute;width:0;height:0;border:0;";
    document.body.appendChild(iframe);
    iframeRef.current = iframe;
    return () => { iframe.remove(); iframeRef.current = null; };
  }, []);

  const handlePlaybackError = useCallback(() => {
    if (errorTimerRef.current) {
      clearTimeout(errorTimerRef.current);
      errorTimerRef.current = null;
    }
    setPlaybackError("Track unavailable");
    setIsPlaying(false);
  }, []);

  const bindPlayerEvents = useCallback(() => {
    const widget = widgetRef.current;
    const SC = (window as any).SC;
    if (!widget || !SC) return;

    widget.bind(SC.Widget.Events.PLAY, () => {
      setIsPlaying(true);
      widget.getDuration((d: number) => { if (d > 0) setDuration(d); });
    });
    widget.bind(SC.Widget.Events.PAUSE, () => setIsPlaying(false));
    widget.bind(SC.Widget.Events.FINISH, () => { setIsPlaying(false); setPosition(0); });
    widget.bind(SC.Widget.Events.PLAY_PROGRESS, (data: any) => {
      const now = Date.now();
      if (now - lastPosRef.current > 250) {
        setPosition(data.currentPosition);
        lastPosRef.current = now;
      }
    });
    // ERROR event catches bad URLs on widget.load() calls
    try {
      if (SC.Widget.Events.ERROR) {
        widget.bind(SC.Widget.Events.ERROR, () => handlePlaybackError());
      }
    } catch {}
  }, [handlePlaybackError]);

  // Initialize SC widget against a URL.
  // auto_play=false in src + explicit widget.play() inside READY so events bind first.
  const initWidget = useCallback((url: string) => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    isReadyRef.current = false;
    iframe.src = `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&auto_play=false&visual=false&hide_related=true&show_comments=false&show_teaser=false`;

    // 6s timeout: if READY never fires the URL is dead/private
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    errorTimerRef.current = setTimeout(() => {
      if (!isReadyRef.current) handlePlaybackError();
    }, 6000);

    const attempt = (n: number) => {
      if (n > 50) return;
      const SC = (window as any).SC;
      if (!SC?.Widget) { setTimeout(() => attempt(n + 1), 200); return; }
      try {
        const widget = SC.Widget(iframe);
        widgetRef.current = widget;

        widget.bind(SC.Widget.Events.READY, () => {
          if (errorTimerRef.current) {
            clearTimeout(errorTimerRef.current);
            errorTimerRef.current = null;
          }
          isReadyRef.current = true;
          bindPlayerEvents();
          const toPlay = pendingUrlRef.current ?? url;
          pendingUrlRef.current = null;
          if (toPlay !== url) {
            widget.load(toPlay, { auto_play: true, visual: false, hide_related: true, show_comments: false, show_teaser: false });
          } else {
            widget.play();
          }
        });
      } catch {
        setTimeout(() => attempt(n + 1), 200);
      }
    };
    setTimeout(() => attempt(0), 200);
  }, [bindPlayerEvents, handlePlaybackError]);

  const loadSoundcloudUrl = useCallback((rawUrl: string) => {
    radioPause.fn();
    const url = normalizeSCUrl(rawUrl);

    if (!isReadyRef.current) {
      if (!widgetRef.current) {
        initWidget(url);
      } else {
        pendingUrlRef.current = url;
      }
    } else {
      widgetRef.current.load(url, {
        auto_play: true,
        visual: false,
        hide_related: true,
        show_comments: false,
        show_teaser: false,
      });
    }
  }, [initWidget]);

  const setTrack = useCallback((track: PlayerTrack) => {
    setCurrentTrack(track);
    setPlaybackError(null);
    setPosition(0);
    setDuration(0);
    if (track.soundcloudUrl) {
      loadSoundcloudUrl(track.soundcloudUrl);
    }
  }, [loadSoundcloudUrl]);

  const togglePlay = useCallback(() => {
    const widget = widgetRef.current;
    if (!widget) return;
    if (isPlayingRef.current) widget.pause();
    else widget.play();
  }, []);

  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
    if (widgetRef.current) widgetRef.current.setVolume(v);
  }, []);

  const clearTrack = useCallback(() => {
    if (widgetRef.current) widgetRef.current.pause();
    if (errorTimerRef.current) {
      clearTimeout(errorTimerRef.current);
      errorTimerRef.current = null;
    }
    setCurrentTrack(null);
    setIsPlaying(false);
    setPosition(0);
    setDuration(0);
    setPlaybackError(null);
  }, []);

  const seekTo = useCallback((ms: number) => {
    setPosition(ms);
    if (widgetRef.current) widgetRef.current.seekTo(ms);
  }, []);

  const nextTrack = useCallback(() => {
    if (widgetRef.current) widgetRef.current.next();
  }, []);

  const prevTrack = useCallback(() => {
    if (widgetRef.current) widgetRef.current.prev();
  }, []);

  return (
    <PlayerContext.Provider value={{ currentTrack, isPlaying, volume, position, duration, playbackError, setTrack, togglePlay, setVolume, clearTrack, seekTo, nextTrack, prevTrack }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayerStore() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayerStore must be used within PlayerProvider");
  return ctx;
}
