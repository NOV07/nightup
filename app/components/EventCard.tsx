"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { MouseEvent } from "react";
import { FiHeart } from "react-icons/fi";
import { FaHeart } from "react-icons/fa";
import { RadarBadge } from "./RadarBadge";

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80";

interface EventCardProps {
  id: string;
  title: string;
  image?: string;
  image_url?: string;
  genre: string;
  price: string | number | null | undefined;
  date: string;
  venue: string;
  city: string;
  interestedCount: number;
  goingCount: number;
  time?: string;
  featured?: boolean;
  hotCount?: number;
  badge?: string;
  organizerName?: string;
  organizerSlug?: string;
}

function formatPrice(price: string | number | null | undefined): string {
  if (price === 0 || price === null || price === undefined || price === "") return "Free";
  const s = String(price).trim();
  if (/^(free|δωρεάν)$/i.test(s)) return "Free";
  const num = s.replace(/^[€$]/, "");
  if (!/^\d/.test(num)) return num;
  return `€${num}`;
}

const genreColors: Record<string, string> = {
  Techno:       "#E8A020",
  House:        "#A855F7",
  "Deep House": "#3B82F6",
  "Hip-Hop":    "#EC4899",
  "R&B":        "#F97316",
  Latin:        "#22C55E",
  "Open Air":   "#84CC16",
  Afrobeats:    "#F59E0B",
  "Live Music": "#06B6D4",
};

export default function EventCard({
  id, title, image, image_url, genre, price, date, venue, city,
  interestedCount, goingCount, featured, badge, organizerName, organizerSlug,
}: EventCardProps) {
  const [saved, setSaved] = useState(false);
  const color  = genreColors[genre] ?? "#E8A020";
  const imgSrc = image_url || image || FALLBACK_IMAGE;

  const displayPrice = formatPrice(price);

  const formattedDate = new Date(date).toLocaleDateString("en-GB", {
    weekday: "short", day: "numeric", month: "short",
  });

  return (
    <Link
      href={`/events/${id}`}
      className="event-card event-card-wrapper group block overflow-hidden"
      style={{ backgroundColor: "var(--bg-surface)", fontFamily: "var(--font-sans)" }}
    >
      {/* ── Image ─────────────────────────────────── */}
      <div className="relative overflow-hidden" style={{ height: "210px" }}>
        {imgSrc.startsWith("data:") ? (
          <img src={imgSrc} alt={title}
            className="w-full h-full object-cover card-img group-hover:scale-[1.05]" />
        ) : (
          <Image src={imgSrc} alt={title} fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover card-img event-card-image"
            onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMAGE; }}
          />
        )}

        {/* Cinematic overlay */}
        <div className="absolute inset-0" style={{
          background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.45) 45%, rgba(0,0,0,0.12) 75%, transparent 100%)"
        }} />

        {/* Top-left: Radar badge */}
        {badge === "Nightup Radar" && <RadarBadge />}

        {/* Top-right: text badge (shifted left when present) + heart */}
        {badge && badge !== "Nightup Radar" && (
          <div className="absolute top-3 right-12 z-20">
            <span className="text-xs font-black px-2.5 py-1 leading-none"
              style={{
                backgroundColor: badge.startsWith("🔥") ? "#E8A020" : "#16a34a",
                color: "#fff",
              }}>
              {badge}
            </span>
          </div>
        )}
        <button
          className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-colors"
          onClick={(e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setSaved((s) => !s);
            // TODO: wire to user favorites table
          }}
          aria-label="Save event"
        >
          {saved
            ? <FaHeart size={14} style={{ color: "#E8A020" }} />
            : <FiHeart size={14} style={{ color: "rgba(255,255,255,0.9)" }} />}
        </button>

        {/* Bottom row — genre pill + price */}
        <div className="absolute bottom-2 left-2 right-2 flex items-end justify-between gap-2">
          <span className="text-xs font-bold px-2.5 py-1 leading-none"
            style={{
              backgroundColor: "rgba(0,0,0,0.55)",
              color: color,
              border: `1px solid ${color}60`,
              backdropFilter: "blur(8px)",
              fontFamily: "var(--font-mono)",
            }}>
            {genre}
          </span>
          <span className="text-xs font-bold px-2.5 py-1 leading-none tabular-nums flex-shrink-0"
            style={{ backgroundColor: "rgba(0,0,0,0.65)", color: "#fff", backdropFilter: "blur(8px)", fontFamily: "var(--font-mono)" }}>
            {displayPrice}
          </span>
        </div>
      </div>

      {/* ── Content ──────────────────────────────── */}
      <div style={{ padding: "10px 12px" }}>
        <h3 className="event-card-title font-bold text-[15px] mb-2 line-clamp-2 leading-[1.35]"
          style={{ transition: "color 0.2s ease", fontFamily: "var(--font-sans)" }}>{title}</h3>

        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
          <span className="text-xs font-semibold" style={{ color: "var(--gold)", fontFamily: "var(--font-sans)" }}>{formattedDate}</span>
          <span className="text-gray-700 text-xs">·</span>
          <span className="text-xs truncate text-[var(--text-muted)] transition-colors duration-200 group-hover:text-[#A1A1AA]"
            style={{ fontFamily: "var(--font-sans)" }}>{venue}</span>
        </div>

        <p className="text-xs mb-3" style={{ color: "var(--text-muted)", fontFamily: "var(--font-sans)" }}>{city}</p>

        {organizerName && organizerSlug && (
          <Link href={`/organizers/${organizerSlug}`}
            onClick={(e: MouseEvent) => e.stopPropagation()}
            className="inline-block text-xs mb-3 hover:underline truncate"
            style={{ color: "#888" }}>
            by {organizerName}
          </Link>
        )}

        <div className="flex items-center gap-3 pt-3 border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
          <span className="flex items-center gap-1.5 text-xs" style={{ color: "#555", fontFamily: "var(--font-mono)" }}>
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            {interestedCount.toLocaleString()}
          </span>
          <span className="flex items-center gap-1.5 text-xs" style={{ color: "#555", fontFamily: "var(--font-mono)" }}>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {goingCount.toLocaleString()} going
          </span>
        </div>
      </div>
    </Link>
  );
}
