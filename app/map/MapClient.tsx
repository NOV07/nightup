"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLanguage } from "../components/LanguageContext";
import {
  clearAllFilters, clearGroupFilters, hasFilters, mapContext, parseFilters, parseOpenGroup, resolvePoints, serializeFilters,
  setNight, setSpotStatus, toggleEventGenre, toggleEventType, toggleGroupShown, toggleMapCategory, toggleMapSub, toggleWellnessSub,
  NO_FILTERS, type MapFilters, type MapPoint,
} from "../lib/mapFilters";
import { DAY_NAMES, closesSoon } from "../lib/openingHours";
import { weekdayIndex } from "../lib/dateKey";
import { useAthensNow } from "../lib/useAthensNow";
import { useUserLocation } from "../lib/useUserLocation";
import { filterByRadius, nextRadius, isFarFromData, joinQuery, parseNear, serializeNear, type NearState } from "../lib/mapNear";
import type { TranslationKey } from "../lib/translations";
import { MapDateBar, MapGroupRows, MapLegend, type PanelHandlers } from "./MapFilterPanel";
import MapSheet from "./MapSheet";
import { activeFilterCount, pluralLabel } from "../lib/mapUi";
import MapCard from "./MapCard";
import MapList from "./MapList";

// Leaflet touches `window`, so the map itself only loads in the browser.
const PublicMap = dynamic(() => import("@/components/maps/PublicMap"), {
  ssr: false,
  loading: () => <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "#12121F" }} />,
});

