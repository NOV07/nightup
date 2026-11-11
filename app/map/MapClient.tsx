"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLanguage } from "../components/LanguageContext";
import {
  clearAllFilters, clearGroupFilters, hasFilters, mapContext, parseFilters, parseOpenGroup, resolvePoints, serializeFilters,
  setNight, setSpotStatus, toggleEventGenre, toggleEventType, toggleGroupPanel, toggleGroupShown, toggleMapCategory, toggleMapSub, toggleWellnessSub,
  type GroupKey, type MapFilters, type MapPoint,
} from "../lib/mapFilters";
import { DAY_NAMES } from "../lib/openingHours";
import { weekdayIndex } from "../lib/dateKey";
import { formatNightLabel } from "../lib/mapDate";
import { useAthensNow } from "../lib/useAthensNow";
import { useUserLocation } from "../lib/useUserLocation";
import { NEAR_RADII, filterByRadius, isFarFromData, joinQuery, parseNear, serializeNear, type NearState } from "../lib/mapNear";
import type { TranslationKey } from "../lib/translations";
import { MapDateBar, MapGroupBar, MapGroupPanel, MapLegend, type PanelHandlers } from "./MapFilterPanel";
import MapCard from "./MapCard";

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
.nm-controls { flex: none; display: flex; flex-direction: column; gap: 8px; padding: 0 16px 10px; max-width: 792px; width: 100%; box-sizing: border-box; }
.nm-near { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.nm-near-btn { min-height: 44px; padding: 0 16px; border-radius: 8px; border: 1px solid #3A3A55; background: #1A1A28; color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; }
.nm-near-btn[aria-pressed="true"] { background: rgba(76,141,255,0.16); border-color: #4C8DFF; }
.nm-near-btn:disabled { opacity: 0.7; cursor: progress; }
.nm-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.nm-chip { min-height: 36px; padding: 0 14px; border-radius: 18px; border: 1px solid #3A3A55; background: transparent; color: #D5D6E3; font-size: 13px; font-weight: 600; cursor: pointer; }
.nm-chip[aria-pressed="true"] { background: #E8A020; border-color: #E8A020; color: #0F0F1A; }
.nm-near-msg { margin: 0; display: flex; align-items: flex-start; gap: 8px; padding: 8px 8px 8px 12px; border-radius: 8px; background: #1A1A28; border: 1px solid #3A3A55; font-size: 13px; line-height: 1.4; color: #D5D6E3; }
.nm-near-msg span { flex: 1; padding-top: 2px; }
.nm-near-msg button { flex: none; width: 32px; height: 32px; border: 0; background: transparent; color: #A9ABC0; cursor: pointer; }
.nm-panel { flex: none; max-height: 38vh; overflow-y: auto; box-sizing: border-box; padding: 10px 16px 12px; }
.nm-body { flex: 1; min-height: 300px; display: flex; padding: 0 16px; }
.nm-stage { flex: 1; min-width: 0; position: relative; isolation: isolate; border-radius: 8px; overflow: hidden; background: #12121F; border: 1px solid #1E1E32; }
.nm-count { position: absolute; z-index: 1000; left: 10px; top: 10px; max-width: calc(100% - 72px); box-sizing: border-box; padding: 6px 10px; border-radius: 8px; background: rgba(15,15,26,0.92); border: 1px solid #3A3A55; font-size: 12px; line-height: 1.35; color: #fff; pointer-events: none; }
.nm-hint { position: absolute; z-index: 1000; left: 50%; bottom: 14px; transform: translateX(-50%); width: max-content; max-width: calc(100% - 24px); box-sizing: border-box; padding: 8px 12px; border-radius: 8px; background: rgba(15,15,26,0.92); border: 1px solid #3A3A55; font-size: 13px; line-height: 1.35; text-align: center; color: #D5D6E3; pointer-events: none; }
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
  /* The page is exactly the screen between the navbar (57px) and the full-width player bar at the bottom
     (--mobile-radio-bar-height, plus the home-indicator inset): the map takes what the bars and the
     legend leave, and the legend ends right above the player instead of under it. */
  .nm-root { min-height: calc(100dvh - 57px - var(--mobile-radio-bar-height, 54px) - env(safe-area-inset-bottom, 0px)); }
  .nm-legend { padding-bottom: 14px; }
  .nm-card { left: 0; right: 0; bottom: 0; width: auto; max-width: none; max-height: 62%; border-radius: 8px 8px 0 0; padding: 10px 16px 20px; box-shadow: 0 -8px 24px rgba(0,0,0,0.45); }
  .nm-card-handle { display: block; width: 36px; height: 4px; border-radius: 2px; background: #3A3A55; margin: 0 auto 14px; }
  .nm-card-close { top: 14px; }
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

export default function MapClient({ points }: { points: MapPoint[] }) {
  const { t, lang } = useLanguage();
  const searchParams = useSearchParams();
  const now = useAthensNow();
  const panelId = useId();
  const [filters, setFilters] = useState<MapFilters>(() => parseFilters(searchParams));
  const [open, setOpen] = useState<GroupKey | null>(() => parseOpenGroup(searchParams));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // "Near me": whether it is on and the radius live in the URL (near=1&r=3), never the position.
  // From a link it only gets the button ready; the position is asked when the button is pressed.
  const [near, setNearState] = useState<NearState>(() => parseNear(searchParams));
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

  // A pin that a filter has hidden cannot stay open.
  const selected = shown.find((p) => p.id === selectedId) ?? null;

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

  const pressNear = () => {
    if (near.on && loc.status === "granted") { setNear({ ...near, on: false }); loc.reset(); return; }
    setNear({ ...near, on: true });
    loc.requestLocation();
  };
  const dismissNear = () => { setNear({ ...near, on: false }); loc.reset(); };
  const nearMsg: TranslationKey | null = !near.on ? null
    : loc.status === "unsupported" ? "map_near_unsupported"
    : loc.status === "denied" ? (loc.errorCode === 1 ? "map_near_denied" : "map_near_unavailable")
    : tooFar ? "map_near_far" : null;
  const locating = near.on && loc.status === "loading";

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
  // Nothing is lit at first: the map is empty on purpose and says what to do. Once a group is lit
  // but has nothing to show with the current filters, it is "no results" instead.
  const showHint = !empty && !anyLit;
  const noMatch = !empty && anyLit && !!resolved && visible.length === 0;
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
          onToggleLayer={(g) => update(toggleGroupShown(filters, g))}
          onToggleOpen={(g) => {
            // The name opens the group's filters and lights the group if it is off; closing never turns it off.
            const next = toggleGroupPanel(filters, open, g);
            if (next.filters !== filters) update(next.filters);
            setOpen(next.open);
          }} />
        <div className="nm-near">
          <button type="button" className="nm-near-btn" data-testid="near-me" aria-pressed={!!userPos} disabled={locating} aria-busy={locating} onClick={pressNear}>
            {t("map_near_me")}
          </button>
          {userPos && (
            <div className="nm-chips" role="group" aria-label={t("map_near_radius")}>
              {NEAR_RADII.map((r) => (
                <button key={String(r)} type="button" className="nm-chip" aria-pressed={near.radius === r} data-testid={`near-r-${r}`}
                  onClick={() => setNear({ ...near, radius: r })}>
                  {r === "all" ? t("map_near_all") : `${r} ${t("map_unit_km")}`}
                </button>
              ))}
            </div>
          )}
        </div>
        {locating && <p className="nm-near-msg" role="status" data-testid="near-loading"><span>{t("map_near_loading")}</span></p>}
        {nearMsg && (
          <p className="nm-near-msg" role="status" data-testid="near-msg">
            <span>{t(nearMsg)}</span>
            <button type="button" onClick={dismissNear} aria-label={t("map_near_dismiss")}>✕</button>
          </p>
        )}
      </div>
      <MapGroupPanel group={open} filters={filters} id={panelId} handlers={handlers} />

      <div className="nm-body">
        <div className="nm-stage">
          <PublicMap points={shown} selectedId={selected?.id ?? null} onSelect={pick} statusById={resolved?.status} topInset={40}
            userLocation={userPos ? { ...userPos, radiusKm: near.radius === "all" ? null : near.radius } : null} />

          <div className="nm-count" data-testid="map-counter" role="status">
            {counts && ctx ? `${counts.events} ${t("map_events")} · ${counts.spots} ${t("map_spots")} · ${counts.wellness} ${t("map_wellness")} · ${formatNightLabel(ctx.night, lang)}${userPos ? ` · ${shown.length} ${t("map_near_in_range")}` : ""}` : "…"}
          </div>

          {showHint && <div className="nm-hint" role="status" data-testid="map-empty-hint">{t("map_pick_layers")}</div>}

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

          {selected && <MapCard ref={cardRef} point={selected} status={status} hoursLine={hoursLine} onClose={close} />}
        </div>
      </div>

      <MapLegend />
    </div>
  );
}

// ids are `w-<uuid>` / `s-<uuid>` / `e-<uuid>`: letters, digits and dashes only.
const CSS_ESCAPE = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, "");
