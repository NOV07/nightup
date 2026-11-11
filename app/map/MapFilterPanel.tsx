"use client";

import { useId, useRef, useSyncExternalStore } from "react";
import {
  SPOT_CATEGORIES, subsOf, spotCategoryLabel, spotSubLabel,
} from "../lib/spotCategories";
import { GENRES } from "../lib/genres";
import { MAP_CATEGORY_COLORS, MAP_GROUP_COLORS } from "../lib/mapColors";
import {
  EVENT_TYPES, SPOT_FILTER_CATEGORIES,
  type GroupKey, type MapFilters, type SpotStatusFilter,
} from "../lib/mapFilters";
import { addDaysKey } from "../lib/dateKey";
import { formatNightLabel, nightBounds } from "../lib/mapDate";
import { useLanguage } from "../components/LanguageContext";
import type { TranslationKey } from "../lib/translations";

const LINE = "#3A3A55";
const MUTED = "#A9ABC0";

/** The chips of the dock: 34px pills (the date row and the group rows). */
export const dockChip = (on: boolean, accent = "#E8A020"): React.CSSProperties => ({
  flex: "none", height: 34, padding: "0 12px", borderRadius: 17, fontSize: 13, cursor: "pointer",
  display: "inline-flex", alignItems: "center", gap: 6, color: on ? "#0F0F1A" : "#fff", whiteSpace: "nowrap", fontFamily: "inherit",
  background: on ? accent : "transparent", border: `1px solid ${on ? accent : LINE}`, fontWeight: on ? 700 : 600,
});

// ── Date bar ────────────────────────────────────────────────────────────────

const subscribeNever = () => () => {};

/**
 * "Tonight", "Tomorrow" and a third button that shows the picked night as «Τρί 10 Νοε» and opens the
 * phone's own date picker (a hidden date input, opened with showPicker). The native input is not shown
 * because phones print its date in their own order (11/10/2026 reads as October, not November).
 */
export function MapDateBar({ night, tonight, onPick }: { night: string | null; tonight: string | null; onPick: (night: string | null) => void }) {
  const { t, lang } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  // A browser without showPicker: the invisible input lies over the button and takes the tap itself.
  // (false on the server, so the first render matches; read once in the browser.)
  const overlay = useSyncExternalStore(subscribeNever, () => typeof HTMLInputElement.prototype.showPicker !== "function", () => false);
  const ready = night != null && tonight != null;
  const tomorrow = ready ? addDaysKey(tonight, 1) : "";
  const isTonight = ready && night === tonight;
  const isTomorrow = ready && night === tomorrow;
  const other = ready && !isTonight && !isTomorrow;
  const bounds = ready ? nightBounds(tonight) : null;
  const label = ready ? formatNightLabel(night, lang) : "…";

  function openPicker() {
    const el = inputRef.current;
    if (!el) return;
    try {
      if (typeof el.showPicker === "function") { el.showPicker(); return; }
    } catch { /* not allowed here: fall through to the click */ }
    el.focus();
    el.click();
  }

  return (
    <div role="group" aria-label={t("map_date_bar")} style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <button type="button" aria-pressed={isTonight} disabled={!ready} onClick={() => onPick(null)} style={dockChip(isTonight)}>{t("map_tonight")}</button>
      <button type="button" aria-pressed={isTomorrow} disabled={!ready} onClick={() => ready && onPick(tomorrow)} style={dockChip(isTomorrow)}>{t("map_tomorrow")}</button>
      <div style={{ position: "relative", flex: "none", display: "flex" }}>
        <button type="button" data-testid="map-date-button" disabled={!ready} onClick={openPicker}
          aria-label={`${t("map_pick_day")}: ${label}`} style={dockChip(other)}>
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none" }}>
            <rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" />
          </svg>
          <span data-testid="map-date-label">{label}</span>
        </button>
        <input ref={inputRef} type="date" data-testid="map-date-input" lang={lang} aria-label={t("map_pick_day")}
          tabIndex={-1} aria-hidden={overlay ? undefined : true}
          min={bounds?.min} max={bounds?.max} value={ready ? night : ""} disabled={!ready}
          onChange={(e) => { const v = e.target.value; if (v) onPick(v === tonight ? null : v); }}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, border: 0, padding: 0, margin: 0, cursor: "pointer", pointerEvents: overlay ? "auto" : "none", colorScheme: "dark" }} />
      </div>
    </div>
  );
}

export type PanelHandlers = {
  onToggleEventType: (t: (typeof EVENT_TYPES)[number]) => void;
  onToggleGenre: (key: string) => void;
  onSpotStatus: (s: SpotStatusFilter) => void;
  onToggleCategory: (key: (typeof SPOT_FILTER_CATEGORIES)[number]) => void;
  onToggleSub: (key: string) => void;
  onToggleWellnessSub: (key: string) => void;
};

const EVENT_TYPE_LABEL: Record<(typeof EVENT_TYPES)[number], TranslationKey> = {
  music: "event_cat_music", culture: "event_cat_culture", sports: "event_cat_sports", other: "event_cat_other",
};