const CSS = `
.nm-root { background: #0F0F1A; color: #fff; display: flex; flex-direction: column; min-height: min(calc(100dvh - 61px), 1000px); }
.nm-crumb { flex: none; display: flex; align-items: center; gap: 8px; padding: 12px 16px 10px; font-size: 14px; color: #A9ABC0; }
.nm-crumb a { color: #A9ABC0; text-decoration: none; display: inline-flex; align-items: center; min-height: 24px; }
.nm-crumb a:hover { color: #fff; }
.nm-main { position: absolute; inset: 0; }
.nm-map-layer { position: absolute; inset: 0; }
.nm-map-layer.is-hidden { visibility: hidden; pointer-events: none; }
.nm-list-wrap { position: absolute; inset: 0; overflow-y: auto; overscroll-behavior: contain; padding: 68px 0 76px; background: #0F0F1A; }
.nm-list-empty { margin: 0; padding: 24px 20px; font-size: 15px; color: #D5D6E3; }
.nm-lst { left: 12px; }
.nm-list { margin: 0; padding: 0; list-style: none; }
.nm-row { width: 100%; min-height: 64px; box-sizing: border-box; display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: transparent; border: 0; border-bottom: 1px solid #1E1E32; color: #fff; text-align: left; cursor: pointer; font: inherit; }
.nm-row:hover, .nm-row[aria-pressed="true"] { background: #1A1A28; }
.nm-ico { flex: none; box-sizing: border-box; width: 38px; height: 38px; border-radius: 50%; border: 2px solid #0F0F1A; background: linear-gradient(135deg, #F5B335, #E8A020); display: flex; align-items: center; justify-content: center; font-size: 19px; line-height: 1; box-shadow: 0 2px 6px rgba(0,0,0,0.5); }
.nm-ico.is-closed { background: #6B6B80; }
.nm-ico.is-closed span { filter: grayscale(1); opacity: 0.85; }
.nm-ico.is-unknown { background: rgba(15,15,26,0.78); border-color: #E8A020; }
.nm-ico.is-radar { box-shadow: 0 0 0 3px rgba(245,179,53,0.3), 0 2px 6px rgba(0,0,0,0.5); }
.nm-row-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.nm-row-name { font-size: 15px; font-weight: 600; overflow-wrap: anywhere; }
.nm-row-sub { font-size: 13px; color: #A9ABC0; overflow-wrap: anywhere; }
.nm-row-radar { align-self: flex-start; font-size: 11px; font-weight: 600; color: #F5B335; }
.nm-row-side { flex: none; display: flex; flex-direction: column; align-items: flex-end; gap: 4px; max-width: 42%; text-align: right; }
.nm-row-status { font-size: 12px; font-weight: 600; padding: 2px 8px; border-radius: 6px; background: #2A2A38; color: #D5D6E3; }
.nm-row-status.is-open { background: #1B3A2C; color: #34D399; }
.nm-row-status.is-closed { color: #A9ABC0; }
.nm-row-soon { font-size: 12px; font-weight: 600; padding: 2px 8px; border-radius: 6px; background: rgba(245,179,53,0.16); color: #F5B335; }
.nm-row-dist { font-size: 12px; color: #A9ABC0; }
.nm-body { flex: 1; min-height: 300px; display: flex; padding: 0 16px; }
.nm-stage { flex: 1; min-width: 0; position: relative; isolation: isolate; border-radius: 8px; overflow: hidden; background: #12121F; border: 1px solid #1E1E32; }
.nm-sr { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
.nm-round { position: absolute; z-index: 1000; bottom: 12px; width: 48px; height: 48px; padding: 0; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: rgba(15,15,26,0.94); border: 1px solid #3A3A55; color: #fff; font-size: 22px; line-height: 1; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.4); font-family: "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif; }
.nm-round:disabled { opacity: 0.7; cursor: progress; }
.nm-loc { right: 12px; }
.nm-loc[aria-pressed="true"] { border-color: #4C9AFF; background: rgba(76,154,255,0.2); }
.nm-rad { position: absolute; z-index: 1000; right: 12px; bottom: 68px; height: 34px; padding: 0 14px; border-radius: 17px; background: rgba(15,15,26,0.94); border: 1px solid #4C9AFF; color: #fff; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
.nm-toast { position: absolute; z-index: 1250; left: 12px; right: 12px; bottom: 72px; max-width: 420px; display: flex; align-items: flex-start; gap: 8px; box-sizing: border-box; padding: 10px 8px 10px 14px; border-radius: 10px; background: #1A1A28; border: 1px solid #3A3A55; box-shadow: 0 4px 16px rgba(0,0,0,0.5); font-size: 13px; line-height: 1.4; color: #D5D6E3; }
.nm-toast span { flex: 1; padding-top: 3px; }
.nm-toast button { flex: none; width: 32px; height: 32px; border: 0; background: transparent; color: #A9ABC0; cursor: pointer; }
.nm-fbtn { position: absolute; z-index: 1000; left: 12px; top: 12px; max-width: calc(100% - 76px); height: 44px; padding: 0 16px; border-radius: 22px; display: flex; align-items: center; gap: 8px; background: rgba(15,15,26,0.94); border: 1px solid #3A3A55; color: #fff; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.4); white-space: nowrap; }
.nm-fbtn > span:first-child { overflow: hidden; text-overflow: ellipsis; }
.nm-fbtn.is-active { border-color: #E8A020; }
.nm-fbtn-n { flex: none; min-width: 20px; height: 20px; padding: 0 6px; box-sizing: border-box; border-radius: 10px; background: #E8A020; color: #0F0F1A; font-size: 12px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; }
.nm-scrim { position: absolute; z-index: 1150; inset: 0; background: rgba(0,0,0,0.4); }
.nm-sheet { position: absolute; z-index: 1200; left: 0; right: 0; bottom: 0; max-height: 78%; display: flex; flex-direction: column; box-sizing: border-box; background: #1A1A28; border-top: 1px solid #3A3A55; border-radius: 14px 14px 0 0; outline: none; box-shadow: 0 -8px 24px rgba(0,0,0,0.45); }
.nm-sheet-top { flex: none; padding: 10px 16px 6px; }
.nm-sheet-handle { width: 36px; height: 4px; border-radius: 2px; background: #3A3A55; margin: 0 auto 10px; }
.nm-sheet-title { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.nm-sheet-title h2 { margin: 0; font-size: 17px; font-weight: 600; }
.nm-link { min-height: 44px; padding: 0 4px; background: none; border: 0; color: #F5B335; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; }
.nm-sheet-body { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: 0 16px 12px; }
.nm-sheet-foot { flex: none; padding: 10px 16px 14px; border-top: 1px solid #22223A; }
.nm-go { width: 100%; min-height: 48px; border: 0; border-radius: 8px; background: #E8A020; color: #0F0F1A; font: inherit; font-size: 15px; font-weight: 700; cursor: pointer; }
.nm-h { margin: 12px 0 8px; font-size: 12px; font-weight: 600; color: #A9ABC0; }
.nm-sw { flex: none; position: relative; width: 38px; height: 22px; border-radius: 11px; background: #33334A; }
.nm-sw::after { content: ""; position: absolute; top: 3px; left: 3px; width: 16px; height: 16px; border-radius: 50%; background: #fff; }
.nm-sw[data-on="1"] { background: var(--sw-on, #E8A020); }
.nm-sw[data-on="1"]::after { left: 19px; }
@media (prefers-reduced-motion: no-preference) {
  .nm-sheet { animation: nm-sheet-in .2s ease-out; }
  .nm-scrim { animation: nm-fade-in .2s ease-out; }
  .nm-sw::after { transition: left .15s; }
}
@keyframes nm-sheet-in { from { transform: translateY(24px); opacity: 0; } to { transform: none; opacity: 1; } }
@keyframes nm-fade-in { from { opacity: 0; } to { opacity: 1; } }
@media (min-width: 900px) {
  /* Wide screens: the filters are a column on the left of the map, no scrim. */
  .nm-sheet { left: 0; right: auto; top: 0; width: 360px; max-height: none; border-radius: 0; border-top: 0; border-right: 1px solid #3A3A55; box-shadow: none; }
  .nm-stage.has-sheet .nm-main { left: 360px; }
}
.nm-legend { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; font-size: 13px; color: #D5D6E3; }
.nm-legend li { display: inline-flex; align-items: center; gap: 6px; }
.nm-card { position: absolute; z-index: 1100; left: 20px; bottom: 72px; width: 340px; max-width: calc(100% - 40px); max-height: calc(100% - 150px); overflow-y: auto; box-sizing: border-box; background: #1A1A28; border-radius: 8px; padding: 16px; box-shadow: 0 8px 24px rgba(0,0,0,0.45); outline: none; }
.nm-card-handle { display: none; }
.nm-card-close { position: absolute; top: 8px; right: 8px; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; background: transparent; border: 0; color: #A9ABC0; cursor: pointer; }
.nm-card-close:hover { color: #fff; }
.nm-cta { margin-top: 14px; display: flex; align-items: center; justify-content: center; width: 100%; min-height: 44px; box-sizing: border-box; border-radius: 8px; background: #E8A020; color: #0F0F1A; font-size: 15px; font-weight: 600; text-decoration: none; }
.nm-overlay { position: absolute; z-index: 1050; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(320px, calc(100% - 32px)); box-sizing: border-box; background: #1A1A28; border-radius: 8px; padding: 20px; text-align: center; box-shadow: 0 8px 24px rgba(0,0,0,0.45); }
.nm-overlay p { margin: 0; font-size: 15px; color: #D5D6E3; }
.nm-overlay button { margin-top: 14px; min-height: 44px; padding: 0 18px; border-radius: 8px; border: 1px solid #3A3A55; background: transparent; color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; }
.nm-root button:focus-visible, .nm-root a:focus-visible, .nm-root input:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
@media (min-width: 768px) {
  .nm-body { padding: 0 32px; }
}
@media (max-width: 767px) {
  .nm-crumb { display: none; }
  .nm-body { padding: 0; }
  .nm-stage { border-radius: 0; border-left: 0; border-right: 0; }
  /* The page is exactly the screen between the navbar (57px) and the full-width player bar at the bottom
     (--mobile-radio-bar-height, plus the home-indicator inset): the map takes what the bars and the
     legend leave, and the legend ends right above the player instead of under it. */
  .nm-root { min-height: calc(100dvh - 57px - var(--mobile-radio-bar-height, 54px) - env(safe-area-inset-bottom, 0px)); }
  /* The card sits above the two round buttons (48px + 12px + 12px), so they stay visible and tappable. */
  .nm-card { left: 12px; right: 12px; bottom: 72px; width: auto; max-width: none; max-height: calc(100% - 150px); border-radius: 12px; padding: 14px 16px 16px; box-shadow: 0 -4px 20px rgba(0,0,0,0.45); }
  .nm-card-close { top: 8px; }
  .nm-cta { min-height: 48px; }
}
`;

