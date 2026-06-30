"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { FiHeart } from "react-icons/fi";
import { FaHeart } from "react-icons/fa";
import { toast } from "sonner";
import { RadarBadge } from "./RadarBadge";
import { formatPrice } from "../lib/formatPrice";
import { useLanguage } from "./LanguageContext";

const FALLBACK = "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80";

interface HotEventCardProps {
  id: string;
  title: string;
  image?: string;
  genre: string;
  type?: string | null;
  price: string | number | null | undefined;
  date: string;
  time?: string;
  venue: string;
  city: string;
  isRadarPick?: boolean;
  showHotBadge?: boolean;
  variant?: "large" | "compact";
  initialSaved?: boolean;
}

export default function HotEventCard({
  id, title, image, genre, type, price, date, time, venue, isRadarPick, showHotBadge = false,
  variant = "large", initialSaved,
}: HotEventCardProps) {
  const [saved, setSaved] = useState(initialSaved ?? false);
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();

  const CATEGORY_LABEL_KEYS: Record<string, string> = {
    culture: "event_cat_culture",
    sports:  "event_cat_sports",
    other:   "event_cat_other",
  };
  const categoryLabel = type && CATEGORY_LABEL_KEYS[type] ? t(CATEGORY_LABEL_KEYS[type] as any) : genre;
  const CATEGORY_COLORS: Record<string, string> = {
    culture: "rgba(124,58,237,0.85)",
    sports:  "rgba(37,99,235,0.85)",
    other:   "rgba(5,150,105,0.85)",
  };
  const categoryBadgeTop = isRadarPick && showHotBadge
    ? "top-[4.25rem]"
    : (isRadarPick || showHotBadge) ? "top-10" : "top-3";

  async function handleSave(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const next = !saved;
    setSaved(next);
    try {
      if (next) {
        const res = await fetch('/api/saved/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event_id: id }),
        });
        if (res.status === 401) {
          setSaved(false);
          toast('Συνδέσου για να το αποθηκεύσεις', {
            duration: 5000,
            action: {
              label: 'Σύνδεση',
              onClick: () => router.push(`/sign-in?redirect=${encodeURIComponent(pathname)}`),
            },
          });
          return;
        }
      } else {
        await fetch(`/api/saved/events?event_id=${id}`, { method: 'DELETE' });
      }
    } catch {
      setSaved(!next);
    }
  }
  const imgSrc = image || FALLBACK;

  const displayPrice = formatPrice(price);

  const formattedDate = new Date(date).toLocaleDateString("en-GB", {
    weekday: "short", day: "numeric", month: "short",
  });

  const isLarge = variant === "large";

  return (
    <Link
      href={`/events/${id}`}
      className="group relative block overflow-hidden rounded-xl hover:scale-[1.02] hover:-translate-y-0.5 transition-all duration-300"
      style={isLarge ? { height: "480px" } : { height: "260px" }}
    >
      {/* Image */}
      {imgSrc.startsWith("data:") ? (
        <img
          src={imgSrc}
          alt={title}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <Image
          src={imgSrc}
          alt={title}
          fill
          sizes={isLarge ? "(max-width: 1024px) 100vw, 50vw" : "(max-width: 1024px) 100vw, 25vw"}
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK; }}
        />
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

      {/* Top-left: RadarBadge + optional Hot badge */}
      {isRadarPick && <RadarBadge />}
      {showHotBadge && (
        <div
          className={`absolute ${isRadarPick ? "top-10" : "top-3"} left-3 z-10 flex items-center gap-1.5 rounded-full px-2.5 py-1 backdrop-blur-sm`}
          style={{ backgroundColor: "rgba(220,38,38,0.85)" }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-white flex-shrink-0 animate-pulse-dot" />
          <span className="text-[10px] font-bold tracking-[0.12em] uppercase text-white">Hot</span>
        </div>
      )}

      {/* Top-left: category label (culture / sports / other only) */}
      {(type && CATEGORY_LABEL_KEYS[type]) && (
        <div
          className={`absolute ${categoryBadgeTop} left-3 z-10 flex items-center rounded-full px-2.5 py-1 backdrop-blur-sm`}
          style={{ backgroundColor: CATEGORY_COLORS[type] ?? "rgba(0,0,0,0.60)" }}
        >
          <span className="text-[10px] font-bold tracking-[0.12em] uppercase text-white">{categoryLabel}</span>
        </div>
      )}

      {/* Top-right: heart */}
      <button
        className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-colors"
        onClick={handleSave}
        aria-label="Save event"
      >
        {saved
          ? <FaHeart size={14} style={{ color: "#E8A020" }} />
          : <FiHeart size={14} style={{ color: "rgba(255,255,255,0.9)" }} />}
      </button>

      {/* Bottom content */}
      <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
        <h3
          className="font-semibold text-white leading-tight mb-1.5 line-clamp-2"
          style={{ fontSize: isLarge ? "28px" : "18px", fontFamily: "var(--font-sans)" }}
        >
          {title}
        </h3>
        <p
          style={{
            fontSize: isLarge ? "13px" : "12px",
            color: "rgba(255,255,255,0.65)",
            fontFamily: "var(--font-sans)",
          }}
        >
          {formattedDate}{time ? ` · ${time}` : ""} · {venue}{displayPrice ? ` · ${displayPrice}` : ""}
        </p>
      </div>
    </Link>
  );
}
