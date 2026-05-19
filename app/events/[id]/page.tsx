import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSupabase } from '../../lib/supabase'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = getSupabase()
  const { data } = await supabase.from('events').select('title, description, image_url').eq('id', id).single()
  if (!data) return {}
  return {
    title: data.title,
    description: data.description ?? `${data.title} — find tickets and info on Nightup.gr`,
    openGraph: {
      title: data.title,
      description: data.description ?? '',
      images: data.image_url ? [data.image_url] : [],
    },
  }
}

export default async function EventPage({ params }: Props) {
  const { id } = await params
  const supabase = getSupabase()

  const { data: event } = await supabase
    .from('events')
    .select('id, title, image_url, date, time, venue, city, genre, description, ticket_url, lineup, price, profile_id')
    .eq('id', id)
    .eq('status', 'approved')
    .single()

  if (!event) notFound()

  // Lineup: normalise both array and comma-string formats
  const lineup: string[] = Array.isArray(event.lineup)
    ? event.lineup
    : typeof event.lineup === 'string' && event.lineup
    ? event.lineup.split(',').map((s: string) => s.trim()).filter(Boolean)
    : []

  // Price: numeric display
  const priceNum = event.price ? parseFloat(String(event.price).replace(/[^0-9.]/g, '')) : 0
  const priceLabel = priceNum > 0 ? `€${priceNum}` : 'Free'

  const formattedDate = event.date
    ? new Date(event.date).toLocaleDateString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })
    : null

  // Organizer profile
  let organizer: { id: string; username: string; display_name: string | null; avatar_url: string | null; bio: string | null } | null = null
  if (event.profile_id) {
    const { data } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, bio')
      .eq('id', event.profile_id)
      .single()
    organizer = data ?? null
  }

  // More events from same organizer
  let moreEvents: { id: string; title: string; image_url: string | null; date: string }[] = []
  if (event.profile_id) {
    const { data } = await supabase
      .from('events')
      .select('id, title, image_url, date')
      .eq('profile_id', event.profile_id)
      .eq('status', 'approved')
      .neq('id', id)
      .order('date', { ascending: true })
      .limit(3)
    moreEvents = data ?? []
  }

  const heroStyle: React.CSSProperties = event.image_url
    ? {
        backgroundImage: `linear-gradient(to bottom, rgba(15,15,26,0.3) 0%, rgba(15,15,26,0.7) 60%, #0F0F1A 100%), url(${event.image_url})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : {
        background: 'linear-gradient(to bottom, #1a1a2e 0%, #0F0F1A 100%)',
      }

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
    "image": event.image_url ?? "https://nightup.gr/og-image.png",
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
      <div style={{ width: '100%', height: 'clamp(260px, 42vw, 440px)', ...heroStyle }} />

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
            <span>{priceLabel}</span>
          </div>
        </div>

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

        {/* Lineup */}
        {lineup.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: 12 }}>
              Lineup
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {lineup.map((artist, i) => (
                <span key={i} style={{
                  fontSize: 13, padding: '6px 14px', borderRadius: 999,
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  color: 'rgba(255,255,255,0.85)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}>
                  {artist}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        {event.description && (
          <div style={{ marginBottom: 40 }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: 12 }}>
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
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: 14 }}>
              Organizer
            </p>
            <Link href={`/profile/${organizer.username}`} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '16px',
                borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)', transition: 'border-color 0.2s',
              }}>
                {organizer.avatar_url ? (
                  <img
                    src={organizer.avatar_url}
                    alt={organizer.display_name ?? organizer.username}
                    style={{ width: 48, height: 48, borderRadius: 12, objectFit: 'cover', flexShrink: 0, border: '1px solid rgba(232,160,32,0.3)' }}
                  />
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

        {/* More events from same organizer */}
        {moreEvents.length > 0 && (
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: 14 }}>
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
                    {e.image_url ? (
                      <img
                        src={e.image_url}
                        alt={e.title}
                        style={{ width: 52, height: 52, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
                      />
                    ) : (
                      <div style={{ width: 52, height: 52, borderRadius: 8, flexShrink: 0, backgroundColor: 'rgba(255,255,255,0.06)' }} />
                    )}
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
