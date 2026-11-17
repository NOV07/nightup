"use client";
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Same tile config and pin as components/maps/LocationPickerMap.tsx.
// Changing the provider here also means adding its host to img-src in next.config.ts.
const TILE_URL = process.env.NEXT_PUBLIC_MAP_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION = '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap</a>';
const ZOOM = 16;

const PIN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="40" viewBox="0 0 30 40" aria-hidden="true">
<path d="M15 1C7.3 1 1 7.2 1 14.9 1 25.3 15 39 15 39s14-13.7 14-24.1C29 7.2 22.7 1 15 1z" fill="#E8A020" stroke="#0F0F1A" stroke-width="1.5"/>
<circle cx="15" cy="15" r="5.5" fill="#0F0F1A"/></svg>`;

const CSS = `
.sp-minimap .leaflet-container { background: #16162a; font-family: inherit; }
.sp-minimap .leaflet-tile { outline: 1px solid transparent; }
.sp-minimap .nightup-map-pin { background: none; border: none; filter: drop-shadow(0 2px 3px rgba(0,0,0,0.55)); }
.sp-minimap .leaflet-control-attribution { background: rgba(15,15,26,0.8); color: rgba(255,255,255,0.65); font-size: 10px; }
.sp-minimap .leaflet-control-attribution a { color: #E8A020; }
`;

/** Read-only map: no drag, no zoom of any kind. The page scrolls over it. */
export default function SpotMiniMap({ lat, lng, label }: { lat: number; lng: number; label: string }) {
  const elRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    const map = L.map(el, {
      center: [lat, lng], zoom: ZOOM,
      dragging: false, scrollWheelZoom: false, touchZoom: false, doubleClickZoom: false,
      boxZoom: false, keyboard: false, zoomControl: false, attributionControl: false,
    });
    L.control.attribution({ prefix: false }).addTo(map);
    const pane = map.getPane("tilePane");
    if (pane) pane.style.filter = "invert(1) hue-rotate(180deg) brightness(0.9) contrast(0.9)";
    L.tileLayer(TILE_URL, { maxZoom: 19, attribution: ATTRIBUTION }).addTo(map);
    L.marker([lat, lng], {
      icon: L.divIcon({ className: "nightup-map-pin", html: PIN_SVG, iconSize: [30, 40], iconAnchor: [15, 39] }),
      interactive: false, keyboard: false,
    }).addTo(map);
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(el);
    return () => { ro.disconnect(); map.remove(); };
  }, [lat, lng]);

  return (
    <div className="sp-minimap" style={{ position: "absolute", inset: 0 }}>
      <style>{CSS}</style>
      <div ref={elRef} role="img" aria-label={label} style={{ position: "absolute", inset: 0 }} />
    </div>
  );
}
