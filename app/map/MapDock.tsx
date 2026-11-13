"use client";

import { useEffect, useRef, type RefObject } from "react";
import { TbCalendar, TbChevronDown } from "react-icons/tb";
import { GROUPS, type DockFocus, type GroupKey, type MapFilters } from "../lib/mapFilters";
import { formatNightLabel } from "../lib/mapDate";
import { addDaysKey } from "../lib/dateKey";
import { MAP_GROUP_COLORS } from "../lib/mapColors";
import { useLanguage } from "../components/LanguageContext";
import { GROUP_LABEL, GroupFilterRow, MapDateBar, dockChip, type PanelHandlers } from "./MapFilterPanel";

/**
 * The filters of the map: a small bar at the bottom with up to three rows, over the map (which stays
 * visible and keeps moving). Row 1: the three groups as pills (the label shows/hides the group, the arrow inside
 * opens its filters) and a round ✕. Row 2, plain text: the date on the left, "Clear" on the right (always there,
 * dimmed at the default). Row 3 (only when something has the focus): the filters of that group, or the date bar.
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
        <div className="nm-dock-groups">
          {GROUPS.map((g, i) => {
            const on = filters.shown.includes(g);
            const open = focus === g;
            const chip = dockChip(on, MAP_GROUP_COLORS[g]);
            // One pill: its border is drawn inside (box-shadow) so the label and the arrow are the full 34px tall.
            return (
              <span key={g} className="nm-pill" style={{ background: chip.background, color: chip.color, fontWeight: chip.fontWeight,
                boxShadow: `inset 0 0 0 1px ${MAP_GROUP_COLORS[g]}${on ? "" : "55"}${open ? ", 0 0 0 2px rgba(232,160,32,0.35)" : ""}` }}>
                <button ref={i === 0 ? firstRef : undefined} type="button" className="nm-pill-label" data-testid={`dock-${g}`} aria-pressed={on} onClick={() => onToggleGroup(g)}>
                  {t(GROUP_LABEL[g])}
                </button>
                <button type="button" className="nm-pill-caret" data-testid={`dock-caret-${g}`} aria-label={`${t("map_filters")}: ${t(GROUP_LABEL[g])}`}
                  aria-expanded={open} onClick={() => onToggleFocus(g)}>
                  <TbChevronDown aria-hidden="true" size={16} />
                </button>
              </span>
            );
          })}
        </div>
        <button type="button" className="nm-dock-x" data-testid="dock-close" aria-label={t("map_dock_close")} onClick={onClose}>
          <span aria-hidden="true">✕</span>
        </button>
      </div>
      <div className="nm-dock-bar">
        <button type="button" className="nm-dock-date" data-testid="dock-date" aria-pressed={focus === "date"} aria-label={`${t("map_date_bar")}: ${dateLabel}`}
          onClick={onTapDate} style={{ fontWeight: dateChanged ? 700 : 500, textDecoration: focus === "date" ? "underline" : undefined }}>
          <TbCalendar aria-hidden="true" size={16} /> {dateLabel}
        </button>
        <button type="button" className="nm-dock-reset" data-testid="dock-reset" disabled={!canClear} onClick={onClear}>{t("map_clear")}</button>
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
