"use client";

import { useId } from "react";
import {
  SPOT_CATEGORIES, subsOf, spotCategoryLabel, spotSubLabel,
} from "../lib/spotCategories";
import { GENRES } from "../lib/genres";
import { MAP_CATEGORY_COLORS, MAP_GROUP_COLORS } from "../lib/mapColors";
import {
  EVENT_TYPES, GROUPS, SPOT_FILTER_CATEGORIES, hasGroupFilters,
  type GroupKey, type MapFilters, type SpotStatusFilter,
} from "../lib/mapFilters";
import { addDaysKey } from "../lib/dateKey";
import { MAX_NIGHTS_AHEAD } from "../lib/athensTime";
import { useLanguage } from "../components/LanguageContext";
import type { TranslationKey } from "../lib/translations";

const LINE = "#3A3A55";
const MUTED = "#A9ABC0";

const chip = (on: boolean, accent: string): React.CSSProperties => ({
  flex: "none", minHeight: 44, padding: "0 14px", borderRadius: 8, fontSize: 14, cursor: "pointer",
  display: "inline-flex", alignItems: "center", gap: 8, color: on ? "#0F0F1A" : "#fff", whiteSpace: "nowrap", fontFamily: "inherit",
  background: on ? accent : "transparent", border: `1px solid ${on ? accent : LINE}`, fontWeight: on ? 700 : 500,
});

// ── Date bar ────────────────────────────────────────────────────────────────

/** "Tonight", "Tomorrow" and any day up to 60 nights ahead. `night` is the night in force. */
export function MapDateBar({ night, tonight, onPick }: { night: string | null; tonight: string | null; onPick: (night: string | null) => void }) {
  const { t, lang } = useLanguage();
  const ready = night != null && tonight != null;
  const tomorrow = ready ? addDaysKey(tonight, 1) : "";
  const isTonight = ready && night === tonight;
  const isTomorrow = ready && night === tomorrow;
  const other = ready && !isTonight && !isTomorrow;
  return (
    <div role="group" aria-label={t("map_date_bar")} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <button type="button" aria-pressed={isTonight} disabled={!ready} onClick={() => onPick(null)} style={chip(isTonight, "#E8A020")}>{t("map_tonight")}</button>
      <button type="button" aria-pressed={isTomorrow} disabled={!ready} onClick={() => ready && onPick(tomorrow)} style={chip(isTomorrow, "#E8A020")}>{t("map_tomorrow")}</button>
      <input type="date" aria-label={t("map_pick_day")} data-testid="map-date-input" lang={lang}
        min={ready ? tonight : undefined} max={ready ? addDaysKey(tonight, MAX_NIGHTS_AHEAD) : undefined}
        value={ready ? night : ""} disabled={!ready}
        onChange={(e) => { const v = e.target.value; if (v) onPick(v === tonight ? null : v); }}
        style={{
          flex: "1 1 140px", minWidth: 0, minHeight: 44, borderRadius: 8, padding: "0 10px", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box",
          background: "#1A1A28", color: "#fff", colorScheme: "dark", border: `1px solid ${other ? "#E8A020" : LINE}`,
        }} />
    </div>
  );
}

// ── Group boxes ─────────────────────────────────────────────────────────────

const GROUP_LABEL: Record<GroupKey, TranslationKey> = { events: "map_events", spots: "map_spots", wellness: "map_wellness" };

