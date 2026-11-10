"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLanguage } from "../components/LanguageContext";
import {
  clearAllFilters, clearGroupFilters, hasFilters, mapContext, parseFilters, parseOpenGroup, resolvePoints, serializeFilters,
  setNight, setSpotStatus, showGroup, toggleEventGenre, toggleEventType, toggleGroupHidden, toggleMapCategory, toggleMapSub, toggleWellnessSub,
  type GroupKey, type MapFilters, type MapPoint,
} from "../lib/mapFilters";
import { DAY_NAMES } from "../lib/openingHours";
import { weekdayIndex } from "../lib/dateKey";
import { useAthensNow } from "../lib/useAthensNow";
import { MapDateBar, MapGroupBar, MapGroupPanel, MapLegend, type PanelHandlers } from "./MapFilterPanel";
import MapCard from "./MapCard";

// Leaflet touches `window`, so the map itself only loads in the browser.
const PublicMap = dynamic(() => import("@/components/maps/PublicMap"), {
  ssr: false,
  loading: () => <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "#12121F" }} />,
});

const CSS = `
.nm-root { background: #0F0F1A; color: #fff; display: flex; flex-direction: column; min-height: min(calc(100dvh - 60px), 1000px); }
.nm-crumb { flex: none; display: flex; align-items: center; gap: 8px; padding: 12px 16px 10px; font-size: 14px; color: #A9ABC0; }
.nm-crumb a { color: #A9ABC0; text-decoration: none; display: inline-flex; align-items: center; min-height: 24px; }
.nm-crumb a:hover { color: #fff; }
.nm-controls { flex: none; display: flex; flex-direction: column; gap: 8px; padding: 0 16px 10px; max-width: 792px; width: 100%; box-sizing: border-box; }
.nm-panel { flex: none; max-height: 38vh; overflow-y: auto; box-sizing: border-box; padding: 10px 16px 12px; }
.nm-body { flex: 1; min-height: 300px; display: flex; padding: 0 16px; }
.nm-stage { flex: 1; min-width: 0; position: relative; isolation: isolate; border-radius: 8px; overflow: hidden; background: #12121F; border: 1px solid #1E1E32; }
.nm-count { position: absolute; z-index: 1000; left: 10px; top: 10px; max-width: calc(100% - 72px); box-sizing: border-box; padding: 6px 10px; border-radius: 8px; background: rgba(15,15,26,0.92); border: 1px solid #3A3A55; font-size: 12px; line-height: 1.35; color: #fff; pointer-events: none; }
.nm-legend { flex: none; list-style: none; margin: 0; padding: 10px 16px 14px; display: flex; flex-wrap: wrap; gap: 6px 14px; font-size: 12px; color: #A9ABC0; }
.nm-legend li { display: inline-flex; align-items: center; gap: 6px; }
.nm-card { position: absolute; z-index: 1100; left: 20px; bottom: 20px; width: 340px; max-width: calc(100% - 40px); max-height: calc(100% - 40px); overflow-y: auto; box-sizing: border-box; background: #1A1A28; border-radius: 8px; padding: 16px; box-shadow: 0 8px 24px rgba(0,0,0,0.45); outline: none; }
.nm-card-handle { display: none; }
.nm-card-close { position: absolute; top: 8px; right: 8px; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; background: transparent; border: 0; color: #A9ABC0; cursor: pointer; }
.nm-card-close:hover { color: #fff; }
.nm-cta { margin-top: 14px; display: flex; align-items: center; justify-content: center; width: 100%; min-height: 44px; box-sizing: border-box; border-radius: 8px; background: #E8A020; color: #0F0F1A; font-size: 15px; font-weight: 600; text-decoration: none; }
.nm-overlay { position: absolute; z-index: 1050; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(320px, calc(100% - 32px)); box-sizing: border-box; background: #1A1A28; border-radius: 8px; padding: 20px; text-align: center; box-shadow: 0 8px 24px rgba(0,0,0,0.45); }
.nm-overlay p { margin: 0; font-size: 15px; color: #D5D6E3; }
.nm-overlay button { margin-top: 14px; min-height: 44px; padding: 0 18px; border-radius: 8px; border: 1px solid #3A3A55; background: transparent; color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; }
.nm-root button:focus-visible, .nm-root a:focus-visible, .nm-root input:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
@media (min-width: 768px) {
  .nm-controls, .nm-legend { padding-left: 32px; padding-right: 32px; }
  .nm-panel { padding-left: 32px; padding-right: 32px; max-width: 792px; box-sizing: border-box; border-radius: 0 0 8px 8px; }
  .nm-body { padding: 0 32px; }
}
@media (max-width: 767px) {
  .nm-crumb { padding: 8px 16px; }
  .nm-body { padding: 0; }
  .nm-stage { border-radius: 0; border-left: 0; border-right: 0; }
  .nm-panel { max-height: 42vh; }
  /* The site's player pill and nav sit over the bottom of the page: keep the legend clear of them. */
  .nm-legend { padding-bottom: 76px; }
  .nm-card { left: 0; right: 0; bottom: 0; width: auto; max-width: none; max-height: 62%; border-radius: 8px 8px 0 0; padding: 10px 16px 20px; box-shadow: 0 -8px 24px rgba(0,0,0,0.45); }
  .nm-card-handle { display: block; width: 36px; height: 4px; border-radius: 2px; background: #3A3A55; margin: 0 auto 14px; }
  .nm-card-close { top: 14px; }
  .nm-cta { min-height: 48px; }
}
`;

