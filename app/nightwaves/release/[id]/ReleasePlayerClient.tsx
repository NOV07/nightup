"use client";

import { useRef, useState, useEffect, useCallback } from "react";

interface SCSound {
  title: string;
  duration: number;
  permalink_url?: string;
}

interface Props {
  soundcloudUrl: string | null | undefined;
  type: string;
  description?: string | null;
  releaseDate?: string | null;
  genre?: string | null;
  spotifyUrl?: string | null;
  appleMusicUrl?: string | null;
  bandcampUrl?: string | null;
  youtubeUrl?: string | null;
  deezerUrl?: string | null;
}

const STREAMING_LINKS = [
  {
    key: 'spotify',
    label: 'Spotify',
    bg: '#1DB954',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
      </svg>
    ),
  },
  {
    key: 'apple',
    label: 'Apple Music',
    bg: '#fc3c44',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M23.994 6.124a9.23 9.23 0 00-.24-2.19c-.317-1.31-1.062-2.31-2.18-3.043a5.022 5.022 0 00-1.877-.726 10.496 10.496 0 00-1.564-.15c-.04-.003-.083-.01-.124-.013H5.986c-.152.01-.303.017-.455.026C4.786.07 4.043.15 3.34.428 2.004.958 1.04 1.88.475 3.208a5.494 5.494 0 00-.39 1.548c-.06.495-.087.993-.085 1.49v11.51c.003.508.033 1.015.1 1.519.273 2.05 1.353 3.508 3.258 4.34.617.266 1.268.39 1.932.418.906.04 1.815.044 2.72.044h9.466c.635 0 1.267-.02 1.9-.05 1.54-.07 2.79-.6 3.757-1.793.733-.912 1.04-1.974 1.1-3.097.014-.252.018-.506.022-.759V6.124zm-6.973 10.462c-.348 0-.696-.003-1.043-.006a7.17 7.17 0 01-.84-.074c-.59-.1-1.1-.39-1.456-.878-.17-.232-.265-.5-.265-.78a1.62 1.62 0 011.13-1.547c.433-.147.88-.21 1.33-.225.268-.009.537-.016.804-.018l.296-.003v-.35c0-.343-.1-.617-.3-.817-.195-.196-.47-.294-.82-.294-.22 0-.437.033-.635.1a.974.974 0 00-.505.398.96.96 0 01-.765.365h-.043a.866.866 0 01-.866-.866c0-.296.126-.57.34-.758a3.6 3.6 0 012.574-.872c.87 0 1.568.226 2.073.673.505.447.757 1.055.757 1.812v3.588h-1.746zm-2.17-.927c.14.185.346.305.588.346.2.037.4.053.602.05h.98v-1.303l-.428.01c-.24.006-.48.015-.72.026-.27.014-.51.09-.714.25a.7.7 0 00-.308.587c0 .162.04.315.116.447.003.006.007.013.01.02.02.026-.3.026-.3.026h.175zm5.245-5.826c0-.76.56-1.255 1.305-1.255h.017c.743 0 1.303.495 1.303 1.255v7.39c0 .76-.56 1.255-1.303 1.255h-.017c-.744 0-1.305-.495-1.305-1.255v-7.39zm-7.615 6.753a3.93 3.93 0 01-2.823-1.163 4.038 4.038 0 01-1.175-2.86c0-1.082.415-2.097 1.167-2.862a3.915 3.915 0 012.831-1.168c1.087 0 2.097.42 2.852 1.173l.003.003-1.203 1.24a2.233 2.233 0 00-1.652-.716 2.25 2.25 0 00-1.62.68 2.302 2.302 0 00-.668 1.65c0 .626.245 1.21.68 1.646a2.243 2.243 0 001.608.671c.636 0 1.224-.25 1.664-.698l1.195 1.247a3.915 3.915 0 01-2.859 1.157z"/>
      </svg>
    ),
  },
  {
    key: 'bandcamp',
    label: 'Bandcamp',
    bg: '#1da0c3',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M0 18.75l7.437-13.5H24l-7.438 13.5z"/>
      </svg>
    ),
  },
  {
    key: 'youtube',
    label: 'YouTube',
    bg: '#FF0000',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M23.495 6.205a3.007 3.007 0 00-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 00.527 6.205a31.247 31.247 0 00-.522 5.805 31.247 31.247 0 00.522 5.783 3.007 3.007 0 002.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 002.088-2.088 31.247 31.247 0 00.5-5.783 31.247 31.247 0 00-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/>
      </svg>
    ),
  },
  {
    key: 'deezer',
    label: 'Deezer',
    bg: '#A238FF',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.944 17.773h4.418v1.638h-4.418zm0-3.276h4.418v1.638h-4.418zm0-3.277h4.418v1.638h-4.418zm0-3.276h4.418v1.638h-4.418zm-5.785 9.829h4.418v1.638H13.16zm0-3.276h4.418v1.638H13.16zm0-3.277h4.418v1.638H13.16zm-5.785 6.553h4.418v1.638H7.375zm0-3.276h4.418v1.638H7.375zM1.638 17.773h4.418v1.638H1.638z"/>
      </svg>
    ),
  },
]

