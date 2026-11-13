"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useLanguage } from "./LanguageContext";

// The map (Leaflet) is only fetched once this screen is mounted, i.e. after «Δες τη διαδρομή» is pressed.
const PublicMap = dynamic(() => import("@/components/maps/PublicMap"), {
  ssr: false,
  loading: () => <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "#12121F" }} />,
});

export interface RouteStep {
  key: string;
  kind: "spot" | "event";
  time: string;
  name: string;
  category: string;
  /** Today's opening hours line, when the spot has them. */
  hours: string | null;
  /** Second line (the venue of an event). */
  meta: string | null;
  lat: number;
  lng: number;
  /** Walk text from this step to the next, the same text the timeline shows. */
  walkAfter: string | null;
  eventId?: string;
}

const NOOP = () => {};
const G = "#E8A020";

export const mapsUrl = (lat: number, lng: number) => `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

export default function TonightRoute({ steps, onNavigate, loading }: { steps: RouteStep[]; onNavigate: () => void; loading?: boolean }) {
  const { t } = useLanguage();
  const route = {
    stops: steps.map((s) => ({ lat: s.lat, lng: s.lng, name: s.name })),
    legs: steps.slice(0, -1).map((s) => s.walkAfter ?? ""),
  };

  return (
    <div>
      <div className="tn-route-map" data-testid="tonight-route-map">
        {/* While this screen is only the «leaving» copy of the slide transition, no second map is created. */}
        {!loading && <PublicMap points={[]} selectedId={null} onSelect={NOOP} ariaLabel={t("tonight_route_map_aria")} quiet route={route} />}
      </div>

      <ol className="tn-route-list" style={{ listStyle: "none", margin: "18px 0 0", padding: 0 }}>
        {steps.map((s, i) => (
          <li key={s.key}>
            <div className="tn-route-card" style={card}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <span aria-hidden="true" style={badge}>{i + 1}</span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 11.5, color: G, fontWeight: 700, letterSpacing: "0.7px" }}>
                    {s.time ? `${s.time} · ` : ""}<span style={{ textTransform: "uppercase" }}>{s.category}</span>
                  </div>
                  <div style={{ fontFamily: "var(--font-spectral),serif", fontWeight: 600, fontSize: 16, color: "#F4F4F5", marginTop: 4, overflowWrap: "anywhere" }}>{s.name}</div>
                  {s.meta && <div style={{ fontSize: 12, color: "#A1A1AA", marginTop: 3, overflowWrap: "anywhere" }}>{s.meta}</div>}
                  {s.hours && <div style={{ fontSize: 12, color: "#A1A1AA", marginTop: 3 }}>{s.hours}</div>}
                </div>
              </div>
              {s.kind === "event" && s.eventId ? (
                <Link href={`/events/${s.eventId}`} onClick={onNavigate} className="tn-route-btn" style={btn}>{t("tonight_route_open_event")}</Link>
              ) : (
                <a href={mapsUrl(s.lat, s.lng)} target="_blank" rel="noopener noreferrer" className="tn-route-btn" style={btn}>{t("tonight_route_open_maps")} ↗</a>
              )}
            </div>
            {s.walkAfter && i < steps.length - 1 && (
              <div className="tn-walk" style={{ margin: "4px 0 4px 17px" }}>
                <span className="tn-walk-line" style={{ animation: "none" }} />
                <span className="tn-walk-txt" style={{ animation: "none" }}>· {s.walkAfter}</span>
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

const card: React.CSSProperties = {
  display: "flex", flexDirection: "column", gap: 12, padding: 14, borderRadius: 16,
  border: "1px solid rgba(255,255,255,0.055)", background: "#1A1A28",
};
const badge: React.CSSProperties = {
  flex: "none", width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
  background: "linear-gradient(135deg,#F5B335,#E8A020)", color: "#0F0F1A", fontWeight: 800, fontSize: 14,
};
const btn: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "center", minHeight: 44, boxSizing: "border-box", borderRadius: 12,
  border: "1px solid rgba(232,160,32,0.4)", background: "rgba(232,160,32,0.08)", color: G, fontWeight: 600, fontSize: 14, textDecoration: "none",
};
