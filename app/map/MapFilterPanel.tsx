"use client";

import { SPOT_CATEGORIES, subsOf, spotCategoryLabel, spotSubLabel, type SpotCategory } from "../lib/spotCategories";
import { MAP_CATEGORY_COLORS, MAP_EVENT_COLOR } from "../lib/mapColors";
import { hasFilters, type MapFilters } from "../lib/mapFilters";
import { useLanguage } from "../components/LanguageContext";

type Props = {
  filters: MapFilters;
  onToggleCategory: (key: SpotCategory) => void;
  onToggleSub: (key: string) => void;
  onToggleEvents: () => void;
  onClear: () => void;
};

const BORDER_OFF = "#2E2E46";

/** Desktop: a column with a checkbox tree. The subcategories of a category open under it when it is on. */
export function MapFilterSide({ filters, onToggleCategory, onToggleSub, onToggleEvents, onClear }: Props) {
  const { t, lang } = useLanguage();
  return (
    <div style={{ background: "#1A1A28", borderRadius: 8, padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{t("map_filters")}</h2>
        <button type="button" onClick={onClear} disabled={!hasFilters(filters)}
          style={{ minHeight: 44, padding: "0 4px", background: "transparent", border: 0, color: "#A9ABC0", fontSize: 13, cursor: hasFilters(filters) ? "pointer" : "default", opacity: hasFilters(filters) ? 1 : 0.5 }}>
          {t("map_clear")}
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {/* The events layer: a switch of its own, not a category. */}
        <button type="button" aria-pressed={filters.events} onClick={onToggleEvents} data-testid="map-events-toggle"
          style={{ width: "100%", minHeight: 48, padding: "0 12px", display: "flex", alignItems: "center", gap: 12, borderRadius: 8, background: filters.events ? "#16213E" : "transparent", border: 0, color: "#fff", fontSize: 15, cursor: "pointer", textAlign: "left" }}>
          <span aria-hidden="true" style={{ flex: "none", width: 20, height: 20, borderRadius: 4, boxSizing: "border-box", border: `2px solid ${filters.events ? MAP_EVENT_COLOR : "#4A4A66"}`, background: filters.events ? MAP_EVENT_COLOR : "transparent" }} />
          <span style={{ flex: 1, fontWeight: filters.events ? 600 : 400 }}>{t("map_events")}</span>
          <span aria-hidden="true" style={{ flex: "none", width: 9, height: 9, borderRadius: 2, transform: "rotate(45deg)", background: MAP_EVENT_COLOR }} />
        </button>
        <div aria-hidden="true" style={{ height: 1, background: "#2E2E46", margin: "4px 12px 6px" }} />
        {SPOT_CATEGORIES.map((c) => {
          const on = filters.categories.includes(c.key);
          const color = MAP_CATEGORY_COLORS[c.key];
          return (
            <div key={c.key} style={{ borderRadius: 8, background: on ? "#16213E" : "transparent" }}>
              <button type="button" aria-pressed={on} onClick={() => onToggleCategory(c.key)}
                style={{ width: "100%", minHeight: 48, padding: "0 12px", display: "flex", alignItems: "center", gap: 12, background: "transparent", border: 0, color: "#fff", fontSize: 15, cursor: "pointer", textAlign: "left" }}>
                <span aria-hidden="true" style={{ flex: "none", width: 20, height: 20, borderRadius: 4, boxSizing: "border-box", border: `2px solid ${on ? color : "#4A4A66"}`, background: on ? color : "transparent" }} />
                <span style={{ flex: 1, fontWeight: on ? 600 : 400 }}>{spotCategoryLabel(c.key, lang)}</span>
                <span aria-hidden="true" style={{ flex: "none", width: 10, height: 10, borderRadius: "50%", background: color }} />
              </button>
              {on && (
                <div style={{ padding: "0 12px 10px 44px", display: "flex", flexDirection: "column", gap: 2 }}>
                  {subsOf(c.key).map((s) => {
                    const subOn = filters.subcategories.includes(s.key);
                    return (
                      <button key={s.key} type="button" aria-pressed={subOn} onClick={() => onToggleSub(s.key)}
                        style={{ minHeight: 44, display: "flex", alignItems: "center", gap: 10, background: "transparent", border: 0, color: "#D5D6E3", fontSize: 14, cursor: "pointer", textAlign: "left" }}>
                        <span aria-hidden="true" style={{ flex: "none", width: 18, height: 18, borderRadius: 4, boxSizing: "border-box", border: `2px solid ${subOn ? color : "#4A4A66"}`, background: subOn ? color : "transparent" }} />
                        <span>{spotSubLabel(s.key, lang)}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const chip = (on: boolean, accent: string): React.CSSProperties => ({
  flex: "none", minHeight: 44, padding: "0 14px", borderRadius: 8, fontSize: 14, cursor: "pointer",
  display: "flex", alignItems: "center", gap: 8, color: "#fff", whiteSpace: "nowrap",
  background: on ? "#16213E" : "#1A1A28", border: `1px solid ${on ? accent : BORDER_OFF}`, fontWeight: on ? 600 : 400,
});

/** Phone: a row of category chips, then one row of subcategory chips for every selected category that has some. */
export function MapFilterBar({ filters, onToggleCategory, onToggleSub, onToggleEvents, onClear }: Props) {
  const { t, lang } = useLanguage();
  return (
    <div>
      <div style={{ display: "flex", gap: 8, padding: "0 16px 8px", overflowX: "auto" }} className="nm-scroll">
        <button type="button" aria-pressed={filters.events} onClick={onToggleEvents} data-testid="map-events-toggle" style={chip(filters.events, MAP_EVENT_COLOR)}>
          <span aria-hidden="true" style={{ width: 9, height: 9, borderRadius: 2, transform: "rotate(45deg)", background: MAP_EVENT_COLOR }} />
          {t("map_events")}
        </button>
        {SPOT_CATEGORIES.map((c) => {
          const on = filters.categories.includes(c.key);
          return (
            <button key={c.key} type="button" aria-pressed={on} onClick={() => onToggleCategory(c.key)} style={chip(on, "#fff")}>
              <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: "50%", background: MAP_CATEGORY_COLORS[c.key] }} />
              {spotCategoryLabel(c.key, lang)}
            </button>
          );
        })}
        {hasFilters(filters) && (
          <button type="button" onClick={onClear} style={{ ...chip(false, BORDER_OFF), background: "transparent", color: "#A9ABC0" }}>
            {t("map_clear")}
          </button>
        )}
      </div>
      {filters.categories.map((ck) => {
        const subs = subsOf(ck);
        if (!subs.length) return null;
        const color = MAP_CATEGORY_COLORS[ck];
        return (
          <div key={ck} style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 16px 8px", overflowX: "auto" }} className="nm-scroll">
            <span style={{ flex: "none", fontSize: 12, color: "#A9ABC0" }}>{spotCategoryLabel(ck, lang)}:</span>
            {subs.map((s) => (
              <button key={s.key} type="button" aria-pressed={filters.subcategories.includes(s.key)} onClick={() => onToggleSub(s.key)}
                style={chip(filters.subcategories.includes(s.key), color)}>
                {spotSubLabel(s.key, lang)}
              </button>
            ))}
          </div>
        );
      })}
    </div>
  );
}
