"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLanguage } from "../components/LanguageContext";
import {
  NO_FILTERS, filterPoints, hasFilters, parseFilters, serializeFilters, toggleMapCategory, toggleMapSub,
  type MapFilters, type MapPoint,
} from "../lib/mapFilters";
import type { SpotCategory } from "../lib/spotCategories";
import { MapFilterBar, MapFilterSide } from "./MapFilterPanel";
import MapCard from "./MapCard";

// Leaflet touches `window`, so the map itself only loads in the browser.
const PublicMap = dynamic(() => import("@/components/maps/PublicMap"), {
  ssr: false,
  loading: () => <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "#12121F" }} />,
});

const CSS = `
.nm-root { background: #0F0F1A; color: #fff; display: flex; flex-direction: column; height: min(calc(100dvh - 60px), 1000px); min-height: 520px; }
.nm-crumb { flex: none; display: flex; align-items: center; gap: 8px; padding: 12px 16px 10px; font-size: 14px; color: #A9ABC0; }
.nm-crumb a { color: #A9ABC0; text-decoration: none; display: inline-flex; align-items: center; min-height: 24px; }
.nm-crumb a:hover { color: #fff; }
.nm-body { flex: 1; min-height: 0; display: flex; gap: 20px; padding: 0 32px 24px; }
.nm-side { flex: none; width: 300px; overflow-y: auto; }
.nm-bar { display: none; flex: none; }
.nm-stage { flex: 1; min-width: 0; position: relative; border-radius: 8px; overflow: hidden; background: #12121F; border: 1px solid #1E1E32; }
.nm-scroll { scrollbar-width: none; }
.nm-scroll::-webkit-scrollbar { display: none; }
.nm-card { position: absolute; z-index: 1100; left: 20px; bottom: 20px; width: 340px; max-width: calc(100% - 40px); max-height: calc(100% - 40px); overflow-y: auto; box-sizing: border-box; background: #1A1A28; border-radius: 8px; padding: 16px; box-shadow: 0 8px 24px rgba(0,0,0,0.45); outline: none; }
.nm-card-handle { display: none; }
.nm-card-close { position: absolute; top: 8px; right: 8px; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; background: transparent; border: 0; color: #A9ABC0; cursor: pointer; }
.nm-card-close:hover { color: #fff; }
.nm-cta { margin-top: 14px; display: flex; align-items: center; justify-content: center; width: 100%; min-height: 44px; box-sizing: border-box; border-radius: 8px; background: #E8A020; color: #0F0F1A; font-size: 15px; font-weight: 600; text-decoration: none; }
.nm-overlay { position: absolute; z-index: 1050; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(320px, calc(100% - 32px)); box-sizing: border-box; background: #1A1A28; border-radius: 8px; padding: 20px; text-align: center; box-shadow: 0 8px 24px rgba(0,0,0,0.45); }
.nm-overlay p { margin: 0; font-size: 15px; color: #D5D6E3; }
.nm-overlay button { margin-top: 14px; min-height: 44px; padding: 0 18px; border-radius: 8px; border: 1px solid #3A3A55; background: transparent; color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; }
.nm-root button:focus-visible, .nm-root a:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
@media (max-width: 767px) {
  .nm-root { height: min(calc(100dvh - 60px), 1000px); }
  .nm-crumb { padding: 8px 16px; }
  .nm-side { display: none; }
  .nm-bar { display: block; }
  .nm-body { padding: 0; gap: 0; }
  .nm-stage { border-radius: 0; border-left: 0; border-right: 0; border-bottom: 0; }
  .nm-card { left: 0; right: 0; bottom: 0; width: auto; max-width: none; max-height: 62%; border-radius: 8px 8px 0 0; padding: 10px 16px 20px; box-shadow: 0 -8px 24px rgba(0,0,0,0.45); }
  .nm-card-handle { display: block; width: 36px; height: 4px; border-radius: 2px; background: #3A3A55; margin: 0 auto 14px; }
  .nm-card-close { top: 14px; }
  .nm-cta { min-height: 48px; }
}
`;

export default function MapClient({ points }: { points: MapPoint[] }) {
  const { t, lang } = useLanguage();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<MapFilters>(() => parseFilters(searchParams));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const lastPicked = useRef<string | null>(null);

  // A link that arrives while the map is open (?c=…&s=…) replaces the filters.
  // Adjusted during render (React's pattern for state derived from a prop).
  const urlKey = serializeFilters(parseFilters(searchParams));
  const [seenUrlKey, setSeenUrlKey] = useState(urlKey);
  if (urlKey !== seenUrlKey) {
    setSeenUrlKey(urlKey);
    if (serializeFilters(filters) !== urlKey) setFilters(parseFilters(new URLSearchParams(urlKey)));
  }

  // The filters live in the URL, so a link can be sent.
  const update = useCallback((next: MapFilters) => {
    setFilters(next);
    const qs = serializeFilters(next);
    window.history.replaceState(window.history.state, "", qs ? `/map?${qs}` : "/map");
  }, []);

  const visible = useMemo(() => filterPoints(points, filters), [points, filters]);
  // A pin that a filter has hidden cannot stay open.
  const selected = visible.find((p) => p.id === selectedId) ?? null;

  const pick = useCallback((id: string | null) => {
    setSelectedId(id);
    if (id) lastPicked.current = id;
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

  const handlers = {
    filters,
    onToggleCategory: (key: SpotCategory) => update(toggleMapCategory(filters, key)),
    onToggleSub: (key: string) => update(toggleMapSub(filters, key)),
    onClear: () => update(NO_FILTERS),
  };

  const empty = points.length === 0;
  const noMatch = !empty && visible.length === 0;

  return (
    <div className="nm-root" lang={lang}>
      <style>{CSS}</style>
      <nav className="nm-crumb" aria-label="breadcrumb">
        <Link href="/spots">Spots</Link><span aria-hidden="true">/</span>
        <span style={{ color: "#fff", fontWeight: 600 }} aria-current="page">{t("map_breadcrumb")}</span>
      </nav>

      <div className="nm-bar"><MapFilterBar {...handlers} /></div>

      <div className="nm-body">
        <aside className="nm-side" aria-label={t("map_filters")}><MapFilterSide {...handlers} /></aside>

        <div className="nm-stage">
          <PublicMap points={visible} selectedId={selected?.id ?? null} onSelect={pick} />

          {empty && (
            <div className="nm-overlay" role="status"><p>{t("map_soon")}</p></div>
          )}
          {noMatch && (
            <div className="nm-overlay" role="status">
              <p>{t("map_no_results")}</p>
              {hasFilters(filters) && <button type="button" onClick={handlers.onClear}>{t("map_clear_filters")}</button>}
            </div>
          )}

          {selected && <MapCard ref={cardRef} point={selected} onClose={close} />}
        </div>
      </div>
    </div>
  );
}

// ids are `w-<uuid>` / `s-<uuid>`: letters, digits and dashes only.
const CSS_ESCAPE = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, "");