function buildScEmbedUrl(url: string): string | null {
  if (!url || typeof url !== 'string') return null
  const trimmed = url.trim()
  if (!/^https?:\/\/(www\.)?soundcloud\.com\/.+/.test(trimmed)) return null
  return `https://w.soundcloud.com/player/?url=${encodeURIComponent(trimmed)}&color=%23E8A020&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false`
}

function fmt(ms: number): string {
  if (!ms || isNaN(ms) || ms <= 0) return "?:??";
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function PlayerInner({ soundcloudUrl, type, description, releaseDate, genre, spotifyUrl, appleMusicUrl, bandcampUrl, youtubeUrl, deezerUrl }: Props & { soundcloudUrl: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const widgetRef = useRef<any>(null);
  const isReadyRef = useRef(false);
  const readyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [scError, setScError] = useState(false);
  const [tracklist, setTracklist] = useState<SCSound[]>([]);
  const [tracksChecked, setTracksChecked] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);

  const isCollection = type === "EP" || type === "Album";

  const scEmbedUrl = buildScEmbedUrl(soundcloudUrl);

  const initWidget = useCallback(() => {
    const SC = (window as any).SC;
    if (!SC?.Widget || !iframeRef.current) return;

    const widget = SC.Widget(iframeRef.current);
    widgetRef.current = widget;

    widget.bind(SC.Widget.Events.READY, () => {
      isReadyRef.current = true;
      if (readyTimerRef.current) { clearTimeout(readyTimerRef.current); readyTimerRef.current = null; }

      if (isCollection) {
        widget.getSounds((sounds: SCSound[]) => {
          if (!sounds || sounds.length === 0) {
            setScError(true);
            return;
          }
          setTracklist(sounds.map((s) => ({ title: s.title, duration: s.duration, permalink_url: s.permalink_url })));
          setTracksChecked(true);
        });
      }
      widget.bind(SC.Widget.Events.PLAY, () => {
        setIsPlaying(true);
        if (isCollection) {
          widget.getCurrentSoundIndex((idx: number) => setCurrentIdx(idx));
        } else {
          setCurrentIdx(0);
        }
      });
      widget.bind(SC.Widget.Events.PAUSE, () => setIsPlaying(false));
      widget.bind(SC.Widget.Events.FINISH, () => { setIsPlaying(false); setCurrentIdx(-1); });
    });
  }, [isCollection]);

  useEffect(() => {
    if (!scEmbedUrl) { setScError(true); return; }
    // If SC widget never fires READY within 12s, the URL is bad/private
    readyTimerRef.current = setTimeout(() => {
      if (!isReadyRef.current) setScError(true);
    }, 12000);

    const SC = (window as any).SC;
    if (SC?.Widget) {
      setTimeout(initWidget, 200);
    } else {
      const existing = document.getElementById("sc-api-script");
      if (existing) {
        setTimeout(initWidget, 400);
      } else {
        const s = document.createElement("script");
        s.id = "sc-api-script-release";
        s.src = "https://w.soundcloud.com/player/api.js";
        s.onload = () => setTimeout(initWidget, 200);
        document.head.appendChild(s);
      }
    }
    return () => { if (readyTimerRef.current) clearTimeout(readyTimerRef.current); };
  }, [initWidget]);

  const skipTo = (idx: number) => {
    widgetRef.current?.skip(idx);
    setCurrentIdx(idx);
  };

  const totalMs = tracklist.reduce((sum, t) => sum + (t.duration || 0), 0);

  return (
    <div className="mb-14 rounded-2xl overflow-hidden p-6" style={{ backgroundColor: "#0a0a14", border: "1px solid #1e1e30" }}>
      <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "#444" }}>Listen</p>

      {scError ? (
        <div
          className="flex items-center justify-between gap-4 flex-wrap rounded-xl px-4 py-4"
          style={{ backgroundColor: "#111120", border: "1px solid #1e1e30" }}
        >
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
            Preview not available. Open on SoundCloud to listen.
          </p>
          <a
            href={soundcloudUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80 flex-shrink-0"
            style={{ backgroundColor: "#FF5500", color: "#fff" }}
          >
            Open on SoundCloud ↗
          </a>
        </div>
      ) : (
        <div style={{ borderRadius: "10px", overflow: "hidden", border: "1px solid rgba(232,160,32,0.15)" }}>
          <iframe
            ref={iframeRef}
            width="100%"
            height={isCollection ? 300 : 166}
            scrolling="no"
            frameBorder={0}
            src={scEmbedUrl ?? undefined}
            allow="autoplay"
            style={{ display: "block" }}
            onError={() => setScError(true)}
          />
        </div>
      )}

      {/* Tracklist for EP / Album */}
      {isCollection && tracklist.length > 0 && (
        <div className="mt-6">
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#444" }}>Tracklist</p>
          <div className="space-y-0.5">
            {tracklist.map((track, idx) => {
              const active = currentIdx === idx && isPlaying;
              return (
                <div
                  key={idx}
                  onClick={() => skipTo(idx)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors hover:bg-white/5"
                  style={{
                    backgroundColor: active ? "rgba(232,160,32,0.08)" : "transparent",
                    border: `1px solid ${active ? "rgba(232,160,32,0.2)" : "transparent"}`,
                  }}
                >
                  <span className="w-5 flex-shrink-0 flex items-center justify-center" style={{ color: active ? "#E8A020" : "#444" }}>
                    {active ? (
                      <span className="flex gap-0.5 items-end h-3">
                        {[0, 1, 2].map((i) => (
                          <span
                            key={i}
                            className="w-0.5 rounded-sm"
                            style={{
                              backgroundColor: "#E8A020",
                              animation: `visualizer 0.8s ease-in-out ${i * 0.2}s infinite`,
                              height: "12px",
                            }}
                          />
                        ))}
                      </span>
                    ) : (
                      <span className="text-xs font-mono">{idx + 1}</span>
                    )}
                  </span>
                  <span className="flex-1 text-sm truncate" style={{ color: active ? "#fff" : "#bbb" }}>
                    {track.title}
                  </span>
                  <span className="text-xs font-mono flex-shrink-0" style={{ color: "#555" }}>
                    {fmt(track.duration)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Album-only info strip */}
      {type === "Album" && tracklist.length > 0 && (
        <div className="mt-6 pt-5 flex flex-wrap gap-8 border-t" style={{ borderColor: "#1e1e30" }}>
          <div>
            <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "#444" }}>Tracks</p>
            <p className="text-lg font-bold">{tracklist.length}</p>
          </div>
          {totalMs > 0 && (
            <div>
              <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "#444" }}>Total Duration</p>
              <p className="text-lg font-bold">{fmt(totalMs)}</p>
            </div>
          )}
          {genre && (
            <div>
              <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "#444" }}>Genre</p>
              <p className="text-lg font-bold">{genre}</p>
            </div>
          )}
          {releaseDate && (
            <div>
              <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "#444" }}>Released</p>
              <p className="text-lg font-bold">{new Date(releaseDate).getFullYear()}</p>
            </div>
          )}
        </div>
      )}

      {/* About this track — Singles only */}
      {type === "Single" && description && (
        <div className="mt-6 pt-5 border-t" style={{ borderColor: "#1e1e30" }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#444" }}>About this track</p>
          <p className="text-sm leading-relaxed" style={{ color: "#888" }}>{description}</p>
        </div>
      )}

      {/* Streaming links */}
      {(() => {
        const urlMap: Record<string, string | null | undefined> = { spotify: spotifyUrl, apple: appleMusicUrl, bandcamp: bandcampUrl, youtube: youtubeUrl, deezer: deezerUrl }
        const active = STREAMING_LINKS.filter(l => urlMap[l.key])
        if (active.length === 0) return null
        return (
          <div className="mt-6 pt-5 border-t" style={{ borderColor: "#1e1e30" }}>
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#444" }}>Also on</p>
            <div className="flex flex-wrap gap-2">
              {active.map(link => (
                <a
                  key={link.key}
                  href={urlMap[link.key]!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
                  style={{ backgroundColor: link.bg, color: '#fff' }}
                >
                  {link.icon}
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        )
      })()}
    </div>
  );
}

export default function ReleasePlayerClient(props: Props) {
  if (!props.soundcloudUrl || !buildScEmbedUrl(props.soundcloudUrl)) {
    const urlMap: Record<string, string | null | undefined> = { spotify: props.spotifyUrl, apple: props.appleMusicUrl, bandcamp: props.bandcampUrl, youtube: props.youtubeUrl, deezer: props.deezerUrl }
    const active = STREAMING_LINKS.filter(l => urlMap[l.key])
    return (
      <div className="mb-14 rounded-2xl p-6" style={{ backgroundColor: "#0a0a14", border: "1px solid #1e1e30" }}>
        <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#444" }}>Listen</p>
        <p className="text-sm mb-4" style={{ color: "#555" }}>No preview available</p>
        {active.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {active.map(link => (
              <a
                key={link.key}
                href={urlMap[link.key]!}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
                style={{ backgroundColor: link.bg, color: '#fff' }}
              >
                {link.icon}
                {link.label}
              </a>
            ))}
          </div>
        )}
      </div>
    );
  }
  return <PlayerInner {...props} soundcloudUrl={props.soundcloudUrl} />;
}
