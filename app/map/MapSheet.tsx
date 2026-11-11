"use client";

import { useEffect, useId, useRef, useSyncExternalStore, type ReactNode, type RefObject } from "react";
import { useLanguage } from "../components/LanguageContext";

const SIDE_QUERY = "(min-width: 900px)";
const subscribeSide = (cb: () => void) => {
  const mq = window.matchMedia(SIDE_QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
/** Wide screens (≥ 900px) get the filters as a column on the left instead of a bottom sheet. */
export const useSideLayout = (): boolean => useSyncExternalStore(subscribeSide, () => window.matchMedia(SIDE_QUERY).matches, () => false);

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * The filters of the map: a bottom sheet over the map on a phone (scrim, handle, at most 78% of the map),
 * a left column from 900px up (no scrim). A dialog: focus moves inside when it opens and goes back to
 * `returnFocus` when it closes; Esc, the scrim and the big button at the bottom close it; on a phone Tab
 * stays inside it.
 */
export default function MapSheet({ onClose, onClear, seeLabel, returnFocus, children }: {
  onClose: () => void;
  onClear: () => void;
  seeLabel: string;
  returnFocus: RefObject<HTMLElement | null>;
  children: ReactNode;
}) {
  const { t } = useLanguage();
  const side = useSideLayout();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; });

  useEffect(() => {
    const panel = panelRef.current;
    const back = returnFocus.current;
    panel?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); closeRef.current(); return; }
      if (e.key !== "Tab" || !panel || window.matchMedia(SIDE_QUERY).matches) return;
      const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (items.length === 0) return;
      const first = items[0], last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === panel)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); back?.focus({ preventScroll: true }); };
  }, [returnFocus]);

  return (
    <>
      {!side && <div className="nm-scrim" data-testid="map-scrim" aria-hidden="true" onClick={onClose} />}
      <div ref={panelRef} role="dialog" aria-modal={side ? undefined : true} aria-labelledby={titleId} tabIndex={-1} className="nm-sheet" data-testid="map-sheet">
        <div className="nm-sheet-top">
          <div aria-hidden="true" className="nm-sheet-handle" />
          <div className="nm-sheet-title">
            <h2 id={titleId}>{t("map_sheet_title")}</h2>
            <button type="button" className="nm-link" data-testid="map-clear-all" onClick={onClear}>{t("map_clear")}</button>
          </div>
        </div>
        <div className="nm-sheet-body">{children}</div>
        <div className="nm-sheet-foot">
          <button type="button" className="nm-go" data-testid="map-see" onClick={onClose}>{seeLabel}</button>
        </div>
      </div>
    </>
  );
}
