import { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getSupabase } from "../../lib/supabase";
import EventCard from "../../components/EventCard";

interface Props {
  params: Promise<{ slug: string }>;
}

interface Organizer {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  logo_url: string | null;
  cover_url: string | null;
  social_links: {
    instagram?: string;
    facebook?: string;
    soundcloud?: string;
  };
}

interface OrgEvent {
  id: string;
  title: string;
  image_url: string | null;
  genre: string;
  price: string | null;
  date: string;
  time: string | null;
  venue: string;
  city: string;
  interested_count: number;
  going_count: number;
  featured: boolean;
}

async function getOrganizer(slug: string): Promise<Organizer | null> {
  const supabase = getSupabase();
  // Try slug first
  try {
    const { data, error } = await supabase
      .from("organizers")
      .select("id, name, slug, bio, logo_url, cover_url, social_links")
      .eq("slug", slug)
      .eq("status", "approved")
      .single();
    if (!error && data) return data as Organizer;
  } catch {}
  // Try by UUID (new-format organizers without slug)
  try {
    const { data, error } = await supabase
      .from("organizers")
      .select("id, name, about, cover_image, avatar, instagram, facebook, tiktok, website, gallery, type, city")
      .eq("id", slug)
      .eq("status", "approved")
      .single();
    if (!error && data) {
      return {
        id: data.id,
        name: data.name,
        slug: data.id,
        bio: data.about ?? null,
        logo_url: data.avatar ?? null,
        cover_url: data.cover_image ?? null,
        social_links: {
          instagram: data.instagram ?? undefined,
          facebook: data.facebook ?? undefined,
        },
      } as Organizer;
    }
  } catch {}
  return null;
}

async function getOrganizerEvents(organizerId: string): Promise<OrgEvent[]> {
  try {
    const supabase = getSupabase();
    const today = new Date().toISOString().split("T")[0];
    const { data, error } = await supabase
      .from("events")
      .select("id, title, image_url, genre, price, date, time, venue, city, interested_count, going_count, featured")
      .eq("organizer_id", organizerId)
      .eq("status", "approved")
      .gte("date", today)
      .order("date", { ascending: true });

    if (error || !data) return [];
    return data as OrgEvent[];
  } catch {
    return [];
  }
}

async function getOrganizerGallery(organizerId: string): Promise<string[]> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("events")
      .select("image_url")
      .eq("organizer_id", organizerId)
      .eq("status", "approved")
      .not("image_url", "is", null)
      .order("date", { ascending: false })
      .limit(9);

    if (error || !data) return [];
    return data.map((e) => e.image_url).filter(Boolean) as string[];
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const org = await getOrganizer(slug);
  if (!org) return { title: "Organizer not found" };
  return {
    title: org.name,
    description: org.bio ? org.bio.slice(0, 155) : `Events organized by ${org.name} on Nightup.`,
  };
}

const FALLBACK_COVER = "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200&q=80";
const FALLBACK_EVENT = "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80";