/** Three boxes. The dot shows or hides the layer; the name opens or closes that group's filters. */
export function MapGroupBar({ filters, counts, open, panelId, onToggleLayer, onToggleOpen }: {
  filters: MapFilters;
  counts: Record<GroupKey, number> | null;
  open: GroupKey | null;
  panelId: string;
  onToggleLayer: (g: GroupKey) => void;
  onToggleOpen: (g: GroupKey) => void;
}) {
  const { t } = useLanguage();
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {GROUPS.map((g) => {
        const visible = !filters.hidden.includes(g);
        const isOpen = open === g;
        const color = MAP_GROUP_COLORS[g];
        const name = t(GROUP_LABEL[g]);
        return (
          <div key={g} data-testid={`map-group-${g}`} style={{
            display: "flex", alignItems: "center", flex: 1, minWidth: 0, height: 44, borderRadius: 8, overflow: "hidden", boxSizing: "border-box",
            border: `1px solid ${isOpen ? color : LINE}`, opacity: visible ? 1 : 0.55,
          }}>
            <button type="button" aria-pressed={visible} aria-label={`${t("map_show_layer")} ${name}`} data-testid={`map-layer-${g}`}
              onClick={() => onToggleLayer(g)}
              style={{ flex: "none", width: 32, height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: 0, cursor: "pointer", padding: 0 }}>
              <span aria-hidden="true" style={{ width: 14, height: 14, borderRadius: g === "events" ? 3 : g === "wellness" ? "50%" : 4, transform: g === "events" ? "rotate(45deg) scale(.85)" : undefined, boxSizing: "border-box", border: `2px solid ${color}`, background: visible ? color : "transparent", display: "block" }} />
            </button>
            <button type="button" aria-expanded={isOpen} aria-controls={panelId} data-testid={`map-open-${g}`}
              aria-label={`${t("map_filters")}: ${name}`} onClick={() => onToggleOpen(g)}
              style={{ flex: 1, minWidth: 0, height: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, background: "none", border: 0, color: "#fff", textAlign: "left", cursor: "pointer", padding: "0 6px 0 0", fontFamily: "inherit" }}>
              <span style={{ minWidth: 0, display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
                <span style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
                <span style={{ fontSize: 11, color: MUTED, fontWeight: 400, whiteSpace: "nowrap" }}>
                  <span data-testid={`map-count-${g}`}>{counts ? counts[g] : "…"}</span>
                  {hasGroupFilters(filters, g) && <span aria-hidden="true" style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: color, marginLeft: 5, verticalAlign: "middle" }} />}
                </span>
              </span>
              <span aria-hidden="true" style={{ color: MUTED, fontSize: 10, flex: "none" }}>{isOpen ? "▴" : "▾"}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ── The open group's filters ────────────────────────────────────────────────

export type PanelHandlers = {
  onToggleEventType: (t: (typeof EVENT_TYPES)[number]) => void;
  onToggleGenre: (key: string) => void;
  onSpotStatus: (s: SpotStatusFilter) => void;
  onToggleCategory: (key: (typeof SPOT_FILTER_CATEGORIES)[number]) => void;
  onToggleSub: (key: string) => void;
  onToggleWellnessSub: (key: string) => void;
  onClearGroup: (g: GroupKey) => void;
};

const rowTitle: React.CSSProperties = { margin: "10px 0 6px", fontSize: 12, fontWeight: 600, color: MUTED };
const rowWrap: React.CSSProperties = { display: "flex", flexWrap: "wrap", gap: 6 };

const EVENT_TYPE_LABEL: Record<(typeof EVENT_TYPES)[number], TranslationKey> = {
  music: "event_cat_music", culture: "event_cat_culture", sports: "event_cat_sports", other: "event_cat_other",
};

export function MapGroupPanel({ group, filters, id, handlers }: { group: GroupKey | null; filters: MapFilters; id: string; handlers: PanelHandlers }) {
  const { t, lang } = useLanguage();
  const uid = useId();
  if (!group) return <div id={id} hidden />;
  const color = MAP_GROUP_COLORS[group];
  return (
    <div id={id} role="region" aria-label={`${t("map_filters")}: ${t(GROUP_LABEL[group])}`} data-testid="map-panel"
      className="nm-panel" style={{ background: "#1A1A28", borderBottom: "1px solid #22223A" }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="button" onClick={() => handlers.onClearGroup(group)} disabled={!hasGroupFilters(filters, group)}
          style={{ minHeight: 32, background: "transparent", border: 0, color: MUTED, fontSize: 12, cursor: hasGroupFilters(filters, group) ? "pointer" : "default", opacity: hasGroupFilters(filters, group) ? 1 : 0.5, fontFamily: "inherit" }}>
          {t("map_clear")}
        </button>
      </div>

      {group === "events" && (
        <>
          <h3 style={{ ...rowTitle, marginTop: 0 }}>{t("map_event_type")}</h3>
          <div style={rowWrap}>
            {EVENT_TYPES.map((k) => (
              <button key={k} type="button" aria-pressed={filters.evTypes.includes(k)} onClick={() => handlers.onToggleEventType(k)} style={chip(filters.evTypes.includes(k), color)}>
                {t(EVENT_TYPE_LABEL[k])}
              </button>
            ))}
          </div>
          <h3 style={rowTitle}>{t("map_event_genre")}</h3>
          <div style={rowWrap}>
            {GENRES.map((g) => (
              <button key={g.key} type="button" aria-pressed={filters.evGenres.includes(g.key)} onClick={() => handlers.onToggleGenre(g.key)} style={chip(filters.evGenres.includes(g.key), color)}>
                {g.label_el}
              </button>
            ))}
          </div>
        </>
      )}

      {group === "spots" && (
        <>
          <h3 id={`${uid}-st`} style={{ ...rowTitle, marginTop: 0 }}>{t("map_status")}</h3>
          <div role="group" aria-labelledby={`${uid}-st`} style={{ display: "flex", border: `1px solid ${LINE}`, borderRadius: 8, overflow: "hidden", width: "fit-content", maxWidth: "100%" }}>
            {([["all", "map_status_all"], ["open", "map_status_open_f"], ["closed", "map_status_closed_f"]] as const).map(([v, key]) => (
              <button key={v} type="button" aria-pressed={filters.spotStatus === v} data-testid={`map-status-${v}`} onClick={() => handlers.onSpotStatus(v)}
                style={{ minHeight: 44, padding: "0 16px", border: 0, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", background: filters.spotStatus === v ? color : "transparent", color: filters.spotStatus === v ? "#0F0F1A" : "#fff" }}>
                {t(key)}
              </button>
            ))}
          </div>
          <h3 style={rowTitle}>{t("map_category")}</h3>
          <div style={rowWrap}>
            {SPOT_FILTER_CATEGORIES.map((c) => {
              const on = filters.categories.includes(c);
              return (
                <button key={c} type="button" aria-pressed={on} onClick={() => handlers.onToggleCategory(c)} style={chip(on, MAP_CATEGORY_COLORS[c])}>
                  <span aria-hidden="true" style={{ width: 9, height: 9, borderRadius: "50%", background: on ? "#0F0F1A" : MAP_CATEGORY_COLORS[c] }} />
                  {spotCategoryLabel(c, lang)}
                </button>
              );
            })}
          </div>
          {SPOT_CATEGORIES.filter((c) => c.key !== "wellness" && filters.categories.includes(c.key)).map((c) => (
            <div key={c.key}>
              <h3 style={rowTitle}>{spotCategoryLabel(c.key, lang)}: {t("map_subcategory")}</h3>
              <div style={rowWrap}>
                {subsOf(c.key).map((s) => (
                  <button key={s.key} type="button" aria-pressed={filters.subcategories.includes(s.key)} onClick={() => handlers.onToggleSub(s.key)} style={chip(filters.subcategories.includes(s.key), MAP_CATEGORY_COLORS[c.key])}>
                    {spotSubLabel(s.key, lang)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </>
      )}

      {group === "wellness" && (
        <>
          <h3 style={{ ...rowTitle, marginTop: 0 }}>{t("map_subcategory")}</h3>
          <div style={rowWrap}>
            {subsOf("wellness").map((s) => (
              <button key={s.key} type="button" aria-pressed={filters.wellnessSubs.includes(s.key)} onClick={() => handlers.onToggleWellnessSub(s.key)} style={chip(filters.wellnessSubs.includes(s.key), color)}>
                {spotSubLabel(s.key, lang)}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Legend ──────────────────────────────────────────────────────────────────

export function MapLegend() {
  const { t } = useLanguage();
  const sw: React.CSSProperties = { width: 12, height: 12, display: "inline-block", boxSizing: "border-box", flex: "none" };
  const cats = `linear-gradient(135deg, ${MAP_CATEGORY_COLORS.drink} 0 33%, ${MAP_CATEGORY_COLORS.nightlife} 33% 66%, ${MAP_CATEGORY_COLORS.food} 66%)`;
  return (
    <ul aria-label={t("map_legend")} data-testid="map-legend" className="nm-legend">
      <li><i aria-hidden="true" style={{ ...sw, background: "#E8A020", borderRadius: 2, transform: "rotate(45deg) scale(.8)" }} />{t("map_legend_event")}</li>
      <li><i aria-hidden="true" style={{ ...sw, background: cats, borderRadius: 3 }} />{t("map_legend_open")}</li>
      <li><i aria-hidden="true" style={{ ...sw, background: "#6B6B80", borderRadius: 3 }} />{t("map_legend_closed")}</li>
      <li><i aria-hidden="true" style={{ ...sw, border: "2px solid #D5D6E3", borderRadius: 3 }} />{t("map_legend_unknown")}</li>
      <li><i aria-hidden="true" style={{ ...sw, background: "#4FC3A1", borderRadius: "50%" }} />{t("map_legend_wellness")}</li>
    </ul>
  );
}
