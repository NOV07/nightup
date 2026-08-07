import { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSupabase } from '../../lib/supabase'
import { logQueryError } from '../../lib/logQueryError'
import { formatPrice } from '../../lib/formatPrice'
import { getEventCoverImage, getEventCrop } from '../../lib/getEventCoverImage'
import { getAvatarCrop } from '../../lib/profileCrop'
import EventHeroImage from '../../components/EventHeroImage'
import CroppedImage from '../../../components/ui/CroppedImage'
import T from '../../components/T'
import type { TranslationKey } from '../../lib/translations'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = getSupabase()
  const { data } = await supabase.from('events').select('title, description, image_url, has_copyright_restriction').eq('id', id).single()
  if (!data) return {}
  return {
    title: data.title,
    description: data.description ?? `${data.title}: find tickets and info on Nightup.gr`,
    openGraph: {
      title: data.title,
      description: data.description ?? '',
      images: [getEventCoverImage(data)],
    },
  }
}

export default async function EventPage({ params }: Props) {
  const { id } = await params
  const supabase = getSupabase()

  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, title, image_url, has_copyright_restriction, crop_x, crop_y, crop_width, crop_height, date, time, venue, city, genre, description, ticket_url, lineup, contributors, price, profile_id, editorial_owner_name, instagram, facebook, tiktok, website, gallery, dress_code, age_restriction_level')
    .eq('id', id)
    .eq('status', 'approved')
    .single()

  // Logged so a broken query is not mistaken for a missing event; a genuinely
  // missing row is filtered out by the helper. `notFound()` stays the response.
  logQueryError(`events/${id}`, 'event', eventError)

  if (!event) notFound()

  supabase.rpc('increment_event_views', { event_id: id }).then(() => {}, () => {})

  // Lineup: normalise both array and comma-string formats
  const lineup: string[] = Array.isArray(event.lineup)
    ? event.lineup
    : typeof event.lineup === 'string' && event.lineup
    ? event.lineup.split(',').map((s: string) => s.trim()).filter(Boolean)
    : []

  // Contributors: normalise both array and comma-string formats
  const contributors: string[] = Array.isArray(event.contributors)
    ? event.contributors
    : typeof event.contributors === 'string' && event.contributors
    ? event.contributors.split(',').map((s: string) => s.trim()).filter(Boolean)
    : []

  const gallery: string[] = Array.isArray(event.gallery) ? event.gallery.filter(Boolean) : []

  // Entry conditions worth calling out above the ticket CTA
  const infoCards: { key: TranslationKey; value: string }[] = []
  if (event.age_restriction_level && event.age_restriction_level !== 'none') {
    infoCards.push({ key: 'event_age_restriction_heading', value: event.age_restriction_level })
  }
  if (event.dress_code) {
    infoCards.push({ key: 'event_form_dress_code_label', value: event.dress_code })
  }

  const priceLabel = formatPrice(event.price)

  const formattedDate = event.date
    ? new Date(event.date).toLocaleDateString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })
    : null

  // Organizer profile
  let organizer: { id: string; username: string; display_name: string | null; avatar_url: string | null; avatar_crop_x: number | null; avatar_crop_y: number | null; avatar_crop_width: number | null; avatar_crop_height: number | null; bio: string | null } | null = null
  if (event.profile_id) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, avatar_crop_x, avatar_crop_y, avatar_crop_width, avatar_crop_height, bio')
      .eq('id', event.profile_id)
      .single()
    logQueryError(`events/${id}`, 'organizer profile', error)
    organizer = data ?? null
  }

  // When the host is a spot account, point the card at the spot page rather
  // than the bare profile — the spot is what the reader actually wants.
  let hostSpot: { slug: string; name: string } | null = null
  if (event.profile_id) {
    const { data } = await supabase
      .from('spots')
      .select('slug, name')
      .eq('owner_id', event.profile_id)
      .eq('is_published', true)
      .maybeSingle()
    hostSpot = data ?? null
  }

  // More events from same organizer
  let moreEvents: { id: string; title: string; image_url: string | null; has_copyright_restriction: boolean; crop_x: number | null; crop_y: number | null; crop_width: number | null; crop_height: number | null; date: string }[] = []
  if (event.profile_id) {
    const { data, error } = await supabase
      .from('events')
      .select('id, title, image_url, has_copyright_restriction, crop_x, crop_y, crop_width, crop_height, date')
      .eq('profile_id', event.profile_id)
      .eq('status', 'approved')
      .neq('id', id)
      .order('date', { ascending: true })
      .limit(3)
    logQueryError(`events/${id}`, 'more events', error)
    moreEvents = data ?? []
  }

  // Artist profiles for lineup matching (case-insensitive, trimmed exact match — same as profile page)
  const { data: artistProfiles, error: artistProfilesError } = await supabase
    .from('profiles')
    .select('id, username, display_name')
    .eq('profile_type', 'artist')

  logQueryError(`events/${id}`, 'artist profiles', artistProfilesError)

  function findArtistProfile(name: string) {
    return (artistProfiles ?? []).find(
      (a: { display_name: string | null }) =>
        (a.display_name ?? '').toLowerCase().trim() === name.toLowerCase().trim()
    )
  }

  // Professional profiles for contributors matching (case-insensitive, trimmed exact match — same as lineup)
  const { data: professionalProfiles, error: professionalProfilesError } = await supabase
    .from('profiles')
    .select('id, username, display_name')
    .eq('profile_type', 'professional')

  logQueryError(`events/${id}`, 'professional profiles', professionalProfilesError)

  function findProfessionalProfile(name: string) {
    return (professionalProfiles ?? []).find(
      (p: { display_name: string | null }) =>
        (p.display_name ?? '').toLowerCase().trim() === name.toLowerCase().trim()
    )
  }


  const eventSocials = [
    event.instagram
      ? { label: 'Instagram', href: event.instagram, icon: (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
          </svg>
        )}
      : null,
    event.facebook
      ? { label: 'Facebook', href: event.facebook, icon: (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
        )}
      : null,
    event.tiktok
      ? { label: 'TikTok', href: event.tiktok, icon: (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.43 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
          </svg>
        )}
      : null,
    event.website
      ? { label: 'Website', href: event.website, icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12h20M12 2a15.3 15.3 0 0 1 0 20M12 2a15.3 15.3 0 0 0 0 20" />
          </svg>
        )}
      : null,
  ].filter(Boolean) as { label: string; href: string; icon: ReactNode }[]

  const eventJsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    "name": event.title,
    "startDate": event.date,
    "location": {
      "@type": "Place",
      "name": event.venue,
      "address": {
        "@type": "PostalAddress",
        "addressLocality": event.city,
        "addressCountry": "GR",
      },
    },
    "description": event.description ?? event.title,
    "image": getEventCoverImage(event),
    ...(event.price ? {
      "offers": {
        "@type": "Offer",
        "price": parseFloat(String(event.price).replace(/[^0-9.]/g, '')) || 0,
        "priceCurrency": "EUR",
        "availability": "https://schema.org/InStock",
      },
    } : {}),
    "organizer": {
      "@type": "Organization",
      "name": "Nightup.gr",
      "url": "https://nightup.gr",
    },
  };

  return (
    <div style={{ backgroundColor: '#0F0F1A', minHeight: '100vh', color: '#fff' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(eventJsonLd) }} />

      {/* Hero */}
      <EventHeroImage imageUrl={getEventCoverImage(event)} crop={getEventCrop(event)} title={event.title ?? ""} genre={event.genre ?? undefined} venue={event.venue ?? undefined} date={event.date ?? undefined} />

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 1.25rem 5rem', marginTop: -72, position: 'relative' }}>

        {/* Genre badge */}
        {event.genre && (
          <span style={{
            display: 'inline-block', fontSize: 11, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.1em',
            padding: '4px 12px', borderRadius: 999, marginBottom: 16,
            backgroundColor: 'rgba(232,160,32,0.15)', color: '#E8A020',
            border: '1px solid rgba(232,160,32,0.3)',
          }}>
            {event.genre}
          </span>
        )}

        {/* Title */}
        <h1 style={{ fontSize: 'clamp(1.6rem, 5vw, 2.2rem)', fontWeight: 800, lineHeight: 1.2, marginBottom: 24 }}>
          {event.title}
        </h1>

        {/* Meta */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
          {formattedDate && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>
              <span style={{ color: '#E8A020' }}>📅</span>
              <span>{formattedDate}{event.time ? ` · ${event.time}` : ''}</span>
            </div>
          )}
          {event.venue && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>
              <span style={{ color: '#E8A020' }}>📍</span>
              <span>{event.venue}{event.city ? `, ${event.city}` : ''}</span>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>
            <span style={{ color: '#E8A020' }}>🎟</span>
            <span>{priceLabel || <T k="events_free_entry_fallback" />}</span>
          </div>
        </div>

        {/* Info cards */}
        {infoCards.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(infoCards.length, 2)}, 1fr)`, gap: 10, marginBottom: 32 }}>
            {infoCards.map(card => (
              <div key={card.key} style={{
                padding: '12px 14px', borderRadius: 12,
                backgroundColor: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.40)' }}>
                  <T k={card.key} />
                </p>
                <p style={{ fontSize: 14, color: '#fff', marginTop: 4 }}>{card.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Ticket CTA */}
        {event.ticket_url && (
          <a
            href={event.ticket_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block', width: '100%', textAlign: 'center',
              backgroundColor: '#E8A020', color: '#0F0F1A',
              fontWeight: 700, fontSize: 15, padding: '14px 0',
              borderRadius: 12, marginBottom: 36, textDecoration: 'none',
            }}
          >
            Get Tickets
          </a>
        )}

        {/* Follow & Connect */}
        {eventSocials.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.50)', marginBottom: 12 }}>
              <T k="events_follow_connect" />
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {eventSocials.map(s => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 40, height: 40, borderRadius: 10,
                    backgroundColor: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#E8A020', textDecoration: 'none',
                  }}
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Lineup */}
        {lineup.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.50)', marginBottom: 12 }}>
              Lineup
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {lineup.map((artist, i) => {
                const matchedProfile = findArtistProfile(artist)
                if (matchedProfile) {
                  return (
                    <Link key={i} href={`/profile/${matchedProfile.username}`} style={{
                      fontSize: 13, padding: '6px 14px', borderRadius: 999,
                      backgroundColor: 'rgba(232,160,32,0.10)',
                      color: '#E8A020',
                      border: '1px solid rgba(232,160,32,0.3)',
                      textDecoration: 'none',
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                    }}>
                      {artist}
                      <span style={{ fontSize: 11 }}>→</span>
                    </Link>
                  )
                }
                return (
                  <span key={i} style={{
                    fontSize: 13, padding: '6px 14px', borderRadius: 999,
                    backgroundColor: 'rgba(255,255,255,0.06)',
                    color: 'rgba(255,255,255,0.85)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}>
                    {artist}
                  </span>
                )
              })}
            </div>
          </div>
        )}

        {/* Contributors */}
        {contributors.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.50)', marginBottom: 12 }}>
              <T k="event_contributors_heading" />
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {contributors.map((contributor, i) => {
                const matchedProfile = findProfessionalProfile(contributor)
                if (matchedProfile) {
                  return (
                    <Link key={i} href={`/profile/${matchedProfile.username}`} style={{
                      fontSize: 13, padding: '6px 14px', borderRadius: 999,
                      backgroundColor: 'rgba(232,160,32,0.10)',
                      color: '#E8A020',
                      border: '1px solid rgba(232,160,32,0.3)',
                      textDecoration: 'none',
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                    }}>
                      {contributor}
                      <span style={{ fontSize: 11 }}>→</span>
                    </Link>
                  )
                }
                return (
                  <span key={i} style={{
                    fontSize: 13, padding: '6px 14px', borderRadius: 999,
                    backgroundColor: 'rgba(255,255,255,0.06)',
                    color: 'rgba(255,255,255,0.85)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}>
                    {contributor}
                  </span>
                )
              })}
            </div>
          </div>
        )}

        {/* Gallery */}
        {gallery.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.50)', marginBottom: 12 }}>
              <T k="event_gallery_heading" />
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
              {gallery.map((url, i) => (
                <div key={i} style={{
                  position: 'relative', aspectRatio: '1 / 1', borderRadius: 12, overflow: 'hidden',
                  backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                }}>
                  <CroppedImage src={url} alt={`${event.title} ${i + 1}`} sizes="(max-width: 680px) 45vw, 220px" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        {event.description && (
          <div style={{ marginBottom: 40 }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.50)', marginBottom: 12 }}>
              About
            </p>
            <p style={{ fontSize: 14, lineHeight: 1.75, color: 'rgba(255,255,255,0.68)' }}>
              {event.description}
            </p>
          </div>
        )}

        {/* Organizer card */}
        {organizer && (
          <div style={{ marginBottom: 40, paddingTop: 32, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.50)', marginBottom: 14 }}>
              {hostSpot ? 'Spot' : 'Organizer'}
            </p>
            <Link href={hostSpot ? `/spots/${hostSpot.slug}` : `/profile/${organizer.username}`} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '16px',
                borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)', transition: 'border-color 0.2s',
              }}>
                {organizer.avatar_url ? (
                  <div style={{ position: 'relative', width: 48, height: 48, borderRadius: 12, overflow: 'hidden', flexShrink: 0, border: '1px solid rgba(232,160,32,0.3)' }}>
                    <CroppedImage
                      src={organizer.avatar_url}
                      alt={organizer.display_name ?? organizer.username}
                      crop={getAvatarCrop(organizer)}
                      sizes="48px"
                    />
                  </div>
                ) : (
                  <div style={{
                    width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                    backgroundColor: 'rgba(232,160,32,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, fontWeight: 700, color: '#E8A020',
                    border: '1px solid rgba(232,160,32,0.3)',
                  }}>
                    {(organizer.display_name ?? organizer.username)[0]?.toUpperCase()}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 3 }}>
                    {organizer.display_name ?? organizer.username}
                  </p>
                  {organizer.bio && (
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.4, margin: 0 }}>
                      {organizer.bio.length > 100 ? organizer.bio.slice(0, 100) + '…' : organizer.bio}
                    </p>
                  )}
                </div>
                <span style={{ fontSize: 13, color: '#E8A020', flexShrink: 0 }}>→</span>
              </div>
            </Link>
          </div>
        )}

        {/* Editorial events have no account behind them — show the owner name as
            plain text. Deliberately not a link: there is no profile to open. */}
        {!organizer && event.editorial_owner_name && (
          <div style={{ marginBottom: 40, paddingTop: 32, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.50)', marginBottom: 14 }}>
              Organizer
            </p>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0 }}>
              {event.editorial_owner_name}
            </p>
          </div>
        )}

        {/* More events from same organizer */}
        {moreEvents.length > 0 && (
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.50)', marginBottom: 14 }}>
              More Events
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {moreEvents.map(e => (
                <Link key={e.id} href={`/events/${e.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px',
                    borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}>
                    <div style={{ position: 'relative', width: 52, height: 52, borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
                      <CroppedImage
                        src={getEventCoverImage(e)}
                        alt={e.title}
                        crop={getEventCrop(e)}
                        sizes="52px"
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {e.title}
                      </p>
                      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                        {e.date ? new Date(e.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                      </p>
                    </div>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>→</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
