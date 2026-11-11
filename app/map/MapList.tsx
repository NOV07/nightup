"use client";

import { mapEmojiOf } from "../lib/mapEmoji";
import { sortForList } from "../lib/mapList";
import { formatDistance, type LatLng } from "../lib/mapNear";
import type { MapPoint } from "../lib/mapFilters";
import type { SpotStatus } from "../lib/openingHours";
import { spotCategoryLabel, spotSubLabel } from "../lib/spotCategories";
import { useLanguage } from "../components/LanguageContext";

/** Round emoji icon, the same look as the pin (gold = active, grey = closed, dark with gold ring = no hours). */
function Icon({ point, status }: { point: MapPoint; status?: SpotStatus }) {
  const cls = `nm-ico${status === "closed" ? " is-closed" : status === "unknown" ? " is-unknown" : ""}${point.event?.radar ? " is-radar" : ""}`;
  return <span aria-hidden="true" className={cls}><span>{mapEmojiOf(point)}</span></span>;
}

/**
 * The same points as the map, as a list. A tap opens the same card. Venues say if they are open,
 * and when a position is known every row says how far it is (the list is then nearest first).
 */
export default function MapList({ points, closingSoon, statusById, here, selectedId, onPick }: {
  points: readonly MapPoint[];
  closingSoon: ReadonlySet<string>;
  statusById?: Record<string, SpotStatus>;
  here: LatLng | null;
  selectedId: string | null;
  onPick: (id: string) => void;
}) {
  const { t, lang } = useLanguage();
  const entries = sortForList(points, here);
  const units = { km: t("map_unit_km"), m: t("map_unit_m") };
  const locale = lang === "en" ? "en-GB" : "el-GR";

  const subtitle = (p: MapPoint): string => {
    if (p.event) return [p.event.time ? p.event.time.slice(0, 5) : null, p.event.venue ?? p.area].filter(Boolean).join(" · ");
    const label = p.kind === "wellness" ? (p.subcategories[0] ? spotSubLabel(p.subcategories[0], lang) : "") : spotCategoryLabel(p.categories[0], lang);
    return [label, p.area].filter(Boolean).join(" · ");
  };
  const statusText = (s: SpotStatus) => t(s === "open" ? "map_spot_open" : s === "closed" ? "map_spot_closed" : "map_spot_unknown");

  return (
    <ul className="nm-list" aria-label={t("map_list_aria")} data-testid="map-list">
      {entries.map(({ point: p, distanceKm }) => {
        const st = p.kind === "spot" ? statusById?.[p.id] : undefined;
        return (
          <li key={p.id}>
            <button type="button" className="nm-row" data-list-item={p.id} aria-pressed={p.id === selectedId} onClick={() => onPick(p.id)}>
              <Icon point={p} status={st} />
              <span className="nm-row-main">
                <span className="nm-row-name">{p.name}</span>
                <span className="nm-row-sub">{subtitle(p)}</span>
                {p.event?.radar && <span className="nm-row-radar">{t("map_radar_badge")}</span>}
              </span>
              <span className="nm-row-side">
                {st && <span className={`nm-row-status is-${st}`}>{statusText(st)}</span>}
                {closingSoon.has(p.id) && <span className="nm-row-soon" data-testid="map-list-soon">{t("map_closing_soon")}</span>}
                {distanceKm !== null && <span className="nm-row-dist" data-testid="map-list-dist">{formatDistance(distanceKm, units, locale)}</span>}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
