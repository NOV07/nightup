"use client";

import Link from "next/link";
import type { Spot } from "../spots/types";

const PLACE = "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&q=80";

function priceStr(level: number | null) {
  return level ? "€".repeat(level) : "";
}

export default function SpotCard({
  spot,
  compact = false,
  onNavigate,
}: {
  spot: Spot;
  compact?: boolean;
  onNavigate?: () => void;
}) {
  const img = spot.coverImage || PLACE;

  if (compact) {
    return (
      <Link href={`/spots/${spot.slug}`} onClick={onNavigate} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
        <div
          style={{
            display: "flex",
            gap: 13,
            background: "#1A1A28",
            border: "1px solid rgba(255,255,255,0.055)",
            borderRadius: 6,
            padding: 11,
            cursor: "pointer",
            transition: "all .25s cubic-bezier(.22,.61,.36,1)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "rgba(232,160,32,0.15)";
            e.currentTarget.style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.055)";
            e.currentTarget.style.transform = "none";
          }}
        >
          <div
            style={{
              width: 78,
              height: 78,
              borderRadius: 6,
              flexShrink: 0,
              backgroundImage: `url('${img}')`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              position: "relative",
            }}
          >
            {spot.isSponsored && <SponsoredBadge />}
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", minWidth: 0 }}>
            <div style={{ fontFamily: "var(--font-spectral), Georgia, serif", fontWeight: 600, fontSize: 16.5, color: "#F4F4F5" }}>
              {spot.name}
            </div>
            <div style={{ fontSize: 12, color: "#A1A1AA", marginTop: 3 }}>
              {[spot.subcategory, spot.neighborhood].filter(Boolean).join(" · ")}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, fontSize: 11.5, color: "#71717A" }}>
              {spot.rating != null && <span style={{ color: "#E8A020" }}>★ {spot.rating}</span>}
              <span>{priceStr(spot.priceLevel)}</span>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // Full κάθετο card — για το grid της /spots
  return (
    <Link href={`/spots/${spot.slug}`} onClick={onNavigate} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
      <div
        style={{
          background: "#1A1A28",
          border: "1px solid rgba(255,255,255,0.055)",
          borderRadius: 6,
          overflow: "hidden",
          cursor: "pointer",
          transition: "all .3s cubic-bezier(.22,.61,.36,1)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "rgba(232,160,32,0.15)";
          e.currentTarget.style.transform = "translateY(-4px)";
          e.currentTarget.style.boxShadow = "0 18px 40px rgba(0,0,0,0.4)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.055)";
          e.currentTarget.style.transform = "none";
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        <div
          style={{
            height: 170,
            backgroundImage: `url('${img}')`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            position: "relative",
          }}
        >
          {spot.isSponsored && <SponsoredBadge />}
        </div>
        <div style={{ padding: "15px 16px 16px" }}>
          <div style={{ fontFamily: "var(--font-spectral), Georgia, serif", fontWeight: 600, fontSize: 18, color: "#F4F4F5", letterSpacing: "-0.2px" }}>
            {spot.name}
          </div>
          <div style={{ fontSize: 12.5, color: "#A1A1AA", marginTop: 5 }}>
            {[spot.subcategory, spot.neighborhood].filter(Boolean).join(" · ")}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12, fontSize: 12.5, color: "#71717A" }}>
            {spot.rating != null && <span style={{ color: "#E8A020", fontWeight: 600 }}>★ {spot.rating}</span>}
            <span style={{ color: "#A1A1AA" }}>{priceStr(spot.priceLevel)}</span>
            {spot.neighborhood && <span style={{ marginLeft: "auto" }}>📍 {spot.neighborhood}</span>}
          </div>
        </div>
      </div>
    </Link>
  );
}

function SponsoredBadge() {
  return (
    <span
      style={{
        position: "absolute",
        top: 8,
        left: 8,
        zIndex: 2,
        background: "rgba(10,10,18,0.78)",
        color: "#E8A020",
        fontSize: 8.5,
        fontWeight: 700,
        letterSpacing: "0.5px",
        padding: "3px 7px",
        borderRadius: 4,
        backdropFilter: "blur(6px)",
        border: "1px solid rgba(232,160,32,0.15)",
      }}
    >
      SPONSORED
    </span>
  );
}
