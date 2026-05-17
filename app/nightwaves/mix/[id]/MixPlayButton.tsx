"use client";

import { usePlayerStore } from "../../../components/PlayerContext";

interface Props {
  soundcloudUrl: string;
  title: string;
  artist: string;
  cover?: string;
}

export default function MixPlayButton({ soundcloudUrl, title, artist, cover }: Props) {
  const { setTrack, togglePlay, currentTrack, isPlaying } = usePlayerStore();
  const isThis = currentTrack?.soundcloudUrl === soundcloudUrl;
  const thisPlaying = isThis && isPlaying;

  const handleClick = () => {
    if (isThis) togglePlay();
    else setTrack({ soundcloudUrl, title, artist, cover, type: "mix" });
  };

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80 w-fit"
      style={{
        backgroundColor: thisPlaying ? "#E8A020" : "#1A1A2E",
        color: thisPlaying ? "#0F0F1A" : "#E8A020",
        border: "1px solid #E8A020",
      }}
    >
      {thisPlaying ? (
        <>
          <span className="flex gap-0.5 items-end h-4">
            {[0, 1, 2].map((i) => (
              <span key={i} className="w-0.5 rounded-sm"
                style={{ backgroundColor: "#0F0F1A", animation: `visualizer 0.8s ease-in-out ${i * 0.2}s infinite`, height: "16px" }} />
            ))}
          </span>
          Now Playing
        </>
      ) : isThis ? (
        <>
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
          Resume
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
          Play Mix
        </>
      )}
    </button>
  );
}
