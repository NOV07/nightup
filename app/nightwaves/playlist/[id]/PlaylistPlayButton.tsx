"use client";

import { usePlayerStore, PlayerTrack } from "../../../components/PlayerContext";

interface Props {
  track: PlayerTrack;
}

export default function PlaylistPlayButton({ track }: Props) {
  const { setTrack, togglePlay, currentTrack, isPlaying } = usePlayerStore();
  const url = track.soundcloudUrl ?? track.spotifyUrl;
  const isThis = track.soundcloudUrl
    ? currentTrack?.soundcloudUrl === track.soundcloudUrl
    : currentTrack?.spotifyUrl === track.spotifyUrl;
  const thisPlaying = isThis && isPlaying;
  const isSpotify = !track.soundcloudUrl && !!track.spotifyUrl;

  const handleClick = () => {
    if (isSpotify && url) { window.open(url, "_blank"); return; }
    if (isThis) togglePlay();
    else setTrack(track);
  };

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80 w-fit"
      style={{
        backgroundColor: thisPlaying ? "#E8A020" : isSpotify ? "#1DB954" : "#1A1A2E",
        color: thisPlaying ? "#0F0F1A" : isSpotify ? "#fff" : "#E8A020",
        border: isSpotify ? "none" : "1px solid #E8A020",
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
      ) : isSpotify ? (
        <>
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
          </svg>
          Open on Spotify
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
          Play Playlist
        </>
      )}
    </button>
  );
}
