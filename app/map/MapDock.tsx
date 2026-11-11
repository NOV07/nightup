"use client";

import { useEffect, useRef, type RefObject } from "react";
import { GROUPS, type DockFocus, type GroupKey, type MapFilters } from "../lib/mapFilters";
import { formatNightLabel } from "../lib/mapDate";
import { MAP_GROUP_COLORS } from "../lib/mapColors";
import { useLanguage } from "../components/LanguageContext";
import { GROUP_LABEL, GroupFilterRow, MapDateBar, dockChip, type PanelHandlers } from "./MapFilterPanel";

/**
 * The filters of the map: a small bar at the bottom with at most two rows, over the map (which stays
 * visible and keeps moving). Row 1: the date and the three groups as chips, "Reset" when something differs
 * from the default, and a round ✕. Row 2 (only when a chip has the focus): the filters of that chip.
 * Not modal: no scrim. Esc and ✕ close it; the filters stay. Focus moves in when it opens and back to
 * `returnFocus` when it closes.
 */
export default function MapDock({ filters, night, tonight, focus, canReset, handlers, onTapDate, onTapGroup, onPickNight, onReset, onClose, returnFocus }: {
  filters: MapFilters;
  night: string | null;
  tonight: string | null;
  focus: DockFocus;
  canReset: boolean;
  handlers: PanelHandlers;
  onTapDate: () => void;
  onTapGroup: (g: GroupKey) => void;
  onPickNight: (night: string | null) => void;
  onReset: () => void;
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
  const dateLabel = !ready ? "…" : night === tonight ? t("map_tonight") : formatNightLabel(night, lang);
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
            return (
              <button key={g} type="button" data-testid={`dock-${g}`} aria-pressed={on} onClick={() => onTapGroup(g)}
                style={{ ...dockChip(on, MAP_GROUP_COLORS[g]), boxShadow: focus === g ? "0 0 0 2px rgba(232,160,32,0.35)" : undefined }}>
                {t(GROUP_LABEL[g])}
              </button>
            );
          })}
          {canReset && (
            <button type="button" className="nm-dock-reset" data-testid="dock-reset" onClick={onReset}>{t("map_reset")}</button>
          )}
        </div>
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
