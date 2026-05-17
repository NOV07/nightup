import { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getSupabase } from "../../lib/supabase";
import ContactModal from "./ContactModal";
import TranslatedText from "../../components/TranslatedText";

interface Props {
  params: Promise<{ id: string }>;
}

const SOCIAL_ICONS: Record<string, (cls: string) => React.ReactNode> = {
  instagram: (cls) => (
    <svg className={cls} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  ),
  facebook: (cls) => (
    <svg className={cls} fill="currentColor" viewBox="0 0 24 24">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  ),
  tiktok: (cls) => (
    <svg className={cls} fill="currentColor" viewBox="0 0 24 24">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.93a8.16 8.16 0 004.77 1.52V7.01a4.85 4.85 0 01-1-.32z" />
    </svg>
  ),
  youtube: (cls) => (
    <svg className={cls} fill="currentColor" viewBox="0 0 24 24">
      <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  ),
  soundcloud: (cls) => (
    <svg className={cls} fill="currentColor" viewBox="0 0 24 24">
      <path d="M1.175 12.225c-.015 0-.023.01-.023.025l-.272 1.75.272 1.7c0 .015.008.025.023.025.014 0 .023-.01.023-.025l.31-1.7-.31-1.75c0-.014-.01-.025-.023-.025zm.544-.188c-.02 0-.03.013-.03.03l-.234 1.938.234 1.894c0 .017.01.03.03.03.018 0 .03-.013.03-.03l.267-1.894-.267-1.937c0-.018-.012-.031-.03-.031zm.554-.14c-.024 0-.04.016-.04.04l-.196 2.078.196 2.028c0 .024.016.04.04.04.023 0 .04-.016.04-.04l.223-2.028-.223-2.078c0-.024-.017-.04-.04-.04zM11.99 6.5c-.638 0-1.243.13-1.79.362C9.907 4.55 8.11 3 5.95 3c-.505 0-.987.1-1.425.28C4.19 3.42 4 3.714 4 4.038V17.5c0 .828.672 1.5 1.5 1.5h6.49c.828 0 1.5-.672 1.5-1.5V8c0-.828-.672-1.5-1.5-1.5zm9.51 3.05c-.44 0-.857.09-1.235.252C19.903 7.363 18.073 6 15.9 6c-.44 0-.862.07-1.257.196V17.5c0 .276.224.5.5.5H21.5c.828 0 1.5-.672 1.5-1.5v-5.45c0-1.38-1.12-2.5-2.5-2.5z" />
    </svg>
  ),
  spotify: (cls) => (
    <svg className={cls} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  ),
  website: (cls) => (
    <svg className={cls} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  ),
}

async function getProfessional(id: string) {
  try {
    const supabase = getSupabase();

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    let data: any = null;
    let error: any = null;

    if (isUUID) {
      const result = await supabase
        .from("professionals")
        .select("*, profiles(avatar_url, username)")
        .eq("id", id)
        .eq("status", "approved")
        .maybeSingle();
      data = result.data;
      error = result.error;
    }

    if (!data) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", id)
        .maybeSingle();

      if (profile) {
        const result = await supabase
          .from("professionals")
          .select("*, profiles(avatar_url, username)")
          .eq("profile_id", profile.id)
          .eq("status", "approved")
          .maybeSingle();
        data = result.data;
        error = result.error;
      }
    }

    // Final fallback: try by professional name (case-insensitive)
    if (!data) {
      const result = await supabase
        .from("professionals")
        .select("*, profiles(avatar_url, username)")
        .ilike("name", id)
        .eq("status", "approved")
        .maybeSingle();
      data = result.data;
      error = result.error;
    }

    if (!error && data) {
      return {
        id: String(data.id),
        name: data.name,
        avatar: (data.profiles as any)?.avatar_url ?? null,
        category: data.category ?? "",
        availability: data.availability ?? null,
        location: data.city ?? "",
        description: data.description ?? "",
        tags: (data.tags as string[]) ?? [],
        gallery: (data.gallery as string[]) ?? [],
        phone: data.phone ?? null,
        email: data.email ?? null,
        instagram: data.instagram ?? null,
        facebook: data.facebook ?? null,
        tiktok: data.tiktok ?? null,
        youtube: data.youtube ?? null,
        soundcloud: data.soundcloud ?? null,
        spotify: data.spotify ?? null,
        website: data.website ?? null,
      };
    }
  } catch (e) {
    console.error('PARTY CATCH:', e);
  }

  return null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const pro = await getProfessional(id);
  if (!pro) return { title: "Professional not found" };
  return { title: pro.name };
}

