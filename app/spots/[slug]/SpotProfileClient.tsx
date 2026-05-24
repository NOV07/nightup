"use client";

import Link from "next/link";
import type { Spot } from "../types";

type FullSpot = Spot & { gallery: string[]; openingHours: Record<string, string> | null };

const CAT_LABEL: Record<string, string> = {
  food: "Φαγητό", drink: "Ποτό", nightlife: "Νύχτα", show: "Θέαμα", chill: "Χαλαρά", activity: "Δραστηριότητα",
};
const PLACE = "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&q=80";

export default function SpotProfileClient({ spot }: { spot: FullSpot }) {
  const cover = spot.coverImage || PLACE;
  const price = spot.priceLevel ? "€".repeat(spot.priceLevel) : null;
  const mapUrl = spot.lat && spot.lng
    ? `https://www.google.com/maps/search/?api=1&query=${spot.lat},${spot.lng}`
    : spot.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(spot.address + " " + spot.city)}` : null;

  return (
    <div style={{ background: "#0F0F1A", minHeight: "100vh" }}>
      {/* Cover */}
      <div style={{ position: "relative", height: 340, overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: `url('${cover}')`, backgroundSize: "cover", backgroundPosition: "center" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, #0F0F1A, rgba(15,15,26,0.3) 55%, rgba(15,15,26,0.5))" }} />
        <div style={{ position: "relative", maxWidth: "56rem", margin: "0 auto", padding: "0 24px", height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", paddingBottom: 28 }}>
          <Link href="/spots" style={{ position: "absolute", top: 20, left: 24, color: "#fff", fontSize: 14, fontWeight: 600, background: "rgba(0,0,0,0.4)", padding: "8px 14px", borderRadius: 6, backdropFilter: "blur(8px)" }}>‹ Spots</Link>
          {spot.isSponsored && (
            <span style={{ alignSelf: "flex-start", marginBottom: 12, background: "rgba(10,10,18,0.78)", color: "#E8A020", fontSize: 10, fontWeight: 700, letterSpacing: "0.6px", padding: "5px 10px", borderRadius: 4, border: "1px solid rgba(232,160,32,0.15)" }}>SPONSORED</span>
          )}
          <div style={{ fontSize: 11, letterSpacing: "2.5px", textTransform: "uppercase", color: "#E8A020", fontWeight: 700 }}>
            {CAT_LABEL[spot.category]}{spot.subcategory ? ` · ${spot.subcategory}` : ""}
          </div>
          <h1 style={{ fontFamily: "var(--font-spectral),serif", fontWeight: 700, fontSize: 44, letterSpacing: "-1.2px", marginTop: 8, lineHeight: 1 }}>{spot.name}</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 14, fontSize: 14, color: "#A1A1AA" }}>
            {spot.rating != null && <span style={{ color: "#E8A020", fontWeight: 600 }}>★ {spot.rating}</span>}
            {price && <span>{price}</span>}
            {spot.neighborhood && <span>📍 {spot.neighborhood}</span>}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "32px 24px 80px", display: "grid", gridTemplateColumns: "1fr", gap: 28 }}>
        {/* Description */}
        {spot.description && (
          <p style={{ fontSize: 16, lineHeight: 1.65, color: "#D4D4D8", maxWidth: 640 }}>{spot.description}</p>
        )}

        {/* Gallery */}
        {spot.gallery && spot.gallery.length > 0 && (
          <div>
            <h2 style={sectionTitle}>Gallery</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px,1fr))", gap: 12, marginTop: 14 }}>
              {spot.gallery.map((g, i) => (
                <div key={i} style={{ height: 130, borderRadius: 6, backgroundImage: `url('${g}')`, backgroundSize: "cover", backgroundPosition: "center" }} />
              ))}
            </div>
          </div>
        )}

        {/* Info grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))", gap: 14 }}>
          {spot.address && <InfoCard label="Διεύθυνση" value={spot.address} />}
          {spot.phone && <InfoCard label="Τηλέφωνο" value={spot.phone} href={`tel:${spot.phone}`} />}
          {spot.website && <InfoCard label="Website" value={spot.website.replace(/^https?:\/\//, "")} href={spot.website} />}
          {spot.instagram && <InfoCard label="Instagram" value={`@${spot.instagram}`} href={`https://instagram.com/${spot.instagram}`} />}
        </div>

        {/* Opening hours */}
        {spot.openingHours && Object.keys(spot.openingHours).length > 0 && (
          <div>
            <h2 style={sectionTitle}>Ωράριο</h2>
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6, maxWidth: 320 }}>
              {Object.entries(spot.openingHours).map(([day, hrs]) => (
                <div key={day} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "#A1A1AA", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <span>{day}</span><span style={{ color: "#F4F4F5" }}>{String(hrs)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Map button */}
        {mapUrl && (
          <a href={mapUrl} target="_blank" rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, background: "linear-gradient(100deg,#E8A020,#F5B335)", color: "#1a1407", fontFamily: "var(--font-spectral),serif", fontWeight: 700, fontSize: 15, padding: "14px 24px", borderRadius: 6, maxWidth: 280, boxShadow: "0 12px 30px rgba(232,160,32,0.25)" }}>
            📍 Άνοιξε στον χάρτη
          </a>
        )}
      </div>
    </div>
  );
}

const sectionTitle: React.CSSProperties = {
  fontFamily: "var(--font-spectral),serif", fontWeight: 600, fontSize: 22, letterSpacing: "-0.4px", color: "#F4F4F5",
};

function InfoCard({ label, value, href }: { label: string; value: string; href?: string }) {
  const inner = (
    <div style={{ background: "#1A1A28", border: "1px solid rgba(255,255,255,0.055)", borderRadius: 6, padding: "14px 16px" }}>
      <div style={{ fontSize: 11, letterSpacing: "1px", textTransform: "uppercase", color: "#71717A", fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 14.5, color: href ? "#E8A020" : "#F4F4F5", marginTop: 6, wordBreak: "break-word" }}>{value}</div>
    </div>
  );
  return href ? <a href={href} target="_blank" rel="noopener noreferrer">{inner}</a> : inner;
}
