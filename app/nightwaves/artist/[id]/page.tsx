import { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getSupabase } from "../../../lib/supabase";

interface Props { params: Promise<{ id: string }>; }

export const dynamic = "force-dynamic";

const FALLBACK = "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80";

async function getArtist(id: string) {
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase
      .from("artists")
      .select("*")
      .eq("id", id)
      .eq("status", "approved")
      .single();
    if (!error && data) return data;
  } catch {}
  try {
    const name = decodeURIComponent(id).replace(/-/g, " ");
    const { data, error } = await supabase
      .from("artists")
      .select("*")
      .ilike("name", name)
      .eq("status", "approved")
      .single();
    if (!error && data) return data;
  } catch {}
  try {
    const name = decodeURIComponent(id);
    const { data, error } = await supabase
      .from("artists")
      .select("*")
      .ilike("name", name)
      .eq("status", "approved")
      .single();
    if (!error && data) return data;
  } catch {}
  return null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const artistName = decodeURIComponent(id);
  const artist = await getArtist(id);
  const name = artist?.name ?? artistName;
  return {
    title: name,
    description: artist?.about?.slice(0, 155) ?? `${name} on Nightup.`,
  };
}

export default async function ArtistPage({ params }: Props) {
  const { id } = await params;
  const artistName = decodeURIComponent(id);
  const artist = await getArtist(id);

  // Use the verified name from the artists table if available, otherwise the URL param
  const lookupName = artist?.name ?? artistName;

  let releases: any[] = [];
  let mixes: any[] = [];
  try {
    const supabase = getSupabase();
    const [relRes, mixRes] = await Promise.all([
      supabase
        .from("music_releases")
        .select("id, title, type, cover_image, release_date, is_promoted")
        .eq("status", "approved")
        .ilike("artist", lookupName)
        .order("release_date", { ascending: false }),
      supabase
        .from("mixes")
        .select("id, title, genre, cover_image, duration, soundcloud_url")
        .eq("status", "approved")
        .ilike("artist", lookupName)
        .order("created_at", { ascending: false }),
    ]);
    if (relRes.data) releases = relRes.data;
    if (mixRes.data) mixes = mixRes.data;
  } catch {}

  // Only 404 if there's truly nothing — no artist profile, no releases, no mixes
  if (!artist && releases.length === 0 && mixes.length === 0) notFound();

  return (
    <div style={{ backgroundColor: "#0F0F1A", minHeight: "100vh" }}>
      {/* Hero */}
      <div className="relative w-full overflow-hidden" style={{ height: "clamp(320px, 45vw, 540px)" }}>
        {artist?.photo ? (
          <Image src={artist.photo} alt={lookupName} fill sizes="100vw" className="object-cover object-top" priority />
        ) : (
          <Image src={FALLBACK} alt={lookupName} fill sizes="100vw" className="object-cover" priority />
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(15,15,26,0.15) 0%, rgba(15,15,26,0.55) 50%, rgba(15,15,26,0.97) 100%)" }} />
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, transparent 40%, rgba(15,15,26,0.4) 100%)" }} />

        <div className="absolute bottom-0 left-0 right-0 max-w-5xl mx-auto px-4 pb-10">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {artist?.genres?.map((g: string) => (
              <span key={g} className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: "#E8A020", color: "#0F0F1A" }}>{g}</span>
            ))}
            {artist?.origin && (
              <span className="text-xs px-2.5 py-1 rounded-full" style={{ backgroundColor: "rgba(15,15,26,0.7)", color: "#aaa", border: "1px solid #333" }}>📍 {artist.origin}</span>
            )}
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-none mb-1">{lookupName}</h1>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <Link
          href="/nightwaves"
          className="inline-flex items-center gap-2 text-sm mb-8 transition-colors hover:text-white"
          style={{ color: "#555" }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Nightwaves
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-12">
          <div>
            {artist?.style_tags?.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-8">
                {artist.style_tags.map((tag: string) => (
                  <span key={tag} className="text-xs px-3 py-1 rounded-full" style={{ backgroundColor: "#111120", border: "1px solid #1e1e30", color: "#888" }}>
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {artist?.about && (
              <div className="mb-10">
                <h2 className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: "#555" }}>About</h2>
                <p className="text-base leading-relaxed" style={{ color: "#bbb" }}>{artist.about}</p>
              </div>
            )}

            {releases.length > 0 && (
              <div className="mb-10">
                <h2 className="text-sm font-bold uppercase tracking-widest mb-5" style={{ color: "#555" }}>
                  Releases on Nightup
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {releases.map((r) => (
                    <Link
                      key={r.id}
                      href={`/nightwaves/release/${r.id}`}
                      className="group block rounded-xl overflow-hidden transition-all duration-300 hover:-translate-y-1"
                      style={{ backgroundColor: "#111120", border: "1px solid #1a1a2e" }}
                    >
                      <div className="relative aspect-square overflow-hidden">
                        <Image
                          src={r.cover_image || FALLBACK}
                          alt={r.title}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        {r.is_promoted && (
                          <span className="absolute top-2 left-2 text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "#E8A020", color: "#0F0F1A" }}>⭐</span>
                        )}
                      </div>
                      <div className="p-3">
                        {r.type && <p className="text-xs mb-0.5" style={{ color: "#E8A020" }}>{r.type}</p>}
                        <h4 className="font-semibold text-sm line-clamp-1">{r.title}</h4>
                        {r.release_date && (
                          <p className="text-xs mt-0.5" style={{ color: "#555" }}>
                            {new Date(r.release_date).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {mixes.length > 0 && (
              <div className="mb-10">
                <h2 className="text-sm font-bold uppercase tracking-widest mb-5" style={{ color: "#555" }}>Mixes</h2>
                <div className="space-y-3">
                  {mixes.map((m) => (
                    <Link
                      key={m.id}
                      href={`/nightwaves/mix/${m.id}`}
                      className="flex items-center gap-4 p-3 rounded-xl transition-all hover:opacity-80"
                      style={{ backgroundColor: "#111120", border: "1px solid #1a1a2e" }}
                    >
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                        <Image src={m.cover_image || FALLBACK} alt={m.title} fill className="object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm line-clamp-1">{m.title}</h4>
                        {m.genre && <p className="text-xs mt-0.5" style={{ color: "#666" }}>{m.genre}</p>}
                      </div>
                      {m.duration && (
                        <span className="text-xs font-mono flex-shrink-0" style={{ color: "#555" }}>{m.duration}</span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar: only shown when there's a real artist profile with links */}
          {artist && (artist.spotify_url || artist.soundcloud_url || artist.instagram || artist.website) && (
            <div>
              <h2 className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: "#555" }}>Links</h2>
              <div className="flex flex-col gap-3">
                {artist.spotify_url && (
                  <a
                    href={artist.spotify_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-opacity hover:opacity-80"
                    style={{ backgroundColor: "#1DB954", color: "#fff" }}
                  >
                    <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                    </svg>
                    Spotify
                  </a>
                )}
                {artist.soundcloud_url && (
                  <a
                    href={artist.soundcloud_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-opacity hover:opacity-80"
                    style={{ backgroundColor: "#FF5500", color: "#fff" }}
                  >
                    SoundCloud
                  </a>
                )}
                {artist.instagram && (
                  <a
                    href={artist.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-opacity hover:opacity-80"
                    style={{ backgroundColor: "#111120", color: "#E8A020", border: "1px solid #E8A02040" }}
                  >
                    Instagram
                  </a>
                )}
                {artist.website && (
                  <a
                    href={artist.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-opacity hover:opacity-80"
                    style={{ backgroundColor: "#111120", color: "#aaa", border: "1px solid #333" }}
                  >
                    Website
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
