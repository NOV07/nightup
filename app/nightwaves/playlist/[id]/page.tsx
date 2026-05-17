import { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getSupabase } from "../../../lib/supabase";
import PlaylistPlayButton from "./PlaylistPlayButton";
import SoundCloudPlayer from "../../../components/SoundCloudPlayer";

interface Props { params: Promise<{ id: string }>; }

export const dynamic = "force-dynamic";

const FALLBACK = "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80";

async function getPlaylist(id: string) {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.from("playlists").select("*").eq("id", id).eq("status", "approved").single();
    if (!error && data) return data;
  } catch {}
  return null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const pl = await getPlaylist(id);
  if (!pl) return { title: "Playlist not found" };
  return {
    title: `${pl.title} | Nightup`,
    description: `${pl.platform ?? "Playlist"} — curated on Nightup.`,
  };
}

export default async function PlaylistPage({ params }: Props) {
  const { id } = await params;
  const pl = await getPlaylist(id);
  if (!pl) notFound();

  const isSpotify = pl.embed_url?.includes("spotify.com") ?? false;

  const track = {
    id: pl.id,
    title: pl.title,
    artist: pl.platform ?? "Playlist",
    cover: pl.cover_image,
    soundcloudUrl: !isSpotify ? (pl.embed_url ?? undefined) : undefined,
    spotifyUrl: isSpotify ? (pl.embed_url ?? undefined) : undefined,
    type: "playlist" as const,
  };

  return (
    <div style={{ backgroundColor: "#0F0F1A", minHeight: "100vh" }}>
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Back */}
        <Link
          href="/nightwaves"
          className="inline-flex items-center gap-2 text-sm mb-10 transition-colors hover:text-white"
          style={{ color: "#555" }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Nightwaves
        </Link>

        {/* Hero grid */}
        <div className="grid grid-cols-1 md:grid-cols-[2fr_3fr] gap-8 md:gap-14 mb-10">
          {/* Cover */}
          <div className="relative w-full rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.7)]" style={{ aspectRatio: "1/1" }}>
            <Image src={pl.cover_image || FALLBACK} alt={pl.title} fill sizes="(max-width: 768px) 100vw, 40vw" className="object-cover" priority />
            {pl.is_sponsored && (
              <div className="absolute inset-0 flex items-end p-4">
                <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ backgroundColor: "#E8A020", color: "#0F0F1A" }}>⭐ Sponsored</span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex flex-col justify-center">
            {/* Badges */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <span className="text-xs font-black px-3 py-1 rounded-full tracking-widest uppercase" style={{ backgroundColor: "#E8A020", color: "#0F0F1A" }}>Playlist</span>
              {pl.platform && (
                <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ backgroundColor: "#1A1A2E", color: "#E8A020", border: "1px solid #E8A02040" }}>{pl.platform}</span>
              )}
              {pl.is_sponsored && (
                <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ backgroundColor: "#E8A020", color: "#0F0F1A" }}>✓ Sponsored</span>
              )}
            </div>

            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 leading-tight">{pl.title}</h1>

            {pl.description && (
              <p className="text-sm leading-relaxed mb-6" style={{ color: "#888" }}>{pl.description}</p>
            )}

            {/* Sponsored info box */}
            {pl.is_sponsored && (
              <div className="rounded-xl p-4 mb-6" style={{ backgroundColor: "#111120", border: "1px solid rgba(232,160,32,0.2)" }}>
                <div className="flex flex-col gap-1.5 mb-3 text-xs" style={{ color: "#888" }}>
                  <span>✓ Curated by Nightup</span>
                  <span>✓ Updated Weekly</span>
                  <span>✓ Featured on Nightup Homepage</span>
                </div>
                <p className="text-xs" style={{ color: "#555" }}>
                  Sponsored placement.{" "}
                  <Link href="/about#contact" className="hover:text-white underline" style={{ color: "#E8A020" }}>
                    Want yours featured? Contact us.
                  </Link>
                </p>
              </div>
            )}

            <PlaylistPlayButton track={track} />
          </div>
        </div>

        {/* Player */}
        {pl.embed_url && (
          <div className="mb-12">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#444" }}>Listen</p>
            {isSpotify ? (
              <div className="rounded-2xl p-5 flex items-center justify-between gap-4 flex-wrap"
                style={{ backgroundColor: "#0a0a14", border: "1px solid #1e1e30" }}>
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 flex-shrink-0" fill="#1DB954" viewBox="0 0 24 24">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                  </svg>
                  <span className="text-sm text-gray-400">Open this playlist in Spotify to listen</span>
                </div>
                <a href={pl.embed_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
                  style={{ backgroundColor: "#1DB954", color: "#fff" }}>
                  Open on Spotify →
                </a>
              </div>
            ) : (
              <SoundCloudPlayer track={track} />
            )}
          </div>
        )}

      </div>
    </div>
  );
}
