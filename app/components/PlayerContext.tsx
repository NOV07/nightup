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
  // Normalized URL of the track currently loaded in the hidden iframe (null if none).
  const currentUrlRef = useRef<string | null>(null);
  // Bumped on every load; callbacks from an older iframe compare it and bail out.
  const loadGenRef = useRef(0);

  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  // Register this context's pause callback so RadioContext can pause the SC player
  // without a direct import (which would be circular — RadioProvider is the ancestor).
  useEffect(() => {
    playerPause.fn = () => {
      if (widgetRef.current && isReadyRef.current) widgetRef.current.pause();
    };
    return () => { playerPause.fn = () => {}; };
  }, []);

  // Nothing from SoundCloud is requested at mount. The Widget API script is added the
  // first time play is pressed; every track then gets its own fresh hidden iframe
  // (see loadTrack). React never touches the iframe after creation.
  const ensureScScript = useCallback(() => {
    if (document.getElementById("sc-api-script")) return;
    const s = document.createElement("script");
    s.id = "sc-api-script";
    s.src = "https://w.soundcloud.com/player/api.js";
    s.onload = () => playerDebug("api.js loaded (window.SC.Widget " + ((window as any).SC?.Widget ? "present" : "MISSING") + ")");
    s.onerror = () => playerDebug("api.js FAILED to load");
    document.head.appendChild(s);
    playerDebug("api.js script appended");
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

  // Single load path for every different track: throw away the old iframe and widget,
  // build a new iframe, wait for ITS load event, only then create a new SC.Widget and
  // bind READY once. A READY can't be seen before the load, and a stale callback from a
  // previous iframe is ignored via loadGenRef. widget.load() and widget reuse are not
  // used: a reused wrapper reported READY right after the src change, before the new
  // document existed.
  const loadTrack = useCallback((url: string) => {
    ensureScScript();
    const gen = ++loadGenRef.current;
    playerDebug("loadTrack " + url.slice(0, 60));

    // Discard the previous player. Removing the iframe stops its audio; its widget
    // wrapper is simply dropped (its iframe is gone, so it can't call back).
    iframeRef.current?.remove();
    iframeRef.current = null;
    widgetRef.current = null;
    isReadyRef.current = false;
    currentUrlRef.current = url;

    // src and the load listener are set BEFORE the iframe is inserted, so the only
    // load event it ever fires is the real one (not the initial about:blank).
    const iframe = document.createElement("iframe");
    iframe.id = "sc-hidden-player";
    iframe.allow = "autoplay";
    iframe.style.cssText = "display:none;position:absolute;width:0;height:0;border:0;";
    iframe.src = `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&auto_play=false&visual=false&hide_related=true&show_comments=false&show_teaser=false`;

    let readyHandled = false;
    let iframeLoaded = false;

    const onReady = () => {
      if (gen !== loadGenRef.current || !iframeLoaded || readyHandled) {
        playerDebug("READY ignored (" + (gen !== loadGenRef.current ? "stale iframe" : !iframeLoaded ? "before iframe load" : "duplicate") + ")");
        return;
      }
      readyHandled = true;
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
      if (pending) { playerDebug("READY with pending url, loading it"); loadTrackRef.current(pending); return; }

      isReadyRef.current = true;
      bindPlayerEvents();
      if (volumeRef.current !== null) widget.setVolume(volumeRef.current);
      playerDebug("widget.play() called");
      widget.play();
    };

    const createWidget = (n: number) => {
      if (gen !== loadGenRef.current || n > 120) return;
      const SC = (window as any).SC;
      if (!SC?.Widget) {
        if (n === 0) playerDebug("SC.Widget not available yet, polling");
        setTimeout(() => createWidget(n + 1), 50);
        return;
      }
      try {
        const widget = SC.Widget(iframe);
        widgetRef.current = widget;
        playerDebug("SC widget created");
        widget.bind(SC.Widget.Events.READY, onReady);
        playerDebug("READY handler bound");
      } catch {
        setTimeout(() => createWidget(n + 1), 50);
      }
    };

    iframe.addEventListener("load", () => {
      if (gen !== loadGenRef.current) return;
      iframeLoaded = true;
      playerDebug("iframe load event");
      createWidget(0);
    }, { once: true });

    document.body.appendChild(iframe);
    iframeRef.current = iframe;
    playerDebug("fresh iframe created");
    playerDebug("iframe.src set");
    armErrorTimer();
  }, [ensureScScript, bindPlayerEvents, armErrorTimer]);

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
    // Same track as the one already loaded and the widget is ready: don't reload,
    // just toggle. This covers every caller (bar, mix pages, cards, lists).
    if (track.soundcloudUrl) {
      const url = normalizeSCUrl(track.soundcloudUrl);
      const widget = widgetRef.current;
      if (url === currentUrlRef.current && isReadyRef.current && widget) {
        playerDebug("same track → toggle (" + (isPlayingRef.current ? "pause" : "play") + ")");
        if (isPlayingRef.current) {
          widget.pause();
        } else {
          radioPause.fn();
          widget.play();
        }
        return;
      }
    }
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
    currentUrlRef.current = null;
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
