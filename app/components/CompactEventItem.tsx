"use client";

import Link from "next/link";
import Image from "next/image";

const FALLBACK = "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80";

interface CompactEventItemProps {
  id: string;
  title: string;
  image: string;
  date: string;
  time?: string;
  venue: string;
  delay?: string;
}

export default function CompactEventItem({
  id, title, image, date, time, venue, delay,
}: CompactEventItemProps) {
  const imgSrc = image || FALLBACK;
  const formattedDay = new Date(date).toLocaleDateString("en-GB", {
    weekday: "short", day: "numeric", month: "short",
  });

  return (
    <Link
      href={`/events/${id}`}
      className="flex items-center gap-3 py-2.5 px-2 -mx-2 rounded-lg group animate-fade-up transition-colors hover:bg-white/[0.04]"
      style={{
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        animationDelay: delay,
      }}
    >
      <div className="relative w-7 h-7 flex-shrink-0 rounded overflow-hidden">
        {imgSrc.startsWith("data:") ? (
          <img src={imgSrc} alt={title} className="w-full h-full object-cover" />
        ) : (
          <Image src={imgSrc} alt={title} fill sizes="28px" className="object-cover" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className="font-medium truncate transition-colors group-hover:text-amber-400"
          style={{ fontSize: "12px", color: "rgba(255,255,255,0.9)", fontFamily: "var(--font-sans)" }}
        >
          {title}
        </p>
        <p
          className="truncate"
          style={{ fontSize: "10px", color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-mono)" }}
        >
          {time || formattedDay} · {venue}
        </p>
      </div>
    </Link>
  );
}
