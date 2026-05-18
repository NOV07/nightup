import { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getSupabase } from "../../../lib/supabase";

function formatDuration(d: string | number | null | undefined): string | null {
  if (!d) return null;
  const n = Number(d);
  if (isNaN(n)) return String(d);
  if (n >= 60) {
    const h = Math.floor(n / 60);
    const m = n % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${n} min`;
}

import MixPlayButton from "./MixPlayButton";
import SocialShare from "./SocialShare";
import SoundCloudPlayer from "../../../components/SoundCloudPlayer";

interface Props { params: Promise<{ id: string }>; }

export const dynamic = "force-dynamic";

const FALLBACK = "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80";

async function getMix(id: string) {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.from("mixes").select("*").eq("id", id).eq("status", "approved").single();
    if (!error && data) return data;
  } catch {}
  return null;
}

async function getRelatedMixes(id: string, genre: string | null) {
  try {
    const supabase = getSupabase();
    let q = supabase.from("mixes").select("id, title, artist, genre, cover_image, duration").eq("status", "approved").neq("id", id).order("created_at", { ascending: false }).limit(3);
    if (genre) q = q.ilike("genre", genre);
    const { data } = await q;
    if (data && data.length > 0) return data;
    // fallback: any 3 mixes
    const { data: fallback } = await supabase.from("mixes").select("id, title, artist, genre, cover_image, duration").eq("status", "approved").neq("id", id).order("created_at", { ascending: false }).limit(3);
    return fallback ?? [];
  } catch { return []; }
}

async function getArtistInfo(name: string) {
  try {
    const supabase = getSupabase();
    const { data } = await supabase.from("artists").select("id, name, photo, genres, origin").ilike("name", name).eq("status", "approved").single();
    return data ?? null;
  } catch { return null; }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const mix = await getMix(id);
  if (!mix) return { title: "Mix not found" };
  return {
    title: `${mix.artist} — ${mix.title}`,
    description: mix.description ?? `${mix.genre ?? ""} mix by ${mix.artist}`,
  };
}

export default async function MixPage({ params }: Props) {
  const { id } = await params;
  const mix = await getMix(id);
  if (!mix) notFound();

  const [related, artist] = await Promise.all([
    getRelatedMixes(id, mix.genre ?? null),
    getArtistInfo(mix.artist),
  ]);

  const track = {
    id: mix.id,
    title: mix.title,
    artist: mix.artist,
    cover: mix.cover_image,
    soundcloudUrl: mix.soundcloud_url ?? undefined,
    type: "mix" as const,
  };

  return (
    <div style={{ backgroundColor: "#0F0F1A", minHeight: "100vh" }}>

      {/* Hero — full-width cover with overlay */}
      <div className="relative w-full overflow-hidden" style={{ height: "clamp(280px, 40vw, 480px)" }}>
        <Image
          src={mix.cover_image || FALLBACK}
          alt={mix.title}
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(15,15,26,0.2) 0%, rgba(15,15,26,0.6) 50%, rgba(15,15,26,1) 100%)" }} />
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, transparent 30%, rgba(15,15,26,0.5) 100%)" }} />

        {/* Back button inside hero */}
        <div className="absolute top-4 left-4 z-10">
          <Link
            href="/nightwaves"
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full backdrop-blur-sm transition-colors hover:text-white"
            style={{ backgroundColor: "rgba(15,15,26,0.6)", color: "#888", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Nightwaves
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 -mt-10 relative z-10 pb-16">

        {/* Info row */}
        <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-8 md:gap-12 mb-8">
          <div>
            {/* Badges */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <span className="text-xs font-black px-3 py-1 rounded-full tracking-widest uppercase" style={{ backgroundColor: "#E8A020", color: "#0F0F1A" }}>Mix</span>
              {mix.genre && (
                <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ backgroundColor: "#1A1A2E", color: "#E8A020", border: "1px solid #E8A02040" }}>{mix.genre}</span>
              )}
              {mix.duration && (
                <span className="text-xs px-3 py-1 rounded-full font-mono" style={{ backgroundColor: "#1A1A2E", color: "#888", border: "1px solid #222" }}>{formatDuration(mix.duration)}</span>
              )}
            </div>

            <Link
              href={`/nightwaves/artist/${encodeURIComponent(mix.artist)}`}
              className="text-sm font-semibold hover:underline block mb-2"
              style={{ color: "#E8A020" }}
            >
              {mix.artist}
            </Link>
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight mb-4">{mix.title}</h1>

            {mix.description && (
              <p className="text-sm leading-relaxed mb-6" style={{ color: "#888" }}>{mix.description}</p>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              {mix.soundcloud_url && (
                <MixPlayButton
                  soundcloudUrl={mix.soundcloud_url}
                  title={mix.title}
                  artist={mix.artist}
                  cover={mix.cover_image}
                />
              )}
              {mix.soundcloud_url && (
                <a
                  href={mix.soundcloud_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
                  style={{ backgroundColor: "#FF5500", color: "#fff" }}
                >
                  Open on SoundCloud ↗
                </a>
              )}
            </div>

            <SocialShare title={mix.title} artist={mix.artist} />
          </div>

          {/* Artist mini card */}
          {artist && (
            <div
              className="rounded-2xl p-5 flex flex-col gap-4 h-fit"
              style={{ backgroundColor: "#111120", border: "1px solid #1a1a2e" }}
            >
              <div className="flex items-center gap-3">
                <div className="relative w-14 h-14 rounded-full overflow-hidden flex-shrink-0">
                  <Image src={artist.photo || FALLBACK} alt={artist.name} fill className="object-cover" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold truncate">{artist.name}</p>
                  {artist.origin && <p className="text-xs" style={{ color: "#666" }}>📍 {artist.origin}</p>}
                </div>
              </div>
              {artist.genres?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {artist.genres.slice(0, 3).map((g: string) => (
                    <span key={g} className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "#0F0F1A", color: "#E8A020", border: "1px solid #E8A02030" }}>{g}</span>
                  ))}
                </div>
              )}
              <Link
                href={`/nightwaves/artist/${encodeURIComponent(artist.name)}`}
                className="text-xs font-semibold inline-flex items-center gap-1 transition-colors hover:text-white"
                style={{ color: "#E8A020" }}
              >
                View Profile →
              </Link>
            </div>
          )}
        </div>

        {/* Custom audio player */}
        {mix.soundcloud_url && (
          <div className="mb-12">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#444" }}>Listen</p>
            <SoundCloudPlayer track={track} />
          </div>
        )}

        {/* More Mixes */}
        {related.length > 0 && (
          <div>
            <h2 className="text-xl font-bold mb-6">More Mixes</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {(related as any[]).map((m) => (
                <Link
                  key={m.id}
                  href={`/nightwaves/mix/${m.id}`}
                  className="group flex items-center gap-3 p-3 rounded-xl transition-all hover:opacity-80"
                  style={{ backgroundColor: "#111120", border: "1px solid #1a1a2e" }}
                >
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
                    <Image src={m.cover_image || FALLBACK} alt={m.title} fill className="object-cover transition-transform duration-300 group-hover:scale-105" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs mb-0.5 truncate" style={{ color: "#E8A020" }}>{m.artist}</p>
                    <h4 className="font-semibold text-sm line-clamp-1">{m.title}</h4>
                    {m.genre && <p className="text-xs mt-0.5 truncate" style={{ color: "#555" }}>{m.genre}</p>}
                  </div>
                  {m.duration && (
                    <span className="text-xs font-mono flex-shrink-0" style={{ color: "#444" }}>{formatDuration(m.duration)}</span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
