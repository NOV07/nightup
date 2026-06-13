import { createClient } from '@/app/lib/supabase-server'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Metadata } from 'next'
import ContactPill from '@/app/components/ContactPill'

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80"

interface Props {
  params: Promise<{ username: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('profiles').select('display_name, bio, avatar_url').eq('username', username).single()
  if (!data) return { title: 'Profile | Nightup.gr' }
  return {
    title: data.display_name,
    description: data.bio ? data.bio.slice(0, 155) : `${data.display_name} on Nightup.gr`,
    openGraph: {
      title: data.display_name,
      description: data.bio?.slice(0, 155),
      images: data.avatar_url && !data.avatar_url.includes('pravatar') && !data.avatar_url.includes('picsum') ? [data.avatar_url] : [],
    },
  }
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params
  const supabase = await createClient()

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single()

  if (error || !profile) notFound()
  if (profile.profile_type === 'user') notFound()

  const visibility = profile.section_visibility ?? {}

  // Fetch content based on profile type
  let upcomingEvents: any[] = []
  let releases: any[] = []
  let professional: any = null

  // Artist: find events where display_name appears in lineup
  if (profile.profile_type === 'artist') {
    const { data: allEvents } = await supabase
      .from('events')
      .select('id, title, image_url, genre, date, time, venue, city, lineup')
      .eq('status', 'approved')
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true })

    if (allEvents) {
      upcomingEvents = allEvents.filter((event: any) => {
        const lineup = event.lineup ?? []
        return lineup.some((name: string) =>
          name.toLowerCase().trim() === profile.display_name.toLowerCase().trim()
        )
      })
    }