const DAY_EN = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** "Σάβ 14 Νοε" for a YYYY-MM-DD date, read as a plain calendar date. */
function dayLabel(date: string, lang: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1).toLocaleDateString(lang === "en" ? "en-GB" : "el-GR", { weekday: "short", day: "numeric", month: "short" });
}

const NONE: MapPoint[] = [];

export default function MapClient({ points }: { points: MapPoint[] }) {
  const { t, lang } = useLanguage();
  const searchParams = useSearchParams();
  const now = useAthensNow();
  const panelId = useId();
  const [filters, setFilters] = useState<MapFilters>(() => parseFilters(searchParams));
  const [open, setOpen] = useState<GroupKey | null>(() => parseOpenGroup(searchParams));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const lastPicked = useRef<string | null>(null);

  // A link that arrives while the map is open (?c=…&date=…&open=events) replaces the filters.
  // Adjusted during render (React's pattern for state derived from a prop).
  const urlKey = serializeFilters(parseFilters(searchParams));
  const [seenUrlKey, setSeenUrlKey] = useState(urlKey);
  if (urlKey !== seenUrlKey) {
    setSeenUrlKey(urlKey);
    if (serializeFilters(filters) !== urlKey) setFilters(parseFilters(new URLSearchParams(urlKey)));
  }
  // ?open=… only ever opens a panel (our own URL updates drop it, which must not close it again).
  const urlOpen = parseOpenGroup(searchParams);
  const [seenOpen, setSeenOpen] = useState(urlOpen);
  if (urlOpen !== seenOpen) {
    setSeenOpen(urlOpen);
    if (urlOpen) setOpen(urlOpen);
  }

  // The filters live in the URL, so a link can be sent. A picked night that is tonight (or already
  // past) is not kept, and one too far ahead is cut to the last pickable night.
  const update = useCallback((raw: MapFilters) => {
    let next = raw;
    if (raw.night != null) {
      const c = mapContext(raw.night, new Date());
      next = { ...raw, night: c.night === c.tonight ? null : c.night };
    }
    setFilters(next);
    const qs = serializeFilters(next);
    window.history.replaceState(window.history.state, "", qs ? `/map?${qs}` : "/map");
  }, []);

  // "Now" is read in the browser (this page is cached on the server): the night, the status of
  // every venue and the events of the night are all worked out here.
  const ctx = useMemo(() => (now ? mapContext(filters.night, now) : null), [now, filters.night]);
  const resolved = useMemo(() => (ctx ? resolvePoints(points, filters, ctx) : null), [points, filters, ctx]);
  const visible = resolved?.visible ?? NONE;

  // A pin that a filter has hidden cannot stay open.
  const selected = visible.find((p) => p.id === selectedId) ?? null;

  const pick = useCallback((id: string | null) => {
    setSelectedId(id);
    if (id) {
      lastPicked.current = id;
      // Phone: the card takes the room the open filters were using.
      if (window.matchMedia("(max-width: 767px)").matches) setOpen(null);
    }
  }, []);

  // Move focus into the card when it opens, so keyboard users land on it.
  const selectedKey = selected?.id ?? null;
  useEffect(() => {
    if (selectedKey) cardRef.current?.focus({ preventScroll: true });
  }, [selectedKey]);

  const close = useCallback(() => {
    const id = lastPicked.current;
    setSelectedId(null);
    // Give focus back to the pin the card came from.
    if (id) requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-pin="${CSS_ESCAPE(id)}"]`)?.focus());
  }, []);

  useEffect(() => {
    if (!selectedKey) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedKey, close]);

  const handlers: PanelHandlers = {
    onToggleEventType: (k) => update(toggleEventType(filters, k)),
    onToggleGenre: (k) => update(toggleEventGenre(filters, k)),
    onSpotStatus: (s) => update(setSpotStatus(filters, s)),
    onToggleCategory: (k) => update(toggleMapCategory(filters, k)),
    onToggleSub: (k) => update(toggleMapSub(filters, k)),
    onToggleWellnessSub: (k) => update(toggleWellnessSub(filters, k)),
    onClearGroup: (g) => update(clearGroupFilters(filters, g)),
  };

  const empty = points.length === 0;
  const noMatch = !empty && !!resolved && visible.length === 0;
  const counts = resolved?.counts ?? null;
  const shown = counts ? { events: filters.hidden.includes("events") ? 0 : counts.events, spots: filters.hidden.includes("spots") ? 0 : counts.spots, wellness: filters.hidden.includes("wellness") ? 0 : counts.wellness } : null;

  // What the card says about a venue: its status at the picked night and that day's hours.
  const status = selected && resolved ? resolved.status[selected.id] : undefined;
  let hoursLine: string | null = null;
  if (selected?.kind === "spot" && ctx) {
    const idx = weekdayIndex(ctx.night);
    const text = idx >= 0 ? selected.hours?.[DAY_NAMES[idx]] : undefined;
    if (text && text.trim()) hoursLine = `${lang === "en" ? DAY_EN[idx] : DAY_NAMES[idx]}: ${text.trim()}`;
  }

  return (
    <div className="nm-root" lang={lang}>
      <style>{CSS}</style>
      <nav className="nm-crumb" aria-label="breadcrumb">
        <Link href="/spots">Spots</Link><span aria-hidden="true">/</span>
        <span style={{ color: "#fff", fontWeight: 600 }} aria-current="page">{t("map_breadcrumb")}</span>
      </nav>

      <div className="nm-controls">
        <MapDateBar night={ctx?.night ?? null} tonight={ctx?.tonight ?? null} onPick={(n) => update(setNight(filters, n))} />
        <MapGroupBar filters={filters} counts={counts} open={open} panelId={panelId}
          onToggleLayer={(g) => update(toggleGroupHidden(filters, g))}
          onToggleOpen={(g) => { if (open !== g && filters.hidden.includes(g)) update(showGroup(filters, g)); setOpen(open === g ? null : g); }} />
      </div>
      <MapGroupPanel group={open} filters={filters} id={panelId} handlers={handlers} />

      <div className="nm-body">
        <div className="nm-stage">
          <PublicMap points={visible} selectedId={selected?.id ?? null} onSelect={pick} statusById={resolved?.status} topInset={40} />

          <div className="nm-count" data-testid="map-counter" role="status">
            {shown && ctx ? `${shown.events} ${t("map_events")} · ${shown.spots} ${t("map_spots")} · ${shown.wellness} ${t("map_wellness")} · ${dayLabel(ctx.night, lang)}` : "…"}
          </div>

          {empty && (
            <div className="nm-overlay" role="status"><p>{t("map_soon")}</p></div>
          )}
          {noMatch && (
            <div className="nm-overlay" role="status">
              <p>{t("map_no_results")}</p>
              {(hasFilters(filters) || filters.hidden.length > 0) && <button type="button" onClick={() => update(clearAllFilters(filters))}>{t("map_clear_filters")}</button>}
            </div>
          )}

          {selected && <MapCard ref={cardRef} point={selected} status={status} hoursLine={hoursLine} onClose={close} />}
        </div>
      </div>

      <MapLegend />
    </div>
  );
}

// ids are `w-<uuid>` / `s-<uuid>` / `e-<uuid>`: letters, digits and dashes only.
const CSS_ESCAPE = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, "");
