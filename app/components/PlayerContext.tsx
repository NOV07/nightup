"use client";

import { createContext, useContext, useState, useRef, useCallback, useEffect, ReactNode } from "react";
import { radioPause, playerPause } from "./audioCoordinator";
import PlayerDebugOverlay, { playerDebug } from "./PlayerDebugOverlay"; // TEMP debug, see ?debug=1

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
  // Set once the user moves the slider; re-applied after every track reload.
  const volumeRef = useRef<number | null>(null);
  const loadTrackRef = useRef<(url: string) => void>(() => {});

  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  // Register this context's pause callback so RadioContext can pause the SC player
  // without a direct import (which would be circular — RadioProvider is the ancestor).
  useEffect(() => {
    playerPause.fn = () => {
      if (widgetRef.current && isReadyRef.current) widgetRef.current.pause();
    };
    return () => { playerPause.fn = () => {}; };
  }, []);

  // Nothing from SoundCloud is requested at mount. The Widget API script and the
  // hidden iframe are created the first time play is pressed (see ensureScEmbed).
  // The iframe is never touched by React after creation.
  const ensureScEmbed = useCallback((): HTMLIFrameElement => {
    if (!document.getElementById("sc-api-script")) {
      const s = document.createElement("script");
      s.id = "sc-api-script";
      s.src = "https://w.soundcloud.com/player/api.js";
      s.onload = () => playerDebug("api.js loaded (window.SC.Widget " + ((window as any).SC?.Widget ? "present" : "MISSING") + ")");
      s.onerror = () => playerDebug("api.js FAILED to load");
      document.head.appendChild(s);
      playerDebug("api.js script appended");
    }
    if (!iframeRef.current) {
      const iframe = document.createElement("iframe");
      iframe.id = "sc-hidden-player";
      iframe.allow = "autoplay";
      iframe.style.cssText = "display:none;position:absolute;width:0;height:0;border:0;";
      document.body.appendChild(iframe);
      iframeRef.current = iframe;
      playerDebug("hidden iframe created");
    }
    return iframeRef.current;
  }, []);

  useEffect(() => {
    return () => { iframeRef.current?.remove(); iframeRef.current = null; };
  }, []);

  const handlePlaybackError = useCallback(() => {
    if (errorTimerRef.current) {
      clearTimeout(errorTimerRef.current);
      errorTimerRef.current = null;
    }
    // Leave nothing behind that would make the next click wait for a READY that
    // will never come.
    isReadyRef.current = false;
    pendingUrlRef.current = null;
    setPlaybackError("Track unavailable");
    setIsPlaying(false);
  }, []);

  // 6s watchdog, armed on every track load: if READY never fires the URL is dead/private.
  const armErrorTimer = useCallback(() => {
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    playerDebug("watchdog armed (6s)");
    errorTimerRef.current = setTimeout(() => {
      errorTimerRef.current = null;
      playerDebug("watchdog fired, isReady=" + isReadyRef.current);
      if (!isReadyRef.current) handlePlaybackError();
    }, 6000);
  }, [handlePlaybackError]);

  // Safe to call on every READY: each event is unbound first, so listeners never pile up.
  const bindPlayerEvents = useCallback(() => {
    const widget = widgetRef.current;
    const SC = (window as any).SC;
    if (!widget || !SC) return;

    const E = SC.Widget.Events;
    for (const ev of [E.PLAY, E.PAUSE, E.FINISH, E.PLAY_PROGRESS, E.ERROR]) {
      if (ev) widget.unbind(ev);
    }

    widget.bind(SC.Widget.Events.PLAY, () => {
      playerDebug("PLAY");
      setIsPlaying(true);
      widget.getDuration((d: number) => { if (d > 0) setDuration(d); });
    });
    widget.bind(SC.Widget.Events.PAUSE, () => { playerDebug("PAUSE"); setIsPlaying(false); });
    widget.bind(SC.Widget.Events.FINISH, () => { playerDebug("FINISH"); setIsPlaying(false); setPosition(0); });
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
        widget.bind(SC.Widget.Events.ERROR, () => { playerDebug("ERROR"); handlePlaybackError(); });
      }
    } catch {}
  }, [handlePlaybackError]);

  // Single load path for every track, first one or not: reload the hidden iframe,
  // wait for READY, bind events, then play. widget.load() is not used because
  // nothing re-binds events or re-arms the watchdog after it.
  const loadTrack = useCallback((url: string) => {
    const iframe = ensureScEmbed();

    const onReady = () => {
      playerDebug("READY");
      if (errorTimerRef.current) {
        clearTimeout(errorTimerRef.current);
        errorTimerRef.current = null;
      }
      const widget = widgetRef.current;
      if (!widget) return;

      // The user picked another track while this one was loading: switch to it.
      const pending = pendingUrlRef.current;
      pendingUrlRef.current = null;
      if (pending) { playerDebug("READY with pending url, reloading"); loadTrackRef.current(pending); return; }

      isReadyRef.current = true;
      bindPlayerEvents();
      if (volumeRef.current !== null) widget.setVolume(volumeRef.current);
      playerDebug("widget.play() called");
      widget.play();
    };

    // Re-register READY (unbind first) so a reused widget never holds two handlers.
    const bindReady = () => {
      const SC = (window as any).SC;
      const widget = widgetRef.current;
      if (!SC?.Widget || !widget) return false;
      widget.unbind(SC.Widget.Events.READY);
      widget.bind(SC.Widget.Events.READY, onReady);
      playerDebug("READY handler bound");
      return true;
    };

    playerDebug("loadTrack " + url.slice(0, 60));
    isReadyRef.current = false;
    bindReady(); // widget already exists on later tracks: bind before the iframe reloads
    iframe.src = `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&auto_play=false&visual=false&hide_related=true&show_comments=false&show_teaser=false`;
    playerDebug("iframe.src set");
    armErrorTimer();

    const attempt = (n: number) => {
      if (n > 50) return;
      const SC = (window as any).SC;
      if (!SC?.Widget) { if (n === 0) playerDebug("SC.Widget not available yet, polling"); setTimeout(() => attempt(n + 1), 200); return; }
      try {
        if (!widgetRef.current) { widgetRef.current = SC.Widget(iframe); playerDebug("SC widget created"); }
        else playerDebug("SC widget reused");
        bindReady();
      } catch {
        setTimeout(() => attempt(n + 1), 200);
      }
    };
    setTimeout(() => attempt(0), 200);
  }, [ensureScEmbed, bindPlayerEvents, armErrorTimer]);

  useEffect(() => { loadTrackRef.current = loadTrack; }, [loadTrack]);

  const loadSoundcloudUrl = useCallback((rawUrl: string) => {
    radioPause.fn();
    const url = normalizeSCUrl(rawUrl);

    // A load is in flight (watchdog armed, READY not yet received): remember the
    // latest pick and switch to it on READY. Otherwise start a fresh load, which
    // also recovers from a previous failure.
    if (!isReadyRef.current && errorTimerRef.current) {
      playerDebug("load in flight, url kept as pending");
      pendingUrlRef.current = url;
      return;
    }
    loadTrack(url);
  }, [loadTrack]);

  const setTrack = useCallback((track: PlayerTrack) => {
    setCurrentTrack(track);
    setPlaybackError(null);
    setPosition(0);
    setDuration(0);
    // Don't keep showing "playing" for the previous track while the new one loads.
    setIsPlaying(false);
    isPlayingRef.current = false;
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
    volumeRef.current = v;
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
      <PlayerDebugOverlay />
    </PlayerContext.Provider>
  );
}

export function usePlayerStore() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayerStore must be used within PlayerProvider");
  return ctx;
}
