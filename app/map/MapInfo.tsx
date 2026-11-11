"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useLanguage } from "../components/LanguageContext";
import { MapLegend } from "./MapFilterPanel";

/**
 * The legend, behind a small round ⓘ at the top right of the map. It opens a small popover; Esc, a tap
 * outside or the ⓘ again close it. (Esc is caught first, so it does not also close the filter dock.)
 */
export default function MapInfo() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const id = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      e.preventDefault();
      setOpen(false);
      btnRef.current?.focus({ preventScroll: true });
    };
    const onDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("pointerdown", onDown, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("pointerdown", onDown, true);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="nm-info">
      <button ref={btnRef} type="button" className="nm-info-btn" data-testid="map-info" aria-label={t("map_legend_title")}
        aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
        <span aria-hidden="true">ⓘ</span>
      </button>
      {open && (
        <div id={id} className="nm-info-pop" data-testid="map-info-pop">
          <MapLegend />
        </div>
      )}
    </div>
  );
}
