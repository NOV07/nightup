import { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getSupabase } from "../../../lib/supabase";
import ReleasePlayerClient from "./ReleasePlayerClient";

interface Props { params: Promise<{ id: string }>; }

export const dynamic = "force-dynamic";

const FALLBACK = "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80";

function toSpotifyEmbed(url: string) {
  return url.replace("open.spotify.com/", "open.spotify.com/embed/");
}

async function getRelease(id: string) {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("music_releases")
      .select("*")
      .eq("id", id)
      .eq("status", "approved")
      .single();
    if (!error && data) return data;
  } catch {}
  return null;
}

async function getMoreByArtist(artist: string, excludeId: string) {
  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from("music_releases")
      .select("id, title, type, cover_image, created_at")
      .eq("status", "approved")
      .ilike("artist", artist)
      .neq("id", excludeId)
      .order("created_at", { ascending: false })
      .limit(4);
    return data ?? [];
  } catch {
    return [];
  }
}

async function getArtistProfile(profileId: string | null, artistName: string) {
  try {
    const supabase = getSupabase()

    // First try by profile_id (most reliable)
    if (profileId) {
      const { data } = await supabase
        .from('profiles')
        .select('username, display_name')
        .eq('id', profileId)
        .single()
      if (data) return data
    }

    // Fallback: try by display_name
    const { data } = await supabase
      .from('profiles')
      .select('username, display_name')
      .ilike('display_name', artistName)
      .eq('profile_type', 'artist')
      .single()
    return data ?? null
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const release = await getRelease(id);
  if (!release) return { title: "Release not found" };
  const image = release.cover_image ?? "https://nightup.gr/og-image.png";
  const description = release.description ?? `${release.type} by ${release.artist}`;
  return {
    title: `${release.artist} — ${release.title}`,
    description,
    openGraph: {
      title: `${release.artist} — ${release.title}`,
      description,
      images: [{ url: image, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${release.artist} — ${release.title}`,
      description,
      images: [image],
    },
  };
}

export default async function ReleasePage({ params }: Props) {
  const { id } = await params;
  const release = await getRelease(id);
  if (!release) notFound();

  const more = await getMoreByArtist(release.artist, release.id);
  const artistProfile = await getArtistProfile(release.profile_id ?? null, release.artist);

  const spotifyEmbedUrl = !release.soundcloud_url && release.spotify_url
    ? toSpotifyEmbed(release.spotify_url)
    : null;

  return (
    <div style={{ backgroundColor: "#0F0F1A", minHeight: "100vh" }}>
      <div className="max-w-5xl mx-auto px-4 py-8">
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

        {/* Main grid */}
        <div className="grid grid-cols-1 md:grid-cols-[2fr_3fr] gap-8 md:gap-14 mb-12">
          {/* Cover */}
          <div className="relative w-full rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.6)]" style={{ aspectRatio: "1/1" }}>
            <Image
              src={release.cover_image || FALLBACK}
              alt={release.title}
              fill
              sizes="(max-width: 768px) 100vw, 40vw"
              className="object-cover"
              priority
            />
          </div>

          {/* Info */}
          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-5 flex-wrap">
              {release.type === "Single" && (
                <span className="text-xs font-black px-3 py-1 rounded-full tracking-widest uppercase" style={{ backgroundColor: "#E8A020", color: "#0F0F1A" }}>
                  Single
                </span>
              )}
              {release.type === "EP" && (
                <span className="text-xs font-black px-4 py-1 rounded-full tracking-widest uppercase" style={{ backgroundColor: "#1A1A2E", color: "#E8A020", border: "2px solid #E8A020" }}>
                  EP
                </span>
              )}
              {release.type === "Album" && (
                <span className="text-xs font-black px-4 py-1 rounded-lg tracking-widest uppercase" style={{ background: "linear-gradient(135deg, #E8A020, #c47d10)", color: "#0F0F1A", boxShadow: "0 2px 12px rgba(232,160,32,0.4)" }}>
                  Album
                </span>
              )}
              {release.type && !["Single", "EP", "Album"].includes(release.type) && (
                <span className="text-xs font-black px-3 py-1 rounded-full tracking-widest uppercase" style={{ backgroundColor: "#E8A020", color: "#0F0F1A" }}>
                  {release.type}
                </span>
              )}
              {release.genre && (
                <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ backgroundColor: "#1A1A2E", color: "#E8A020", border: "1px solid #E8A02040" }}>
                  {release.genre}
                </span>
              )}
              {release.is_promoted && (
                <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ backgroundColor: "#E8A02015", color: "#E8A020", border: "1px solid #E8A02060" }}>
                  ⭐ Promoted
                </span>
              )}
            </div>

            <Link
              href={artistProfile ? `/profile/${artistProfile.username}` : `/nightwaves/artist/${encodeURIComponent(release.artist)}`}
              className="text-base font-semibold hover:underline mb-2 block transition-colors"
              style={{ color: "#E8A020" }}
            >
              {release.artist}
            </Link>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3 leading-tight">{release.title}</h1>

            {release.release_date && (
              <p className="text-sm mb-5" style={{ color: "#555" }}>
                {new Date(release.release_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            )}

            {release.description && (
              <p className="text-sm leading-relaxed mb-7" style={{ color: "#999" }}>
                {release.description}
              </p>
            )}

            <div className="flex flex-wrap gap-3">
              {release.spotify_url && (
                <a
                  href={release.spotify_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
                  style={{ backgroundColor: "#1DB954", color: "#fff" }}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                  </svg>
                  Open on Spotify
                </a>
              )}
              {release.soundcloud_url && (
                <a
                  href={release.soundcloud_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
                  style={{ backgroundColor: "#FF5500", color: "#fff" }}
                >
                  Open on SoundCloud
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Embedded player */}
        {release.soundcloud_url ? (
          <ReleasePlayerClient
            soundcloudUrl={release.soundcloud_url}
            type={release.type ?? "Single"}
            description={release.description}
            releaseDate={release.release_date}
            genre={release.genre}
            spotifyUrl={release.spotify_url}
            appleMusicUrl={release.apple_music_url}
            bandcampUrl={release.bandcamp_url}
            youtubeUrl={release.youtube_url}
            deezerUrl={release.deezer_url}
          />
        ) : spotifyEmbedUrl ? (
          <div className="mb-14 rounded-2xl overflow-hidden p-6" style={{ backgroundColor: "#0a0a14", border: "1px solid #1e1e30" }}>
            <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "#444" }}>Listen</p>
            <iframe
              src={spotifyEmbedUrl}
              width="100%"
              height="152"
              frameBorder={0}
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              style={{ borderRadius: "12px" }}
            />
          </div>
        ) : null}

        {/* More by artist */}
        {more.length > 0 && (
          <div className="pb-16">
            <h2 className="text-xl font-bold mb-6">More by {release.artist}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {(more as any[]).map((r) => (
                <Link
                  key={r.id}
                  href={`/nightwaves/release/${r.id}`}
                  className="group block rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1"
                  style={{ backgroundColor: "#111120", border: "1px solid #1a1a2e" }}
                >
                  <div className="relative aspect-square overflow-hidden">
                    <Image
                      src={r.cover_image || FALLBACK}
                      alt={r.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-3">
                    {r.type && <p className="text-xs mb-0.5" style={{ color: "#E8A020" }}>{r.type}</p>}
                    <h4 className="font-semibold text-sm line-clamp-1">{r.title}</h4>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