/** The filters and the "Near me" part share the URL; the position never does. */
function writeUrl(filters: MapFilters, near: NearState) {
  const qs = joinQuery(serializeFilters(filters), serializeNear(near));
  window.history.replaceState(window.history.state, "", qs ? `/map?${qs}` : "/map");
}

const DAY_EN = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const NONE: MapPoint[] = [];
/** How long a Near me message stays. */
const TOAST_MS = 6000;

export default function MapClient({ points }: { points: MapPoint[] }) {
  const { t, lang } = useLanguage();
  const searchParams = useSearchParams();
  const now = useAthensNow();
  const [filters, setFilters] = useState<MapFilters>(() => parseFilters(searchParams));
  // The filters sheet. A link with ?open=events (or spots, wellness) opens it.
  const [sheetOpen, setSheetOpen] = useState(() => parseOpenGroup(searchParams) !== null);
  const filterBtnRef = useRef<HTMLButtonElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // "Near me": whether it is on and the radius live in the URL (near=1&r=3), never the position.
  // From a link it only gets the button ready; the position is asked when the button is pressed.
  const [near, setNearState] = useState<NearState>(() => parseNear(searchParams));
  const [view, setView] = useState<"map" | "list">("map");
  const loc = useUserLocation();
  const filtersRef = useRef(filters);
  const nearRef = useRef(near);
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
  // ?open=… only ever opens the sheet (our own URL updates drop it, which must not close it again).
  const urlOpen = parseOpenGroup(searchParams);
  const [seenOpen, setSeenOpen] = useState(urlOpen);
  if (urlOpen !== seenOpen) {
    setSeenOpen(urlOpen);
    if (urlOpen) setSheetOpen(true);
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
    writeUrl(next, nearRef.current);
  }, []);

  useEffect(() => { filtersRef.current = filters; nearRef.current = near; });
  const setNear = useCallback((next: NearState) => {
    nearRef.current = next;
    setNearState(next);
    writeUrl(filtersRef.current, next);
  }, []);

  // "Now" is read in the browser (this page is cached on the server): the night, the status of
  // every venue and the events of the night are all worked out here.
  const ctx = useMemo(() => (now ? mapContext(filters.night, now) : null), [now, filters.night]);
  const resolved = useMemo(() => (ctx ? resolvePoints(points, filters, ctx) : null), [points, filters, ctx]);
  const visible = resolved?.visible ?? NONE;

  // "Near me" is active once the position is known and it is not far outside the area of the map.
  const here = near.on && loc.status === "granted" && loc.lat !== null && loc.lng !== null ? { lat: loc.lat, lng: loc.lng } : null;
  const tooFar = here ? isFarFromData(points, here) : false;
  const userPos = here && !tooFar ? here : null;
  const shown = useMemo(() => (userPos ? filterByRadius(visible, userPos, near.radius) : visible), [visible, userPos, near.radius]);

  // "Closing soon": only for tonight, an open venue that closes within 90 minutes (Athens time, read from its hours).
  const closingSoon = useMemo(() => {
    const ids = new Set<string>();
    if (!ctx || !resolved || ctx.night !== ctx.tonight) return ids;
    for (const p of shown) {
      if (p.kind === "spot" && resolved.status[p.id] === "open" && closesSoon(p.hours, ctx.moment.date, ctx.moment.minutes)) ids.add(p.id);
    }
    return ids;
  }, [shown, resolved, ctx]);

  // A pin that a filter has hidden cannot stay open.
  const selected = shown.find((p) => p.id === selectedId) ?? null;

  const pick = useCallback((id: string | null) => {
    setSelectedId(id);
    if (id) {
      lastPicked.current = id;
      setSheetOpen(false);
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
    if (id) requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-pin="${CSS_ESCAPE(id)}"], [data-list-item="${CSS_ESCAPE(id)}"]`)?.focus());
  }, []);

  useEffect(() => {
    if (!selectedKey) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedKey, close]);

  // A second press turns Near me off. The messages are a toast that goes away by itself.
  const [presses, setPresses] = useState(0);
  const [dismissedToken, setDismissedToken] = useState<string | null>(null);
  const pressNear = () => {
    setPresses((n) => n + 1);
    if (near.on && loc.status === "granted") { setNear({ ...near, on: false }); loc.reset(); return; }
    setNear({ ...near, on: true });
    loc.requestLocation();
  };
  const nearMsg: TranslationKey | null = !near.on ? null
    : loc.status === "unsupported" ? "map_near_unsupported"
    : loc.status === "denied" ? (loc.errorCode === 1 ? "map_near_denied" : "map_near_unavailable")
    : tooFar ? "map_near_far" : null;
  const locating = near.on && loc.status === "loading";
  const toastToken = nearMsg ? `${nearMsg}:${presses}` : null;
  useEffect(() => {
    if (!toastToken) return;
    const id = setTimeout(() => setDismissedToken(toastToken), TOAST_MS);
    return () => clearTimeout(id);
  }, [toastToken]);
  const toast = nearMsg && dismissedToken !== toastToken ? nearMsg : null;

  const openSheet = () => { setSelectedId(null); setSheetOpen(true); };
  const closeSheet = useCallback(() => setSheetOpen(false), []);
  // Clear: groups, filters, the night (back to tonight) and Near me; the sheet stays open to pick again.
  const clearEverything = () => {
    update(NO_FILTERS);
    if (near.on) { setNear({ ...near, on: false }); loc.reset(); }
  };

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
  const anyLit = filters.shown.length > 0;
  // Nothing is lit at first: the map is empty on purpose (the filter button says what to do). Once a
  // group is lit but has nothing to show with the current filters, it is "no results" instead.
  const noMatch = !empty && anyLit && !!resolved && visible.length === 0;
  const filterCount = activeFilterCount(filters, !!userPos);
  const nearNone = !!userPos && visible.length > 0 && shown.length === 0;
  // How many points each group would show, lit or not (the numbers of the group boxes use the same).
  const counts = resolved?.counts ?? null;

  // What the card says about a venue: its status at the picked night and that day's hours.
  const status = selected && resolved ? resolved.status[selected.id] : undefined;
  let hoursLine: string | null = null;
  if (selected?.kind === "spot" && ctx) {
    const idx = weekdayIndex(ctx.night);
    const text = idx >= 0 ? selected.hours?.[DAY_NAMES[idx]] : undefined;
    if (text && text.trim()) hoursLine = `${lang === "en" ? DAY_EN[idx] : DAY_NAMES[idx]}: ${text.trim()}`;
  }

  // Screen readers get the number of places (the counter is no longer drawn on the map).
  const countText = pluralLabel(shown.length, { one: t("map_count_one"), many: t("map_count_many") });


  return (
    <div className="nm-root" lang={lang}>
      <style>{CSS}</style>
      <nav className="nm-crumb" aria-label="breadcrumb">
        <Link href="/spots">Spots</Link><span aria-hidden="true">/</span>
        <span style={{ color: "#fff", fontWeight: 600 }} aria-current="page">{t("map_breadcrumb")}</span>
      </nav>

      <div className="nm-body">
        <div className={`nm-stage${sheetOpen ? " has-sheet" : ""}`}>
          <div className="nm-main">
          <div className={`nm-map-layer${view === "list" ? " is-hidden" : ""}`} aria-hidden={view === "list" ? true : undefined}>
          <PublicMap points={shown} selectedId={selected?.id ?? null} onSelect={pick} statusById={resolved?.status} topInset={56} quiet
            userLocation={userPos ? { ...userPos, radiusKm: near.radius === "all" ? null : near.radius } : null} />
          </div>
          {view === "list" && (
            <div className="nm-list-wrap">
              {anyLit
                ? <MapList points={shown} closingSoon={closingSoon} statusById={resolved?.status} here={userPos} selectedId={selected?.id ?? null} onPick={pick} />
                : <p className="nm-list-empty" role="status" data-testid="map-list-empty">{t("map_list_empty_pick")}</p>}
            </div>
          )}

          <div className="nm-sr" role="status" data-testid="map-count">{anyLit ? countText : ""}</div>

          <button ref={filterBtnRef} type="button" className={`nm-fbtn${filterCount > 0 ? " is-active" : ""}`} data-testid="map-filter-button"
            aria-haspopup="dialog" aria-expanded={sheetOpen} onClick={openSheet}>
            <span>{filterCount > 0 ? t("map_filters") : t("map_filter_prompt")}</span>
            {filterCount > 0 && <span className="nm-fbtn-n" data-testid="map-filter-count">{filterCount}</span>}
          </button>

          {empty && (
            <div className="nm-overlay" role="status"><p>{t("map_soon")}</p></div>
          )}
          {noMatch && (
            <div className="nm-overlay" role="status">
              <p>{t("map_no_results")}</p>
              {hasFilters(filters) && <button type="button" onClick={() => update(clearAllFilters(filters))}>{t("map_clear_filters")}</button>}
            </div>
          )}

          {nearNone && (
            <div className="nm-overlay" role="status" data-testid="near-none"><p>{t("map_near_none")}</p></div>
          )}

          {userPos && !selected && (
            <button type="button" className="nm-rad" data-testid="near-radius" onClick={() => setNear({ ...near, radius: nextRadius(near.radius) })}
              aria-label={`${t("map_near_radius")}: ${near.radius === "all" ? t("map_near_all") : `${near.radius} ${t("map_unit_km")}`}. ${t("map_near_radius_change")}`}>
              {near.radius === "all" ? t("map_near_all") : `${near.radius} ${t("map_unit_km")}`}
            </button>
          )}
          <button type="button" className="nm-round nm-lst" data-testid="list-toggle" aria-label={view === "list" ? t("map_view_map") : t("map_view_list")}
            onClick={() => setView((v) => (v === "list" ? "map" : "list"))}>
            <span aria-hidden="true">{view === "list" ? "🗺️" : "📋"}</span>
          </button>
          <button type="button" className="nm-round nm-loc" data-testid="near-me" aria-label={t("map_near_aria")} aria-pressed={!!userPos}
            aria-busy={locating} disabled={locating} onClick={pressNear}>
            <span aria-hidden="true">📍</span>
          </button>
          {(locating || toast) && (
            <div className="nm-toast" role="status" data-testid={locating ? "near-loading" : "near-msg"}>
              <span>{locating ? t("map_near_loading") : t(toast!)}</span>
              {toast && <button type="button" onClick={() => setDismissedToken(toastToken)} aria-label={t("map_near_dismiss")}>✕</button>}
            </div>
          )}

          {selected && <MapCard ref={cardRef} point={selected} status={status} closingSoon={!!selected && closingSoon.has(selected.id)} hoursLine={hoursLine} onClose={close} />}

          </div>

          {sheetOpen && (
            <MapSheet onClose={closeSheet} onClear={clearEverything} returnFocus={filterBtnRef}
              seeLabel={pluralLabel(shown.length, { one: t("map_see_one"), many: t("map_see_many") })}>
              <h3 className="nm-h">{t("map_date_bar")}</h3>
              <MapDateBar night={ctx?.night ?? null} tonight={ctx?.tonight ?? null} onPick={(n) => update(setNight(filters, n))} />
              <MapGroupRows filters={filters} counts={counts} handlers={handlers} onToggleLayer={(g) => update(toggleGroupShown(filters, g))} />
              <MapLegend />
            </MapSheet>
          )}
        </div>
      </div>
    </div>
  );
}

// ids are `w-<uuid>` / `s-<uuid>` / `e-<uuid>`: letters, digits and dashes only.
const CSS_ESCAPE = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, "");
