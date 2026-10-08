"use client";

// TEMPORARY debug aid for the global player (branch claude/fix-global-player-track-switch).
// Invisible and inert unless the URL has ?debug=1. Remove before merging.

import { useEffect, useState } from "react";

interface Entry { t: number; label: string }

const MAX_ENTRIES = 60;
const entries: Entry[] = [];
const listeners = new Set<() => void>();
let enabled = false;

export function playerDebug(label: string) {
  if (!enabled) return;
  entries.push({ t: Date.now(), label });
  if (entries.length > MAX_ENTRIES) entries.shift();
  listeners.forEach((l) => l());
}

const clock = (t: number) => new Date(t).toISOString().slice(11, 23);

export default function PlayerDebugOverlay() {
  const [on, setOn] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    // Once enabled it stays on for the session, so it survives client-side navigation
    // (which drops the query string).
    if (new URLSearchParams(window.location.search).get("debug") === "1") enabled = true;
    if (!enabled) return;
    setOn(true);

    const rerender = () => setTick((n) => n + 1);
    listeners.add(rerender);
    rerender();

    // Raw messages from the SoundCloud widget iframe. A "ready" here that is not followed
    // by READY below means the Widget wrapper was not listening yet.
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== "https://w.soundcloud.com") return;
      let method = "?";
      try {
        const d = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        method = String(d?.method ?? "?");
      } catch {}
      if (/progress/i.test(method)) return;
      playerDebug(`raw SC message: ${method}`);
    };
    window.addEventListener("message", onMessage);

    return () => {
      listeners.delete(rerender);
      window.removeEventListener("message", onMessage);
    };
  }, []);

  if (!on) return null;

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 2147483647,
        maxHeight: "35vh",
        overflowY: "auto",
        padding: "6px 8px",
        background: "rgba(0,0,0,0.85)",
        color: "#7CFC9A",
        font: "11px/1.35 ui-monospace, Menlo, monospace",
        pointerEvents: "none",
      }}
    >
      <div style={{ color: "#E8A020" }}>player debug (?debug=1)</div>
      {entries.map((e, i) => (
        <div key={i}>
          {clock(e.t)} {i > 0 ? `(+${e.t - entries[i - 1].t}ms)` : ""} {e.label}
        </div>
      ))}
    </div>
  );
}