    if (visibility.releases !== false) {
      const { data } = await supabase
        .from('music_releases')
        .select('id, title, artist, type, cover_image, release_date, soundcloud_url, spotify_url')
        .eq('profile_id', profile.id)
        .eq('status', 'approved')
        .order('release_date', { ascending: false })
      releases = data ?? []
    }
  }

  // Organizer/Venue: find events by profile_id
  if (profile.profile_type === 'organizer' || profile.profile_type === 'venue') {
    const { data } = await supabase
      .from('events')
      .select('id, title, image_url, genre, date, time, venue, city, ticket_url')
      .eq('profile_id', profile.id)
      .eq('status', 'approved')
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true })
    upcomingEvents = data ?? []
  }

  // Professional
  if (profile.profile_type === 'professional') {
    const { data } = await supabase
      .from('professionals')
      .select('*')
      .eq('profile_id', profile.id)
      .eq('status', 'approved')
      .single()
    professional = data ?? null
  }

  const profileTypeLabel: Record<string, string> = {
    organizer: 'Organizer',
    artist: 'Artist / DJ',
    venue: 'Venue',
    professional: 'Professional',
  }

  const socialSource = profile.profile_type === 'professional' && professional ? professional : profile;

  function normalizeSocial(handle: string | null | undefined, baseUrl: string): string | null {
    if (!handle) return null;
    if (handle.startsWith('http://') || handle.startsWith('https://')) return handle;
    const cleanHandle = handle.replace(/^@/, '');
    if (baseUrl.includes('tiktok.com')) return `${baseUrl}/@${cleanHandle}`;
    return `${baseUrl}/${cleanHandle}`;
  }

  const socialLinks = [
    { key: 'instagram',  label: 'Instagram',  url: normalizeSocial(socialSource.instagram, 'https://instagram.com') },
    { key: 'facebook',   label: 'Facebook',   url: normalizeSocial(socialSource.facebook, 'https://facebook.com') },
    { key: 'tiktok',     label: 'TikTok',     url: normalizeSocial(socialSource.tiktok, 'https://tiktok.com') },
    { key: 'youtube',    label: 'YouTube',    url: normalizeSocial(socialSource.youtube || socialSource.youtube_url, 'https://youtube.com/@') },
    { key: 'soundcloud', label: 'SoundCloud', url: normalizeSocial(socialSource.soundcloud || socialSource.soundcloud_url, 'https://soundcloud.com') },
    { key: 'spotify',    label: 'Spotify',    url: socialSource.spotify || socialSource.spotify_url || null },
    { key: 'website',    label: 'Website',    url: socialSource.website || null },
    { key: 'bandcamp',   label: 'Bandcamp',   url: profile.bandcamp_url || socialSource.bandcamp_url || null },
    { key: 'apple_music',label: 'Apple Music',url: profile.apple_music_url || null },
    { key: 'beatport',   label: 'Beatport',   url: profile.beatport_url || null },
    { key: 'mixcloud',   label: 'Mixcloud',   url: normalizeSocial(profile.mixcloud_url || socialSource.mixcloud_url, 'https://mixcloud.com') },
  ].filter(s => s.url);

  const coverSrc = profile.cover_url && !profile.cover_url.includes('picsum') && !profile.cover_url.includes('pravatar') ? profile.cover_url : null;
  const avatarSrc = (profile.profile_type === 'professional' ? (profile.avatar_url || professional?.image_url) : profile.avatar_url) &&
    !((profile.profile_type === 'professional' ? (profile.avatar_url || professional?.image_url) : profile.avatar_url) ?? '').includes('pravatar') &&
    !((profile.profile_type === 'professional' ? (profile.avatar_url || professional?.image_url) : profile.avatar_url) ?? '').includes('picsum')
      ? (profile.profile_type === 'professional' ? (profile.avatar_url || professional?.image_url) : profile.avatar_url)
      : null;

  return (
    <div style={{ backgroundColor: '#0F0F1A', minHeight: '100vh' }}>

      {/* BANNER */}
      <div className="relative w-full" style={{ height: '220px' }}>
        {coverSrc ? (
          <Image src={coverSrc} alt="Cover" fill className="object-cover" />
        ) : (
          <div className="w-full h-full" style={{
            background: 'linear-gradient(135deg, #0e0e1c 0%, #1a1a2e 50%, #0e0e1c 100%)'
          }} />
        )}
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(to bottom, transparent 40%, rgba(15,15,26,0.8) 100%)'
        }} />
      </div>

      {/* HERO */}
      <div className="max-w-4xl mx-auto px-4">
        <div className="relative" style={{ marginTop: '-48px' }}>
          <div className="flex items-end gap-5 mb-5">

            {/* Avatar */}
            <div className="relative flex-shrink-0" style={{
              width: '96px', height: '96px',
              borderRadius: '16px',
              border: '3px solid #E8A020',
              overflow: 'hidden',
              backgroundColor: '#1A1A2E',
            }}>
              <div className="absolute inset-0 w-full h-full flex items-center justify-center text-3xl font-bold" style={{ color: '#E8A020' }}>
                {profile.display_name[0].toUpperCase()}
              </div>
              {avatarSrc && (
                <img
                  src={avatarSrc}
                  alt={profile.display_name}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              )}
            </div>

            {/* Name + tags */}
            <div className="pb-2">
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <h1 className="text-2xl font-bold text-white">{profile.display_name}</h1>
                {profile.is_verified && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{
                    backgroundColor: 'rgba(232,160,32,0.15)',
                    color: '#E8A020',
                    border: '1px solid rgba(232,160,32,0.3)'
                  }}>✓ Verified</span>
                )}
                {profile.is_featured && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{
                    backgroundColor: '#E8A020',
                    color: '#0F0F1A',
                  }}>★ Featured</span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>@{profile.username}</span>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{
                  backgroundColor: 'rgba(255,255,255,0.07)',
                  color: 'rgba(255,255,255,0.45)'
                }}>{profileTypeLabel[profile.profile_type]}</span>
                {profile.network_category && (
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{
                    backgroundColor: 'rgba(232,160,32,0.08)',
                    color: '#E8A020',
                    border: '0.5px solid rgba(232,160,32,0.2)',
                  }}>
                    {profile.network_subcategory
                      ? `${profile.network_category} · ${profile.network_subcategory}`
                      : profile.network_category}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Bio */}
          {profile.bio && (
            <p className="text-sm leading-relaxed mb-4" style={{
              color: 'rgba(255,255,255,0.6)',
              maxWidth: '600px'
            }}>{profile.bio}</p>
          )}

          {/* Socials + Contact */}
          {(socialLinks.length > 0 || profile.booking_email || professional?.phone) && (
            <div className="flex flex-wrap gap-2 mb-8">
              {socialLinks.map(social => (
                <a
                  key={social.key}
                  href={social.url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs px-3 py-1.5 rounded-full transition-opacity hover:opacity-80"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.06)',
                    border: '0.5px solid rgba(255,255,255,0.12)',
                    color: 'rgba(255,255,255,0.55)'
                  }}
                >
                  {social.label}
                </a>
              ))}
              <ContactPill
                email={profile.booking_email || professional?.email}
                phone={professional?.phone}
              />
            </div>
          )}

          {/* Quick Info Strip */}
          <div className="flex flex-wrap gap-3 mb-8">
            {profile.is_available !== null && (
              <span className="text-xs px-3 py-1.5 rounded-full font-medium" style={{
                backgroundColor: profile.is_available ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.05)',
                color: profile.is_available ? '#4ade80' : 'rgba(255,255,255,0.4)',
                border: `0.5px solid ${profile.is_available ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.1)'}`,
              }}>
                {profile.is_available ? '● Available for booking' : '○ Not available'}
              </span>
            )}
            {profile.location && (
              <span className="text-xs px-3 py-1.5 rounded-full" style={{
                backgroundColor: 'rgba(255,255,255,0.05)',
                color: 'rgba(255,255,255,0.45)',
                border: '0.5px solid rgba(255,255,255,0.1)',
              }}>
                📍 {profile.location.charAt(0).toUpperCase() + profile.location.slice(1)}
              </span>
            )}
            {profile.price_range && (
              <span className="text-xs px-3 py-1.5 rounded-full" style={{
                backgroundColor: 'rgba(232,160,32,0.06)',
                color: '#E8A020',
                border: '0.5px solid rgba(232,160,32,0.18)',
              }}>
                {profile.price_range}
              </span>
            )}
            {profile.genres && profile.genres.length > 0 && profile.genres.map((genre: string) => (
              <span key={genre} className="text-xs px-3 py-1.5 rounded-full" style={{
                backgroundColor: 'rgba(232,160,32,0.08)',
                color: '#E8A020',
                border: '0.5px solid rgba(232,160,32,0.2)',
              }}>
                {genre}
              </span>
            ))}
          </div>
        </div>

        {/* Announcements */}
        {profile.announcements && (
          <div className="mb-8 px-5 py-4 rounded-xl" style={{
            backgroundColor: 'rgba(232,160,32,0.06)',
            border: '0.5px solid rgba(232,160,32,0.2)',
            borderLeft: '3px solid #E8A020',
          }}>
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#E8A020' }}>Announcement</p>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.75)' }}>{profile.announcements}</p>
          </div>
        )}

        {/* ═══ ARTIST SECTIONS ═══ */}
        {profile.profile_type === 'artist' && (
          <div className="space-y-12 pb-16">

            {/* Upcoming Events */}
            {visibility.upcoming_events !== false && upcomingEvents.length > 0 && (
              <section>
                <h2 className="text-sm font-bold uppercase tracking-widest mb-5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Upcoming Events
                </h2>
                <div className="space-y-3">
                  {upcomingEvents.map((event: any) => (
                    <Link key={event.id} href={`/events/${event.id}`}
                      className="flex items-center gap-4 p-4 rounded-2xl transition-opacity hover:opacity-80"
                      style={{ backgroundColor: '#111120', border: '0.5px solid rgba(255,255,255,0.07)' }}>
                      <div className="relative flex-shrink-0 rounded-xl overflow-hidden" style={{ width: '56px', height: '56px' }}>
                        <Image src={event.image_url || FALLBACK_IMAGE} alt={event.title} fill className="object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white text-sm truncate">{event.title}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                          {new Date(event.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })} · {event.venue} · {event.city}
                        </p>
                      </div>
                      <span className="text-xs px-2 py-1 rounded-full flex-shrink-0" style={{
                        backgroundColor: 'rgba(232,160,32,0.1)',
                        color: '#E8A020',
                        border: '0.5px solid rgba(232,160,32,0.2)'
                      }}>Συμμετέχει</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Featured Track */}
            {visibility.featured_track !== false && profile.featured_track_url && (
              <section>
                <h2 className="text-sm font-bold uppercase tracking-widest mb-5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Featured Track
                </h2>
                <div className="rounded-2xl overflow-hidden" style={{ border: '0.5px solid rgba(255,255,255,0.07)' }}>
                  <iframe
                    width="100%"
                    height="166"
                    scrolling="no"
                    frameBorder="no"
                    src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(profile.featured_track_url)}&color=%23E8A020&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false`}
                  />
                </div>
              </section>
            )}

            {/* Releases */}
            {visibility.releases !== false && releases.length > 0 && (
              <section>
                <h2 className="text-sm font-bold uppercase tracking-widest mb-5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Releases
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {releases.map((release: any) => (
                    <Link key={release.id} href={`/nightwaves/release/${release.id}`}
                      className="block rounded-xl overflow-hidden transition-opacity hover:opacity-80"
                      style={{ backgroundColor: '#111120', border: '0.5px solid rgba(255,255,255,0.07)' }}>
                      <div className="relative aspect-square overflow-hidden">
                        <Image src={release.cover_image || FALLBACK_IMAGE} alt={release.title} fill className="object-cover" />
                        <span className="absolute top-2 right-2 text-xs font-bold px-2 py-0.5 rounded-full" style={{
                          backgroundColor: '#E8A020', color: '#0F0F1A'
                        }}>{release.type}</span>
                      </div>
                      <div className="p-3">
                        <p className="font-medium text-sm text-white truncate">{release.title}</p>
                        <p className="text-xs mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>
                          {release.release_date ? new Date(release.release_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
                        </p>
                        <div className="flex gap-2 mt-2">
                          {release.soundcloud_url && (
                            <a href={release.soundcloud_url} target="_blank" rel="noopener noreferrer"
                              className="text-xs px-2 py-0.5 rounded-full" style={{
                                backgroundColor: 'rgba(255,85,0,0.15)', color: '#ff5500'
                              }}>SC</a>
                          )}
                          {release.spotify_url && (
                            <a href={release.spotify_url} target="_blank" rel="noopener noreferrer"
                              className="text-xs px-2 py-0.5 rounded-full" style={{
                                backgroundColor: 'rgba(30,215,96,0.15)', color: '#1ED760'
                              }}>SP</a>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Booking */}
            {profile.booking_info && (
              <section>
                <h2 className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Booking
                </h2>
                <div className="p-5 rounded-2xl" style={{ backgroundColor: '#111120', border: '0.5px solid rgba(255,255,255,0.07)' }}>
                  <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>{profile.booking_info}</p>
                </div>
              </section>
            )}

          </div>
        )}

        {/* ═══ ORGANIZER / VENUE SECTIONS ═══ */}
        {(profile.profile_type === 'organizer' || profile.profile_type === 'venue') && (
          <div className="space-y-12 pb-16">

            {/* Upcoming Events */}
            {visibility.upcoming_events !== false && upcomingEvents.length > 0 && (
              <section>
                <h2 className="text-sm font-bold uppercase tracking-widest mb-5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Upcoming Events
                </h2>
                <div className="space-y-3">
                  {upcomingEvents.map((event: any) => (
                    <Link key={event.id} href={`/events/${event.id}`}
                      className="flex items-center gap-4 p-4 rounded-2xl transition-opacity hover:opacity-80"
                      style={{ backgroundColor: '#111120', border: '0.5px solid rgba(255,255,255,0.07)' }}>
                      <div className="relative flex-shrink-0 rounded-xl overflow-hidden" style={{ width: '64px', height: '64px' }}>
                        <Image src={event.image_url || FALLBACK_IMAGE} alt={event.title} fill className="object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white truncate">{event.title}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                          {new Date(event.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}{event.time ? ` · ${event.time}` : ""} · {event.venue}
                        </p>
                        <span className="text-xs mt-1 inline-block" style={{ color: '#E8A020' }}>{event.city}</span>
                      </div>
                      {event.ticket_url && (
                        <a href={event.ticket_url} target="_blank" rel="noopener noreferrer"
                          className="text-xs px-3 py-1.5 rounded-full flex-shrink-0 font-medium"
                          style={{ backgroundColor: '#E8A020', color: '#0F0F1A' }}>
                          Tickets
                        </a>
                      )}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Music Embed */}
            {visibility.music_embed !== false && profile.featured_track_url && (
              <section>
                <h2 className="text-sm font-bold uppercase tracking-widest mb-5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Music
                </h2>
                <div className="rounded-2xl overflow-hidden" style={{ border: '0.5px solid rgba(255,255,255,0.07)' }}>
                  <iframe
                    width="100%"
                    height="166"
                    scrolling="no"
                    frameBorder="no"
                    src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(profile.featured_track_url)}&color=%23E8A020&auto_play=false&hide_related=true&show_comments=false`}
                  />
                </div>
              </section>
            )}

            {/* Booking */}
            {profile.booking_info && (
              <section>
                <h2 className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Booking
                </h2>
                <div className="p-5 rounded-2xl" style={{ backgroundColor: '#111120', border: '0.5px solid rgba(255,255,255,0.07)' }}>
                  <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>{profile.booking_info}</p>
                </div>
              </section>
            )}

          </div>
        )}

        {/* ═══ PROFESSIONAL SECTIONS ═══ */}
        {profile.profile_type === 'professional' && professional && (
          <div className="space-y-10 pb-16">

            {/* About */}
            <section>
              <h2 className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>
                About
              </h2>
              <div className="p-6 rounded-2xl" style={{ backgroundColor: '#111120', border: '0.5px solid rgba(255,255,255,0.07)' }}>

                {/* Description */}
                {professional.description && (
                  <p className="text-sm leading-relaxed mb-4" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    {professional.description}
                  </p>
                )}

                {/* Tags */}
                {professional.tags && professional.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {(professional.tags as string[]).map((tag: string) => (
                      <span key={tag} className="text-xs px-3 py-1.5 rounded-full" style={{
                        backgroundColor: 'rgba(232,160,32,0.08)',
                        border: '0.5px solid rgba(232,160,32,0.2)',
                        color: '#E8A020',
                      }}>{tag}</span>
                    ))}
                  </div>
                )}
                {/* Services */}
                {profile.services && profile.services.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {(profile.services as string[]).map((service: string) => (
                      <span key={service} className="text-xs px-3 py-1.5 rounded-full" style={{
                        backgroundColor: 'transparent',
                        border: '0.5px solid rgba(232,160,32,0.35)',
                        color: '#E8A020',
                      }}>{service}</span>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Gallery */}
            {professional.gallery && professional.gallery.length > 0 && (
              <section>
                <h2 className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Gallery
                </h2>
                <div className="grid grid-cols-3 gap-2">
                  {(professional.gallery as string[]).map((url: string, i: number) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden">
                      <Image src={url} alt={`Gallery ${i + 1}`} fill className="object-cover hover:scale-105 transition-transform duration-300" />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Featured Track */}
            {visibility.featured_track !== false && profile.featured_track_url && (
              <section>
                <h2 className="text-sm font-bold uppercase tracking-widest mb-5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Featured Track
                </h2>
                <div className="rounded-2xl overflow-hidden" style={{ border: '0.5px solid rgba(255,255,255,0.07)' }}>
                  <iframe
                    width="100%"
                    height="166"
                    scrolling="no"
                    frameBorder="no"
                    src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(profile.featured_track_url)}&color=%23E8A020&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false`}
                  />
                </div>
              </section>
            )}

            {/* Booking info */}
            {profile.booking_info && (
              <section>
                <h2 className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Booking
                </h2>
                <div className="p-5 rounded-2xl" style={{ backgroundColor: '#111120', border: '0.5px solid rgba(255,255,255,0.07)' }}>
                  <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>{profile.booking_info}</p>
                </div>
              </section>
            )}

            {/* Booking CTA */}
            {visibility.booking_cta !== false && professional.email && (
              <section>
                <div className="p-6 rounded-2xl" style={{
                  backgroundColor: 'rgba(232,160,32,0.05)',
                  border: '0.5px solid rgba(232,160,32,0.2)',
                }}>
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <h3 className="font-bold text-white">Available for bookings</h3>
                      <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        Contact for rates & availability
                      </p>
                    </div>
                    <a
                      href={`mailto:${professional.email}`}
                      className="px-6 py-3 rounded-xl font-bold text-sm flex-shrink-0 transition-opacity hover:opacity-90"
                      style={{ backgroundColor: '#E8A020', color: '#0F0F1A' }}
                    >
                      Book Now
                    </a>
                  </div>
                </div>
              </section>
            )}

          </div>
        )}

      </div>
    </div>
  )
}
