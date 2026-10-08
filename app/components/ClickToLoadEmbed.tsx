"use client";

import { useState, type ReactNode } from "react";
import { useLanguage } from "./LanguageContext";

type Provider = "soundcloud" | "spotify";

interface Props {
  provider: Provider;
  /** Height of the placeholder, so the layout doesn't jump when the player loads. */
  height: number;
  /** Rendered only after the user clicks the button. */
  children: ReactNode;
}

/**
 * Third-party embed gate. Nothing from SoundCloud or Spotify is requested until
 * the visitor clicks. The choice lives in component state only (no cookie,
 * no localStorage), so it applies to this view and is forgotten on reload.
 */
export default function ClickToLoadEmbed({ provider, height, children }: Props) {
  const { t } = useLanguage();
  const [loaded, setLoaded] = useState(false);

  if (loaded) return <>{children}</>;

  return (
    <EmbedPlaceholder
      height={height}
      notice={t(provider === "soundcloud" ? "embed_notice_soundcloud" : "embed_notice_spotify")}
      onLoad={() => setLoaded(true)}
    />
  );
}

export function EmbedPlaceholder({
  height,
  notice,
  onLoad,
}: {
  height: number;
  notice: string;
  onLoad: () => void;
}) {
  const { t } = useLanguage();
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 px-4 text-center"
      style={{ minHeight: height, backgroundColor: "#0a0a14" }}
    >
      <button
        type="button"
        onClick={onLoad}
        className="px-5 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
        style={{ backgroundColor: "#111120", color: "#E8A020", border: "1px solid #E8A020" }}
      >
        {t("embed_load_player")}
      </button>
      <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>{notice}</p>
    </div>
  );
}
