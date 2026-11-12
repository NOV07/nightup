"use client";

import { useEffect, useRef, type RefObject } from "react";
import { GROUPS, type DockFocus, type GroupKey, type MapFilters } from "../lib/mapFilters";
import { formatNightLabel } from "../lib/mapDate";
import { addDaysKey } from "../lib/dateKey";
import { MAP_GROUP_COLORS } from "../lib/mapColors";
import { useLanguage } from "../components/LanguageContext";
import { GROUP_LABEL, GroupFilterRow, MapDateBar, dockChip, type PanelHandlers } from "./MapFilterPanel";

/**
 * The filters of the map: a small bar at the bottom with at most two rows, over the map (which stays
 * visible and keeps moving). Row 1: the date and the three groups as chips, "Clear" (always there, dimmed at the default), and a round ✕. Row 2 (only when a chip has the focus): the filters of that chip.
 * Not modal: no scrim. Esc and ✕ close it; the filters stay. Focus moves in when it opens and back to
 * `returnFocus` when it closes.
 */
export default function MapDock({ filters, night, tonight, focus, canClear, handlers, onTapDate, onToggleGroup, onToggleFocus, onPickNight, onClear, onClose, returnFocus }: {
  filters: MapFilters;
  night: string | null;
  tonight: string | null;
  focus: DockFocus;
  canClear: boolean;
  handlers: PanelHandlers;
  onTapDate: () => void;
  onToggleGroup: (g: GroupKey) => void;
  onToggleFocus: (g: GroupKey) => void;
  onPickNight: (night: string | null) => void;
  onClear: () => void;
  onClose: () => void;
  returnFocus: RefObject<HTMLElement | null>;
}) {
  const { t, lang } = useLanguage();
  const firstRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; });

  useEffect(() => {
    firstRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !e.defaultPrevented) closeRef.current(); };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      // The filter button is drawn again as the dock goes: give it focus on the next frame.
      // eslint-disable-next-line react-hooks/exhaustive-deps -- the button is a different node by then, so the ref is read on purpose
      requestAnimationFrame(() => returnFocus.current?.focus({ preventScroll: true }));
    };
  }, [returnFocus]);

  const ready = night != null && tonight != null;
  const dateLabel = !ready ? "…" : night === tonight ? t("map_tonight") : night === addDaysKey(tonight, 1) ? t("map_tomorrow") : formatNightLabel(night, lang);
  const dateChanged = ready && night !== tonight;

  return (
    <div role="region" aria-label={t("map_filters")} className="nm-dock" data-testid="map-dock">
      <div className="nm-dock-r1">
        <div className="nm-dock-chips">
          <button ref={firstRef} type="button" data-testid="dock-date" aria-pressed={focus === "date"} aria-label={`${t("map_date_bar")}: ${dateLabel}`}
            onClick={onTapDate} style={{ ...dockChip(dateChanged), boxShadow: focus === "date" ? "0 0 0 2px rgba(232,160,32,0.35)" : undefined }}>
            <span aria-hidden="true">📅</span> {dateLabel}
          </button>
          {GROUPS.map((g) => {
            const on = filters.shown.includes(g);
            const open = focus === g;
            return (
              <span key={g} className="nm-dock-grp">
                <button type="button" data-testid={`dock-${g}`} aria-pressed={on} onClick={() => onToggleGroup(g)} style={dockChip(on, MAP_GROUP_COLORS[g])}>
                  {t(GROUP_LABEL[g])}
                </button>
                <button type="button" className="nm-dock-arrow" data-testid={`dock-${g}-filters`} aria-label={`${t("map_filters")}: ${t(GROUP_LABEL[g])}`}
                  aria-expanded={open} onClick={() => onToggleFocus(g)} style={open ? { borderColor: MAP_GROUP_COLORS[g], boxShadow: "0 0 0 2px rgba(232,160,32,0.35)" } : undefined}>
                  <span aria-hidden="true">▾</span>
                </button>
              </span>
            );
          })}
        </div>
        <button type="button" className="nm-dock-clear" data-testid="dock-clear" disabled={!canClear} onClick={onClear}>{t("map_clear")}</button>
        <button type="button" className="nm-dock-x" data-testid="dock-close" aria-label={t("map_dock_close")} onClick={onClose}>
          <span aria-hidden="true">✕</span>
        </button>
      </div>
      {focus && (
        <div className="nm-dock-r2" data-testid="dock-row2">
          {focus === "date"
            ? <MapDateBar night={night} tonight={tonight} onPick={onPickNight} />
            : <GroupFilterRow group={focus} filters={filters} handlers={handlers} />}
        </div>
      )}
    </div>
  );
}