export default async function ProfessionalPage({ params }: Props) {
  const { id } = await params;
  const pro = await getProfessional(id);
  if (!pro) notFound();

  const socials = [
    { key: "instagram", label: "Instagram", href: pro.instagram },
    { key: "facebook", label: "Facebook", href: pro.facebook },
    { key: "tiktok", label: "TikTok", href: pro.tiktok },
    { key: "youtube", label: "YouTube", href: pro.youtube },
    { key: "soundcloud", label: "SoundCloud", href: pro.soundcloud },
    { key: "spotify", label: "Spotify", href: pro.spotify },
    { key: "website", label: "Website", href: pro.website },
  ].filter((s) => s.href);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <Link href="/party" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-8 transition-colors">
        ← Back to Party
      </Link>

      <div className="grid md:grid-cols-3 gap-10">

        {/* Sidebar */}
        <div className="md:col-span-1">
          <div className="sticky top-24">

            {/* Avatar */}
            <div className="relative w-32 h-32 mx-auto md:mx-0 rounded-full overflow-hidden mb-4" style={{ boxShadow: "0 0 0 4px #E8A020" }}>
              {pro.avatar ? (
                <Image src={pro.avatar} alt={pro.name} fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-bold" style={{ backgroundColor: "#1A1A2E", color: "#E8A020" }}>
                  {pro.name[0]?.toUpperCase()}
                </div>
              )}
            </div>

            <h1 className="text-2xl font-bold mb-1 text-center md:text-left">{pro.name}</h1>

            {pro.category && (
              <p className="text-sm mb-2 text-center md:text-left" style={{ color: "#E8A020" }}>{pro.category}</p>
            )}

            {/* Tags */}
            {pro.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3 justify-center md:justify-start">
                {pro.tags.map((tag) => (
                  <span key={tag} className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(232,160,32,0.1)", color: "#E8A020", border: "0.5px solid rgba(232,160,32,0.25)" }}>
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Location */}
            {pro.location && (
              <p className="text-sm text-gray-400 mb-3 text-center md:text-left">📍 {pro.location}</p>
            )}

            {/* Availability */}
            {pro.availability && (
              <div className="flex justify-center md:justify-start mb-4">
                <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{
                  backgroundColor: pro.availability === "available" ? "rgba(74,222,128,0.1)" : "rgba(255,255,255,0.06)",
                  color: pro.availability === "available" ? "#4ade80" : "rgba(255,255,255,0.4)",
                  border: `0.5px solid ${pro.availability === "available" ? "rgba(74,222,128,0.25)" : "rgba(255,255,255,0.1)"}`,
                }}>
                  {pro.availability === "available" ? "● Available" : "○ Busy"}
                </span>
              </div>
            )}

            {/* Socials */}
            {socials.length > 0 && (
              <div className="flex items-center gap-3 mb-6 flex-wrap justify-center md:justify-start">
                {socials.map(({ key, label, href }) => (
                  <a
                    key={key}
                    href={href!}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="transition-opacity hover:opacity-80"
                    style={{ color: "#E8A020" }}
                  >
                    {SOCIAL_ICONS[key]?.("w-5 h-5")}
                  </a>
                ))}
              </div>
            )}

            <ContactModal name={pro.name} phone={pro.phone ?? undefined} email={pro.email ?? undefined} />
          </div>
        </div>

        {/* Main content */}
        <div className="md:col-span-2 space-y-8">

          {pro.description && (
            <div>
              <h2 className="text-xl font-semibold mb-3">About</h2>
              <p className="text-gray-300 leading-relaxed">
                <TranslatedText text={pro.description} />
              </p>
            </div>
          )}

          {pro.gallery.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Gallery</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {pro.gallery.map((photo, i) => (
                  <div key={i} className="relative aspect-[4/3] rounded-xl overflow-hidden">
                    <Image src={photo} alt={`Gallery ${i + 1}`} fill className="object-cover hover:scale-105 transition-transform duration-300" />
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
