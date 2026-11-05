import { createClient } from '@/app/lib/supabase-server'
import { notFound, redirect } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Metadata } from 'next'
import ContactPill from '@/app/components/ContactPill'
import T from '@/app/components/T'
import FeaturedTrackEmbed from '@/app/components/FeaturedTrackEmbed'
import NetworkCategoryText from '@/app/components/NetworkCategoryText'
import { getEventCoverImage, getEventCrop } from '@/app/lib/getEventCoverImage'
import { getAvatarCrop, getCoverCrop } from '@/app/lib/profileCrop'
import CroppedImage from '@/components/ui/CroppedImage'
import FollowButton from '@/components/ui/FollowButton'
import { decodeUsername, profileHref } from '@/app/lib/profileHref'
import MixCard from '@/app/nightwaves/mixes/MixCard'
import HostedEventCard from '@/components/profile/HostedEventCard'
import ProfileListings from '@/components/profile/ProfileListings'
import ProfileGallery, { type ProfileGalleryPhoto } from '@/components/ui/ProfileGallery'
import { genreLabel } from "@/app/lib/genres";

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80"

interface Props {
  params: Promise<{ username: string }>
}

// A spot account has no profile page of its own: its single public page is
// /spots/<slug>. Oldest published spot wins if an owner ever has several.
// No published row (not created yet, or awaiting approval) means 404.
async function publishedSpotSlug(supabase: Awaited<ReturnType<typeof createClient>>, ownerId: string): Promise<string | null> {
  const { data } = await supabase
    .from('spots')
    .select('slug')
    .eq('owner_id', ownerId)
    .eq('is_published', true)
    .order('created_at', { ascending: true })
    .limit(1)
  return data?.[0]?.slug ?? null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const username = decodeUsername((await params).username)
  const supabase = await createClient()
  const { data } = await supabase.from('profiles').select('id, profile_type, display_name, bio, avatar_url').eq('username', username).neq('profile_type', 'user').single()
  if (!data) return { title: 'Profile | Nightup.gr' }
  // redirect()/notFound() are allowed here; same outcome as the page, so no
  // profile metadata is ever emitted for a spot account.
  if (data.profile_type === 'spot') {
    const slug = await publishedSpotSlug(supabase, data.id)
    if (!slug) notFound()
    redirect('/spots/' + slug)
  }
  return {
    title: data.display_name,
    description: data.bio ? data.bio.slice(0, 155) : `${data.display_name} on Nightup.gr`,
    alternates: { canonical: profileHref(username) },
    openGraph: {
      title: data.display_name,
      description: data.bio?.slice(0, 155),
      images: data.avatar_url && !data.avatar_url.includes('pravatar') && !data.avatar_url.includes('picsum') ? [data.avatar_url] : [],
    },
  }
}

