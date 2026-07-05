import React from "react";

function fmtDate(date?: string): string {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("el-GR", { day: "numeric", month: "short" });
}

export default function EventImageFallback({
  genre,
  venue,
  date,
  compact = false,
}: {
  genre?: string;
  venue?: string;
  date?: string;
  compact?: boolean;
}) {
  const dateLabel = fmtDate(date);
  const g = (genre ?? "").trim();

  return (
    <svg
      viewBox="0 0 400 250"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      aria-hidden="true"
    >
      <rect x="0" y="0" width="400" height="250" fill="#0F0F1A" />
      <circle cx="380" cy="40" r="110" fill="none" stroke="#E8A020" strokeWidth="1" opacity="0.12" />
      <circle cx="60" cy="250" r="90" fill="none" stroke="#16213E" strokeWidth="1.5" opacity="0.7" />
      <rect x="280" y="0" width="120" height="250" fill="#0A0A12" opacity="0.35" />

      {g && (
        <>
          <rect x="20" y="20" width={Math.min(40 + g.length * 8, 150)} height="24" rx="6" fill="#E8A020" opacity="0.14" />
          <rect x="20" y="20" width={Math.min(40 + g.length * 8, 150)} height="24" rx="6" fill="none" stroke="#E8A020" strokeWidth="0.75" opacity="0.45" />
          <text
            x={20 + Math.min(40 + g.length * 8, 150) / 2}
            y="36"
            textAnchor="middle"
            fontFamily="var(--font-serif)"
            fontSize="12"
            fill="#F5B335"
            letterSpacing="1"
          >
            {g}
          </text>
        </>
      )}

      <text
        x="200"
        y={compact ? 138 : 128}
        textAnchor="middle"
        fontFamily="var(--font-serif)"
        fontStyle="italic"
        fontSize={compact ? 34 : 38}
        fill="#E8A020"
      >
        Nightup
      </text>

      {!compact && (
        <text
          x="200"
          y="152"
          textAnchor="middle"
          fontFamily="var(--font-serif)"
          fontSize="10"
          fill="#6f6f80"
          letterSpacing="4"
        >
          DISCOVER THE NIGHT
        </text>
      )}

      {!compact && venue && (
        <text x="20" y="228" textAnchor="start" fontFamily="var(--font-serif)" fontSize="13" fill="#d2d2dd">
          {venue}
        </text>
      )}
      {!compact && dateLabel && (
        <text x="380" y="228" textAnchor="end" fontFamily="var(--font-serif)" fontSize="12" fill="#F5B335">
          {dateLabel}
        </text>
      )}
    </svg>
  );
}