export default async function OrganizerPage({ params }: Props) {
  const { slug } = await params;
  const organizer = await getOrganizer(slug);
  if (!organizer) notFound();

  const [events, gallery] = await Promise.all([
    getOrganizerEvents(organizer.id),
    getOrganizerGallery(organizer.id),
  ]);

  const socials = [
    organizer.social_links?.instagram
      ? { label: "Instagram", href: organizer.social_links.instagram, icon: (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
          </svg>
        )}
      : null,
    organizer.social_links?.facebook
      ? { label: "Facebook", href: organizer.social_links.facebook, icon: (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
        )}
      : null,
    organizer.social_links?.soundcloud
      ? { label: "SoundCloud", href: organizer.social_links.soundcloud, icon: (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M1.175 12.225c-.15 0-.25.1-.275.25l-.325 2.025.325 2.05c.025.15.125.25.275.25s.25-.1.275-.25L1.8 14.5l-.35-2.025c-.025-.15-.125-.25-.275-.25zm1.325-.85c-.175 0-.3.125-.325.3L1.85 14.5l.325 2.825c.025.175.15.3.325.3s.3-.125.325-.3L3.175 14.5l-.35-2.825c-.025-.175-.15-.3-.325-.3zm1.4-.35c-.2 0-.35.15-.375.35L3.2 14.5l.325 3.025c.025.2.175.35.375.35s.35-.15.375-.35L4.6 14.5l-.325-3.025c-.025-.2-.175-.35-.375-.35zm1.4-.2c-.225 0-.4.175-.4.4l-.3 3.275.3 3.025c0 .225.175.4.4.4s.4-.175.4-.4l.325-3.025-.325-3.275c0-.225-.175-.4-.4-.4zm1.425-.1c-.25 0-.45.2-.45.45l-.275 3.375.275 2.95c0 .25.2.45.45.45s.45-.2.45-.45l.3-2.95-.3-3.375c0-.25-.2-.45-.45-.45zm1.45 0c-.275 0-.5.225-.5.5l-.25 3.375.25 2.9c0 .275.225.5.5.5s.5-.225.5-.5l.275-2.9-.275-3.375c0-.275-.225-.5-.5-.5zm1.45-.2c-.3 0-.55.25-.55.55l-.225 3.575.225 2.85c0 .3.25.55.55.55s.55-.25.55-.55l.25-2.85-.25-3.575c0-.3-.25-.55-.55-.55zm1.475-.125c-.325 0-.575.25-.575.575l-.2 3.7.2 2.8c0 .325.25.575.575.575s.575-.25.575-.575l.225-2.8-.225-3.7c0-.325-.25-.575-.575-.575zm7.475 2.025c-.175-2.1-1.9-3.725-4.025-3.725-.575 0-1.125.125-1.625.35-.2.075-.25.15-.25.25v7.225c0 .1.075.2.175.225h5.675c.65 0 1.175-.525 1.175-1.175 0-.65-.525-1.175-1.175-1.175-.05 0-.125 0-.175.025.025-.15.025-.3.025-.45 0-1.575-1.275-2.85-2.85-2.85-.425 0-.825.1-1.175.275-.175.1-.25.2-.275.35l-.25 5.975c-.025.125.075.25.2.275h5.475c.5 0 .9-.4.9-.9 0-.5-.4-.9-.9-.9-.025 0-.05 0-.075.025z"/>
          </svg>
        )}
      : null,
  ].filter(Boolean) as { label: string; href: string; icon: React.ReactNode }[];

  return (
    <div style={{ backgroundColor: "#0F0F1A", minHeight: "100vh" }}>
      {/* Cover */}
      <div className="relative w-full" style={{ height: "clamp(200px, 30vw, 320px)" }}>
        {organizer.cover_url ? (
          organizer.cover_url.startsWith("data:") ? (
            <img src={organizer.cover_url} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <Image src={organizer.cover_url} alt="Cover" fill sizes="100vw" className="object-cover" />
          )
        ) : (
          <Image src={FALLBACK_COVER} alt="Cover" fill sizes="100vw" className="object-cover" />
        )}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to bottom, rgba(15,15,26,0.1) 0%, rgba(15,15,26,0.85) 100%)" }}
        />
      </div>

      {/* Profile header */}
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-end gap-5 -mt-16 relative z-10 mb-6">
          {/* Logo */}
          <div
            className="w-28 h-28 rounded-2xl overflow-hidden flex-shrink-0"
            style={{ border: "3px solid #E8A020", backgroundColor: "#1A1A2E" }}
          >
            {organizer.logo_url ? (
              organizer.logo_url.startsWith("data:") ? (
                <img src={organizer.logo_url} alt={organizer.name} className="w-full h-full object-cover" />
              ) : (
                <Image src={organizer.logo_url} alt={organizer.name} width={112} height={112} className="w-full h-full object-cover" />
              )
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl">🎉</div>
            )}
          </div>
          <div className="pb-2">
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "#E8A020" }}>Organizer</p>
            <h1 className="text-2xl md:text-3xl font-bold text-white">{organizer.name}</h1>
          </div>
        </div>

        {/* Bio */}
        {organizer.bio && (
          <p className="text-gray-300 leading-relaxed mb-6 max-w-2xl">{organizer.bio}</p>
        )}

        {/* Social links */}
        {socials.length > 0 && (
          <div className="flex flex-wrap gap-3 mb-10">
            {socials.map(({ label, href, icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-opacity hover:opacity-80"
                style={{ backgroundColor: "#1A1A2E", border: "1px solid #333", color: "#E8A020" }}
              >
                {icon}
                {label}
              </a>
            ))}
          </div>
        )}

        {/* Gallery */}
        {gallery.length > 0 && (
          <div className="mb-12">
            <h2 className="text-lg font-semibold text-white mb-4">Gallery</h2>
            <div className="grid grid-cols-3 gap-2 md:gap-3">
              {gallery.map((src, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden">
                  {src.startsWith("data:") ? (
                    <img src={src} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                  ) : (
                    <Image src={src} alt={`Photo ${i + 1}`} fill sizes="33vw" className="object-cover" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming events */}
        <div className="pb-16">
          <h2 className="text-lg font-semibold text-white mb-5">Upcoming Events</h2>
          {events.length === 0 ? (
            <p className="text-gray-500 text-sm">No upcoming events scheduled.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {events.map((ev) => (
                <EventCard
                  key={ev.id}
                  id={String(ev.id)}
                  title={ev.title}
                  image={ev.image_url ?? FALLBACK_EVENT}
                  genre={ev.genre}
                  price={ev.price ?? ""}
                  date={ev.date}
                  venue={ev.venue}
                  city={ev.city}
                  interestedCount={ev.interested_count ?? 0}
                  goingCount={ev.going_count ?? 0}
                  featured={ev.featured}
                  organizerName={organizer.name}
                  organizerSlug={organizer.slug}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