export default async function ProfilePage({ params }: Props) {
  const username = decodeUsername((await params).username)
  const supabase = await createClient()

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single()

  if (error || !profile) notFound()
  if (profile.profile_type === 'user') notFound()

  if (profile.profile_type === 'spot') {
    const slug = await publishedSpotSlug(supabase, profile.id)
    if (!slug) notFound()
    redirect('/spots/' + slug)
  }

  // After the spot redirect above, so a visit that ends up on /spots/<slug>
  // is counted there (increment_spot_views) and not here as well.
  supabase.rpc('increment_profile_views', { target_profile_id: profile.id }).then(() => {}, () => {})

  const visibility = profile.section_visibility ?? {}

  // Fetch content based on profile type
  let upcomingEvents: any[] = []
  let pastEvents: any[] = []
  const today = new Date().toISOString().split('T')[0]
  let releases: any[] = []
  let galleryPhotos: ProfileGalleryPhoto[] = []

  if (profile.profile_type === 'artist' || profile.profile_type === 'organizer' || profile.profile_type === 'venue' || profile.profile_type === 'professional' || profile.profile_type === 'spot') {
    const LEGACY_COLS = 'id, image_url, crop_x, crop_y, crop_width, crop_height'
    const { data, error } = await supabase
      .from('creator_gallery')
      .select(`${LEGACY_COLS}, media_type, poster_url`)
      .eq('profile_id', profile.id)
      .order('display_order', { ascending: true })

    if (error) {
      // media_type / poster_url are added by 20260814000000_gallery_media_type.sql,
      // which is run by hand. Until it is, fall back rather than blanking the gallery.
      const { data: legacy } = await supabase
        .from('creator_gallery')
        .select(LEGACY_COLS)
        .eq('profile_id', profile.id)
        .order('display_order', { ascending: true })
      galleryPhotos = (legacy ?? []) as ProfileGalleryPhoto[]
    } else {
      galleryPhotos = (data ?? []) as ProfileGalleryPhoto[]
    }
  }

  // Artist: find events where display_name appears in lineup
  if (profile.profile_type === 'artist') {
    const ARTIST_COLS = 'id, title, image_url, has_copyright_restriction, crop_x, crop_y, crop_width, crop_height, genre, date, time, venue, city, lineup'
    const inLineup = (event: any) =>
      (event.lineup ?? []).some((name: string) =>
        name.toLowerCase().trim() === profile.display_name.toLowerCase().trim()
      )
    const [{ data: allEvents }, { data: allPast }] = await Promise.all([
      supabase.from('events').select(ARTIST_COLS)
        .eq('status', 'approved').gte('date', today).order('date', { ascending: true }),
      supabase.from('events').select(ARTIST_COLS)
        .eq('status', 'approved').lt('date', today).order('date', { ascending: false }),
    ])
    upcomingEvents = (allEvents ?? []).filter(inLineup)
    pastEvents = (allPast ?? []).filter(inLineup)

    // Events the artist uploaded themselves, merged with the lineup matches
    // above. An event can be both, so de-duplicate by id.
    const { data: hosted } = await supabase
      .from('events')
      .select('id, title, image_url, has_copyright_restriction, crop_x, crop_y, crop_width, crop_height, genre, date, time, venue, city, lineup, ticket_url')
      .eq('profile_id', profile.id)
      .eq('status', 'approved')
      .gte('date', new Date().toISOString().split('T')[0])
    const seen = new Set(upcomingEvents.map((e: any) => e.id))
    upcomingEvents = [...upcomingEvents, ...(hosted ?? []).filter((e: any) => !seen.has(e.id))]
      .sort((a: any, b: any) => String(a.date).localeCompare(String(b.date)))

    // Same merge for past events: lineup matches plus the artist's own uploads.
    const { data: hostedPast } = await supabase
      .from('events')
      .select(ARTIST_COLS + ', ticket_url')
      .eq('profile_id', profile.id)
      .eq('status', 'approved')
      .lt('date', today)
    const seenPast = new Set(pastEvents.map((e: any) => e.id))
    pastEvents = [...pastEvents, ...(hostedPast ?? []).filter((e: any) => !seenPast.has(e.id))]
      .sort((a: any, b: any) => String(b.date).localeCompare(String(a.date)))

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

  // Organizer/Venue/Spot/Professional: find events by profile_id. Professionals
  // are in this list because they can submit events too, so their own events
  // had nowhere to show on their profile.
  if (profile.profile_type === 'organizer' || profile.profile_type === 'venue' || profile.profile_type === 'spot' || profile.profile_type === 'professional') {
    const EVENT_COLS = 'id, title, image_url, has_copyright_restriction, crop_x, crop_y, crop_width, crop_height, genre, date, time, venue, city, ticket_url'
    const [{ data }, { data: past }] = await Promise.all([
      supabase.from('events').select(EVENT_COLS).eq('profile_id', profile.id)
        .eq('status', 'approved').gte('date', today).order('date', { ascending: true }),
      supabase.from('events').select(EVENT_COLS).eq('profile_id', profile.id)
        .eq('status', 'approved').lt('date', today).order('date', { ascending: false }),
    ])
    upcomingEvents = data ?? []
    pastEvents = past ?? []
  }

  // Fetch active listings for this profile
  const { data: profileListings } = await supabase
    .from('listings')
    .select('id, type, role, title, description, city, date_needed, is_sponsored, created_at')
    .eq('profile_id', profile.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  // Mixes linked to this profile through mixes.profile_id (any profile type).
  // Shares the dashboard's existing `mixes` visibility key; absent means visible.
  let profileMixes: any[] = []
  if (visibility.mixes !== false) {
    const { data } = await supabase
      .from('mixes')
      .select('id, title, artist, genre, cover_image, soundcloud_url, duration')
      .eq('profile_id', profile.id)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
    profileMixes = data ?? []
  }

  const profileTypeLabel: Record<string, string> = {
    organizer: 'Organizer',
    artist: 'Artist / DJ',
    venue: 'Venue',
    professional: 'Professional',
    spot: 'Spot',
  }

  function normalizeSocial(handle: string | null | undefined, baseUrl: string): string | null {
    if (!handle) return null;
    if (handle.startsWith('http://') || handle.startsWith('https://')) return handle;
    const cleanHandle = handle.replace(/^@/, '');
    if (baseUrl.includes('tiktok.com')) return `${baseUrl}/@${cleanHandle}`;
    return `${baseUrl}/${cleanHandle}`;
  }

  const socialLinks = [
    { key: 'instagram',  label: 'Instagram',  url: normalizeSocial(profile.instagram, 'https://instagram.com') },
    { key: 'facebook',   label: 'Facebook',   url: normalizeSocial(profile.facebook, 'https://facebook.com') },
    { key: 'tiktok',     label: 'TikTok',     url: normalizeSocial(profile.tiktok, 'https://tiktok.com') },
    { key: 'youtube',    label: 'YouTube',    url: normalizeSocial(profile.youtube_url, 'https://youtube.com/@') },
    { key: 'soundcloud', label: 'SoundCloud', url: normalizeSocial(profile.soundcloud_url, 'https://soundcloud.com') },
    { key: 'spotify',    label: 'Spotify',    url: profile.spotify_url || null },
    { key: 'website',    label: 'Website',    url: profile.website || null },
    { key: 'bandcamp',   label: 'Bandcamp',   url: profile.bandcamp_url || null },
    { key: 'apple_music',label: 'Apple Music',url: profile.apple_music_url || null },
    { key: 'beatport',   label: 'Beatport',   url: profile.beatport_url || null },
    { key: 'mixcloud',   label: 'Mixcloud',   url: normalizeSocial(profile.mixcloud_url, 'https://mixcloud.com') },
  ].filter(s => s.url);

  const coverSrc = profile.cover_url && !profile.cover_url.includes('picsum') && !profile.cover_url.includes('pravatar') ? profile.cover_url : null;
  const avatarSrc = profile.avatar_url &&
    !profile.avatar_url.includes('pravatar') &&
    !profile.avatar_url.includes('picsum')
      ? profile.avatar_url
      : null;
  const avatarCrop = avatarSrc ? getAvatarCrop(profile) : null;
  const coverCrop = coverSrc ? getCoverCrop(profile) : null;

  const artistEventCard = (event: any) => (
    <Link key={event.id} href={`/events/${event.id}`}
      className="flex items-center gap-4 p-4 rounded-2xl transition-opacity hover:opacity-80"
      style={{ backgroundColor: '#111120', border: '0.5px solid rgba(255,255,255,0.07)' }}>
      <div className="relative flex-shrink-0 rounded-xl overflow-hidden" style={{ width: '56px', height: '56px' }}>
        <CroppedImage src={getEventCoverImage(event)} alt={event.title} crop={getEventCrop(event)} />
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
      }}><T k="profile_participates" /></span>
    </Link>
  )

  const hostedEventCard = (event: any) => <HostedEventCard key={event.id} event={event} />

  const pastEventsSection = (card: (e: any) => React.ReactNode) =>
    visibility.upcoming_events !== false && pastEvents.length > 0 && (
      <section>
        <h2 className="text-sm font-bold uppercase tracking-widest mb-5" style={{ color: 'rgba(255,255,255,0.3)' }}>
          <T k="profile_past_events" />
        </h2>
        <div className="space-y-3">
          {pastEvents.map(card)}
        </div>
      </section>
    )

  return (
    <div style={{ backgroundColor: '#0F0F1A', minHeight: '100vh' }}>

      {/* BANNER */}
      <div className="relative w-full" style={{ height: '220px' }}>
        {coverSrc ? (
          <CroppedImage src={coverSrc} alt="Cover" crop={coverCrop} sizes="100vw" />
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
                <CroppedImage src={avatarSrc} alt={profile.display_name} crop={avatarCrop} sizes="96px" />
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
                <span className="text-sm" style={{ color: 'rgba(255,255,255,0.50)' }}>@{profile.username}</span>
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
                      ? <><NetworkCategoryText value={profile.network_category} /> · <NetworkCategoryText value={profile.network_subcategory} /></>
                      : <NetworkCategoryText value={profile.network_category} />}
                  </span>
                )}
              </div>
              <div className="mt-2">
                <FollowButton profileId={profile.id} showCount />
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
          {(socialLinks.length > 0 || profile.booking_email || profile.phone) && (
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
                email={profile.booking_email}
                phone={profile.phone}
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
                maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {profile.price_range}
              </span>
            )}
            {/* Venue-only: the wizard collects capacity and a street address,
                and this strip is the only place either belongs. */}
            {profile.venue_capacity && (
              <span className="text-xs px-3 py-1.5 rounded-full" style={{
                backgroundColor: 'rgba(255,255,255,0.05)',
                color: 'rgba(255,255,255,0.45)',
                border: '0.5px solid rgba(255,255,255,0.1)',
              }}>
                👥 {profile.venue_capacity} <T k="profile_capacity_people" />
              </span>
            )}
            {profile.venue_address && (
              <span className="text-xs px-3 py-1.5 rounded-full" style={{
                backgroundColor: 'rgba(255,255,255,0.05)',
                color: 'rgba(255,255,255,0.45)',
                border: '0.5px solid rgba(255,255,255,0.1)',
              }}>
                🏠 {[profile.venue_address, profile.venue_neighborhood].filter(Boolean).join(', ')}
              </span>
            )}
            {profile.genres && profile.genres.length > 0 && profile.genres.map((genre: string) => (
              <span key={genre} className="text-xs px-3 py-1.5 rounded-full" style={{
                backgroundColor: 'rgba(232,160,32,0.08)',
                color: '#E8A020',
                border: '0.5px solid rgba(232,160,32,0.2)',
              }}>
                {genreLabel(genre)}
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
                  {upcomingEvents.map(artistEventCard)}
                </div>
              </section>
            )}

            {pastEventsSection(artistEventCard)}

            {/* Featured Track */}
            {visibility.featured_track !== false && profile.featured_track_url && (
              <section>
                <h2 className="text-sm font-bold uppercase tracking-widest mb-5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Featured Track
                </h2>
                <div className="rounded-2xl overflow-hidden" style={{ border: '0.5px solid rgba(255,255,255,0.07)' }}>
                  <FeaturedTrackEmbed url={profile.featured_track_url} />
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

            {/* Gallery */}
            {visibility.gallery !== false && galleryPhotos.length > 0 && (
              <section>
                <h2 className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Gallery
                </h2>
                <ProfileGallery photos={galleryPhotos} />
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
        {(profile.profile_type === 'organizer' || profile.profile_type === 'venue' || profile.profile_type === 'spot') && (
          <div className="space-y-12 pb-16">

            {/* Upcoming Events */}
            {visibility.upcoming_events !== false && upcomingEvents.length > 0 && (
              <section>
                <h2 className="text-sm font-bold uppercase tracking-widest mb-5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Upcoming Events
                </h2>
                <div className="space-y-3">
                  {upcomingEvents.map(hostedEventCard)}
                </div>
              </section>
            )}

            {pastEventsSection(hostedEventCard)}

            {/* Music Embed */}
            {visibility.music_embed !== false && profile.featured_track_url && (
              <section>
                <h2 className="text-sm font-bold uppercase tracking-widest mb-5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Music
                </h2>
                <div className="rounded-2xl overflow-hidden" style={{ border: '0.5px solid rgba(255,255,255,0.07)' }}>
                  <FeaturedTrackEmbed url={profile.featured_track_url} showUser={false} />
                </div>
              </section>
            )}

            {/* Gallery */}
            {visibility.gallery !== false && galleryPhotos.length > 0 && (
              <section>
                <h2 className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Gallery
                </h2>
                <ProfileGallery photos={galleryPhotos} />
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
        {profile.profile_type === 'professional' && (
          <div className="space-y-10 pb-16">

            {/* Upcoming Events — same markup as the organizer / venue / spot
                block, for professionals who host their own events. */}
            {visibility.upcoming_events !== false && upcomingEvents.length > 0 && (
              <section>
                <h2 className="text-sm font-bold uppercase tracking-widest mb-5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Upcoming Events
                </h2>
                <div className="space-y-3">
                  {upcomingEvents.map(hostedEventCard)}
                </div>
              </section>
            )}

            {pastEventsSection(hostedEventCard)}

            {/* About — bio already renders in the header above, so this section
                carries the taxonomy (tags + services) only. */}
            {((profile.tags?.length ?? 0) > 0 || (profile.services?.length ?? 0) > 0) && (
            <section>
              <h2 className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>
                About
              </h2>
              <div className="p-6 rounded-2xl" style={{ backgroundColor: '#111120', border: '0.5px solid rgba(255,255,255,0.07)' }}>

                {/* Tags */}
                {profile.tags && profile.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {(profile.tags as string[]).map((tag: string) => (
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
            )}

            {/* Gallery */}
            {visibility.gallery !== false && galleryPhotos.length > 0 && (
              <section>
                <h2 className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Gallery
                </h2>
                <ProfileGallery photos={galleryPhotos} />
              </section>
            )}

            {/* Featured Track */}
            {visibility.featured_track !== false && profile.featured_track_url && (
              <section>
                <h2 className="text-sm font-bold uppercase tracking-widest mb-5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Featured Track
                </h2>
                <div className="rounded-2xl overflow-hidden" style={{ border: '0.5px solid rgba(255,255,255,0.07)' }}>
                  <FeaturedTrackEmbed url={profile.featured_track_url} />
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
            {visibility.booking_cta !== false && profile.booking_email && (
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
                      href={`mailto:${profile.booking_email}`}
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

        {/* Sets (mixes linked to this profile) */}
        {profileMixes.length > 0 && (
          <section className="pb-16" style={{ marginTop: '-16px' }}>
            <h2 className="text-sm font-bold uppercase tracking-widest mb-5" style={{ color: 'rgba(255,255,255,0.3)' }}>
              <T k="profile_sets" />
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {profileMixes.map((mix: any) => <MixCard key={mix.id} mix={mix} />)}
            </div>
          </section>
        )}

        <ProfileListings listings={profileListings ?? []} />

      </div>
    </div>
  )
}
