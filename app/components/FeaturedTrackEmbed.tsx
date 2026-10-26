"use client";

import ClickToLoadEmbed from "./ClickToLoadEmbed";
import { useLanguage } from "./LanguageContext";
import { featuredTrackEmbedSrc, safeExternalHref } from "../lib/soundcloud";

interface Props {
  url: string;
  /** The player's artist name row; the Music section shows a lighter player. */
  showUser?: boolean;
}

/**
 * Profile Featured Track. The SoundCloud player only accepts
 * soundcloud.com/artist/track, so anything else (an old on.soundcloud.com short
 * link, a hand-edited value) gets a plain link button instead of a broken player.
 */
export default function FeaturedTrackEmbed({ url, showUser = true }: Props) {
  const { t } = useLanguage();
  const src = featuredTrackEmbedSrc(url, showUser);

  if (src) {
    return (
      <ClickToLoadEmbed provider="soundcloud" height={166}>
        <iframe width="100%" height="166" scrolling="no" frameBorder="no" src={src} />
      </ClickToLoadEmbed>
    );
  }

  const href = safeExternalHref(url);
  if (!href) return null;
  return (
    <div
      className="flex items-center justify-center px-4 py-8"
      style={{ backgroundColor: "#0a0a14" }}
    >
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="px-5 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
        style={{ backgroundColor: "#111120", color: "#E8A020", border: "1px solid #E8A020" }}
      >
        {t("embed_open_soundcloud")}
      </a>
    </div>
  );
}
