"use client";

import { forwardRef } from "react";
import Link from "next/link";
import { MAP_CATEGORY_COLORS, mapColorOf } from "../lib/mapColors";
import { directionsUrl, type MapPoint } from "../lib/mapFilters";
import { spotCategoryLabel, spotSubLabel } from "../lib/spotCategories";
import { SpotCategoryIcon } from "../lib/spotIcons";
import { useLanguage } from "../components/LanguageContext";
import type { SpotStatus } from "../lib/openingHours";

const badge: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 6, minHeight: 26, padding: "0 10px", borderRadius: 6,
  background: "#0F0F1A", fontSize: 12, color: "#fff",
};

/** "Sat 14 Nov · 22:00" in the page language. The date is a plain YYYY-MM-DD, read as a local date. */
function eventWhen(date: string, time: string | null, lang: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const day = new Date(y, (m || 1) - 1, d || 1).toLocaleDateString(lang === "en" ? "en-GB" : "el-GR", { weekday: "short", day: "numeric", month: "short" });
  return time ? `${day} · ${time.slice(0, 5)}` : day;
}

/**
 * The card of the picked point. Phone: a bottom sheet; desktop: a card over the
 * map (the layout is in the .nm-card rules of MapClient). A wellness point shows
 * how to get there, whether the night visit is confirmed and a Google Maps link;
 * a venue shows its categories and a link to its page; an event shows when and
 * where, with directions and a link to the event.
 */
const STATUS_STYLE: Record<SpotStatus, { bg: string; fg: string }> = {
  open: { bg: "#1B3A2C", fg: "#34D399" },
  closed: { bg: "#2A2A38", fg: "#A9ABC0" },
  unknown: { bg: "#2A2A38", fg: "#D5D6E3" },
};

/** `status` and `hoursLine` ("Τρίτη: 18:00-1:30") are for venues: read from their published hours at the picked night. */
const MapCard = forwardRef<HTMLDivElement, { point: MapPoint; status?: SpotStatus; hoursLine?: string | null; onClose: () => void }>(function MapCard({ point, status, hoursLine, onClose }, ref) {
  const { t, lang } = useLanguage();
  const primary = point.categories[0];
  const labels = [
    ...(point.kind === "spot" ? point.categories.map((c) => ({ key: c, text: spotCategoryLabel(c, lang), color: MAP_CATEGORY_COLORS[c] })) : []),
    ...point.subcategories.map((s) => ({ key: s, text: spotSubLabel(s, lang), color: mapColorOf(primary) })),
  ];
  return (
    <div ref={ref} role="dialog" aria-label={point.name} tabIndex={-1} className="nm-card">
      <div aria-hidden="true" className="nm-card-handle" />
      <button type="button" onClick={onClose} aria-label={t("map_close")} className="nm-card-close">
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>

      <div style={{ display: "flex", gap: 14 }}>
        {point.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={point.image} alt="" loading="lazy" style={{ flex: "none", width: 96, height: 96, borderRadius: 8, objectFit: "cover", background: "#16213E" }} />
        ) : (
          <div style={{ flex: "none", width: 96, height: 96, borderRadius: 8, background: "#16213E", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, color: "#A9ABC0", fontSize: 11, textAlign: "center", padding: 6, boxSizing: "border-box" }}>
            <SpotCategoryIcon category={primary} size={22} />
            {t("map_no_photo")}
          </div>
        )}
        <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 6, paddingRight: 36 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, lineHeight: 1.2, overflowWrap: "anywhere" }}>{point.name}</h2>
          {point.event ? (
            <>
              <div data-testid="map-card-when" style={{ fontSize: 14, color: "#E8A020", fontWeight: 600 }}>{eventWhen(point.event.date, point.event.time, lang)}</div>
              {(point.event.venue || point.area) && (
                <div style={{ fontSize: 14, color: "#A9ABC0" }}>{[point.event.venue, point.area].filter(Boolean).join(", ")}</div>
              )}
            </>
          ) : point.area && <div style={{ fontSize: 14, color: "#A9ABC0" }}>{point.area}</div>}
          {labels.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {labels.map((l) => (
                <span key={l.key} style={badge}>
                  <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: "50%", background: l.color }} />
                  {l.text}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {point.description && <p style={{ margin: "14px 0 0", fontSize: 14, lineHeight: 1.5, color: "#D5D6E3" }}>{point.description}</p>}

      {point.kind === "event" ? (
        <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
          <a href={directionsUrl(point.lat, point.lng)} target="_blank" rel="noopener noreferrer" className="nm-cta"
            style={{ marginTop: 0, flex: 1, width: "auto", background: "transparent", color: "#fff", border: "1px solid #3A3A55" }}>
            {t("map_event_directions")}
          </a>
          <Link href={`/events/${point.slug}`} className="nm-cta" style={{ marginTop: 0, flex: 1, width: "auto" }}>{t("map_view_event")}</Link>
        </div>
      ) : point.kind === "wellness" ? (
        <>
          {point.accessNote && (
            <div style={{ marginTop: 12, fontSize: 14, lineHeight: 1.45, color: "#D5D6E3" }}>
              <span style={{ color: "#A9ABC0" }}>{t("map_how_to_get")} </span>{point.accessNote}
            </div>
          )}
          <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, background: "#16213E", fontSize: 13, lineHeight: 1.4, color: "#D5D6E3" }}>
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A9ABC0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none" }}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
            <span>{point.verifiedNight ? t("map_night_yes") : t("map_night_no")}</span>
          </div>
          <a href={directionsUrl(point.lat, point.lng)} target="_blank" rel="noopener noreferrer" className="nm-cta">
            {t("map_directions")}
          </a>
        </>
      ) : (
        <>
          {status && (
            <div data-testid="map-card-status" style={{ marginTop: 12, display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <span style={{ ...badge, background: STATUS_STYLE[status].bg, color: STATUS_STYLE[status].fg, fontWeight: 600 }}>
                {t(status === "open" ? "map_spot_open" : status === "closed" ? "map_spot_closed" : "map_spot_unknown")}
              </span>
              {hoursLine && <span style={{ fontSize: 13, color: "#A9ABC0" }}>{hoursLine}</span>}
            </div>
          )}
          <Link href={`/spots/${point.slug}`} className="nm-cta">{t("map_view_spot")}</Link>
        </>
      )}
    </div>
  );
});

export default MapCard;
