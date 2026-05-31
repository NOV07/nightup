"use client";

import Link from "next/link";
import Image from "next/image";
import { usePlayerStore } from "./PlayerContext";

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80";

interface Props {
  id: string;
  title: string;
  artist?: string;
  cover_image?: string | null;
  typeBadge: string;
  href: string;
  external: boolean;
  soundcloudUrl?: string;
  type: "mix" | "release" | "playlist";
  transitionDelay?: string;
}

export default function NightwavesHomeCard({
  id, title, artist, cover_image, typeBadge, href, external,
  soundcloudUrl, type, transitionDelay,
}: Props) {
  const { currentTrack, isPlaying, setTrack, togglePlay } = usePlayerStore();
  const isThis = !!soundcloudUrl && currentTrack?.soundcloudUrl === soundcloudUrl;
  const thisPlaying = isThis && isPlaying;

  const handlePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isThis) togglePlay();
    else if (soundcloudUrl) setTrack({ id, title, artist: artist ?? "", cover: cover_image ?? undefined, soundcloudUrl, type });
  };

  const inner = (
    <>
      {/* Image + play overlay */}
      <div className="relative overflow-hidden">
        <Image
          src={cover_image || FALLBACK_IMAGE}
          alt={title}
          width={400}
          height={400}
          className="discover-card-img w-full object-cover block"
          style={{ aspectRatio: "1" }}
          onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMAGE; }}
        />
        {soundcloudUrl && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/35 transition-colors duration-200">
            <button
              aria-label={thisPlaying ? "Pause" : "Play"}
              onClick={handlePlay}
              className="w-14 h-14 rounded-full bg-amber-500 hover:bg-amber-400 flex items-center justify-center text-zinc-900 shadow-[0_4px_20px_rgba(0,0,0,0.55)] opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all duration-200"
            >
              {thisPlaying ? (
                <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24" style={{ marginLeft: "2px" }}>
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Text */}
      <div style={{ padding: "12px 14px" }}>
        <p style={{
          fontFamily: "var(--font-mono)", fontSize: "8px",
          letterSpacing: "0.14em", textTransform: "uppercase",
          color: "var(--gold)", marginBottom: "5px",
          display: "flex", alignItems: "center", gap: "5px",
        }}>
          <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: "var(--gold)", display: "inline-block" }} />
          {typeBadge}
        </p>
        <p style={{
          fontFamily: "var(--font-sans)", fontSize: "14px", fontWeight: 500,
          color: "var(--text-primary)",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", margin: "0 0 2px",
        }} className="discover-card-title">
          {artist || title}
        </p>
        <p style={{
          fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: "11px",
          color: "var(--text-secondary)",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", margin: 0,
        }}>{artist ? title : ""}</p>
      </div>
    </>
  );

  const sharedProps = {
    className: "group discover-card reveal-up",
    style: {
      background: "var(--bg-primary)",
      textDecoration: "none",
      display: "block",
      overflow: "hidden",
      transitionDelay,
    } as React.CSSProperties,
  };

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" {...sharedProps}>
        {inner}
      </a>
    );
  }
  return (
    <Link href={href} {...sharedProps}>
      {inner}
    </Link>
  );
}