const Divider = () => <span aria-hidden="true" style={{ flex: "none", width: 1, alignSelf: "stretch", background: LINE, margin: "4px 2px" }} />;

/**
 * The second row of the dock: the filters of the group in focus, as chips in one line (it scrolls
 * sideways). The subcategories of a picked Spots category come right after its chip.
 */
export function GroupFilterRow({ group, filters, handlers }: { group: GroupKey; filters: MapFilters; handlers: PanelHandlers }) {
  const { t, lang } = useLanguage();
  const color = MAP_GROUP_COLORS[group];

  if (group === "events") {
    return (
      <>
        {EVENT_TYPES.map((k) => (
          <button key={k} type="button" aria-pressed={filters.evTypes.includes(k)} onClick={() => handlers.onToggleEventType(k)} style={dockChip(filters.evTypes.includes(k), color)}>
            {t(EVENT_TYPE_LABEL[k])}
          </button>
        ))}
        <Divider />
        {GENRES.map((g) => (
          <button key={g.key} type="button" aria-pressed={filters.evGenres.includes(g.key)} onClick={() => handlers.onToggleGenre(g.key)} style={dockChip(filters.evGenres.includes(g.key), color)}>
            {g.label_el}
          </button>
        ))}
      </>
    );
  }

  if (group === "spots") {
    return (
      <>
        {([["all", "map_status_all"], ["open", "map_status_open_f"], ["closed", "map_status_closed_f"]] as const).map(([v, key]) => (
          <button key={v} type="button" aria-pressed={filters.spotStatus === v} data-testid={`map-status-${v}`} onClick={() => handlers.onSpotStatus(v)} style={dockChip(filters.spotStatus === v, color)}>
            {t(key)}
          </button>
        ))}
        <Divider />
        {SPOT_FILTER_CATEGORIES.map((c) => {
          const on = filters.categories.includes(c);
          return (
            <span key={c} style={{ display: "contents" }}>
              <button type="button" aria-pressed={on} onClick={() => handlers.onToggleCategory(c)} style={dockChip(on, MAP_CATEGORY_COLORS[c])}>
                <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: "50%", background: on ? "#0F0F1A" : MAP_CATEGORY_COLORS[c] }} />
                {spotCategoryLabel(c, lang)}
              </button>
              {on && SPOT_CATEGORIES.find((x) => x.key === c) && subsOf(c).map((s) => (
                <button key={s.key} type="button" aria-pressed={filters.subcategories.includes(s.key)} onClick={() => handlers.onToggleSub(s.key)}
                  style={{ ...dockChip(filters.subcategories.includes(s.key), MAP_CATEGORY_COLORS[c]), height: 30, fontSize: 12 }}>
                  {spotSubLabel(s.key, lang)}
                </button>
              ))}
            </span>
          );
        })}
      </>
    );
  }

  return (
    <>
      {subsOf("wellness").map((s) => (
        <button key={s.key} type="button" aria-pressed={filters.wellnessSubs.includes(s.key)} onClick={() => handlers.onToggleWellnessSub(s.key)} style={dockChip(filters.wellnessSubs.includes(s.key), color)}>
          {spotSubLabel(s.key, lang)}
        </button>
      ))}
    </>
  );
}

export const GROUP_LABEL: Record<GroupKey, TranslationKey> = { events: "map_events", spots: "map_spots", wellness: "map_wellness" };

// ── Legend ──────────────────────────────────────────────────────────────────

export function MapLegend() {
  const { t } = useLanguage();
  const uid = useId();
  const sw: React.CSSProperties = { width: 16, height: 16, display: "inline-block", boxSizing: "border-box", flex: "none", borderRadius: "50%" };
  return (
    <section aria-labelledby={uid}>
      <h3 id={uid} style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 600, color: MUTED }}>{t("map_legend_title")}</h3>
      <ul aria-label={t("map_legend")} data-testid="map-legend" className="nm-legend">
        <li><i aria-hidden="true" style={{ ...sw, background: "linear-gradient(135deg, #F5B335, #E8A020)" }} />{t("map_legend_active")}</li>
        <li><i aria-hidden="true" style={{ ...sw, background: "#6B6B80" }} />{t("map_legend_closed")}</li>
        <li><i aria-hidden="true" style={{ ...sw, background: "rgba(15,15,26,0.78)", border: "2px solid #E8A020" }} />{t("map_legend_unknown")}</li>
        <li><i aria-hidden="true" className="nm-legend-radar" style={{ ...sw, background: "linear-gradient(135deg, #F5B335, #E8A020)", boxShadow: "0 0 0 3px rgba(245,179,53,0.35)" }} />{t("map_legend_radar")}</li>
        <li><i aria-hidden="true" style={{ ...sw, background: "#4C8DFF", border: "2px solid #fff", boxShadow: "0 0 0 3px rgba(76,141,255,0.25)" }} />{t("map_legend_you")}</li>
      </ul>
    </section>
  );
}
