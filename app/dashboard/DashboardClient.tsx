'use client'
import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import ImageUpload from '../../components/ui/ImageUpload'
import CreatorGallery from '../../components/ui/CreatorGallery'
import ImageCropper, { type CropBox } from '../../components/ui/ImageCropper'
import CroppedImage from '../../components/ui/CroppedImage'
import { getAvatarCrop, getCoverCrop } from '../lib/profileCrop'
import ChangePasswordForm from '@/components/auth/ChangePasswordForm'
import UpgradeModal from '@/components/auth/UpgradeModal'
import { NETWORK, CITIES, networkCategoryLabel } from '../lib/searchData'
import ConsumerDashboard from './ConsumerDashboard'
import { useLanguage } from '@/app/components/LanguageContext'
import type { TranslationKey } from '../lib/translations'

const AVATAR_CROP_ASPECT = 1
const COVER_CROP_ASPECT = 3

const GENRES = ['Techno', 'House', 'Deep House', 'Minimal', 'Drum & Bass', 'Trance', 'Hip-Hop', 'R&B', 'Afrobeats', 'Reggaeton', 'Laika', 'Entechno', 'Rebetiko', 'Dimotika', 'Rock', 'Jazz', 'Classical', 'Blues', 'Electronic', 'Ambient', 'Experimental', 'Other']


const SOCIAL_FIELDS = [
  { key: 'instagram', label: 'Instagram', placeholder: '@handle' },
  { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/...' },
  { key: 'tiktok', label: 'TikTok', placeholder: '@handle' },
  { key: 'soundcloud_url', label: 'SoundCloud', placeholder: 'https://soundcloud.com/...' },
  { key: 'spotify_url', label: 'Spotify', placeholder: 'https://open.spotify.com/...' },
  { key: 'bandcamp_url', label: 'Bandcamp', placeholder: 'https://artist.bandcamp.com' },
  { key: 'apple_music_url', label: 'Apple Music', placeholder: 'https://music.apple.com/...' },
  { key: 'youtube_url', label: 'YouTube', placeholder: 'https://youtube.com/...' },
  { key: 'beatport_url', label: 'Beatport', placeholder: 'https://www.beatport.com/...' },
  { key: 'mixcloud_url', label: 'Mixcloud', placeholder: 'https://www.mixcloud.com/...' },
  { key: 'website', label: 'Website', placeholder: 'https://...' },
  { key: 'booking_email', label: 'Booking Email', placeholder: 'booking@...' },
]

const VISIBILITY_SECTIONS: Record<string, string[]> = {
  user: [],
  artist: ['upcoming_events', 'featured_track', 'releases', 'mixes', 'gallery'],
  organizer: ['upcoming_events', 'announcements', 'gallery', 'music_embed', 'booking_info'],
  venue: ['upcoming_events', 'announcements', 'gallery', 'music_embed', 'booking_info'],
  // 'gallery' is in this list because the wizard's step 3 uploads to
  // creator_gallery and the public profile gates that section on
  // section_visibility.gallery. New profiles now default it to visible (see
  // 20260808020000_default_gallery_visible.sql), but older rows carry false and
  // without a toggle here their owners could not turn the section back on.
  professional: ['upcoming_events', 'gallery', 'portfolio', 'testimonials', 'price_range', 'booking_availability'],
}

const SECTION_LABEL_KEYS: Record<string, TranslationKey> = {
  upcoming_events: 'dashboard_section_upcoming_events',
  featured_track: 'dashboard_section_featured_track',
  releases: 'dashboard_releases_label',
  mixes: 'dashboard_section_mixes',
  gallery: 'dashboard_gallery',
  announcements: 'dashboard_announcements',
  music_embed: 'dashboard_section_music_embed',
  booking_info: 'dashboard_booking_info',
  portfolio: 'dashboard_section_portfolio',
  testimonials: 'dashboard_section_testimonials',
  price_range: 'dashboard_section_price_range',
  booking_availability: 'dashboard_section_booking_availability',
}

type Tab = 'profile' | 'content' | 'listings' | 'visibility' | 'settings'

export default function DashboardClient({ profile, events, releases, savedEvents, savedSpots, upcomingEvents, followedProfiles, listings, receivedInterests, sentInterests, savedEventsCount, featuredRequests, artistBookings, professionalContributions, ownedSpot }: {
  profile: any
  events: any[]
  releases: any[]
  savedEvents?: any[]
  savedSpots?: any[]
  upcomingEvents?: any[]
  followedProfiles?: any[]
  listings?: any[]
  receivedInterests?: any[]
  sentInterests?: any[]
  savedEventsCount?: number
  featuredRequests?: any[]
  artistBookings?: any[]
  professionalContributions?: any[]
  ownedSpot?: any | null
}) {
  const router = useRouter()
  const { t, lang } = useLanguage()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const isPro = profile.profile_type === 'professional'
  const isVenue = profile.profile_type === 'venue'

  const [activeTab, setActiveTab] = useState<Tab>('profile')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [showAvatarCropper, setShowAvatarCropper] = useState(false)
  const [showCoverCropper, setShowCoverCropper] = useState(false)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [requestingFeaturedId, setRequestingFeaturedId] = useState<string | null>(null)

  async function handleRequestFeatured(eventId: string) {
    setRequestingFeaturedId(eventId)
    try {
      await fetch('/api/featured-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: eventId }),
      })
      router.refresh()
    } finally {
      setRequestingFeaturedId(null)
    }
  }

  // Listings state
  const [listingItems, setListingItems] = useState<any[]>(listings ?? [])
  const [showListingForm, setShowListingForm] = useState(false)
  const [editingListingId, setEditingListingId] = useState<string | null>(null)
  const [listingSubmitting, setListingSubmitting] = useState(false)
  const [listingForm, setListingForm] = useState<{
    type: 'seeking' | 'offering'
    role: string
    title: string
    description: string
    city: string
    date_needed: string
  }>({ type: 'seeking', role: '', title: '', description: '', city: '', date_needed: '' })
  const [listingRoleGroup, setListingRoleGroup] = useState('')
  const [listingRoleSubgroup, setListingRoleSubgroup] = useState('')

  // Shared profile form state (all user types)
  const [form, setForm] = useState({
    display_name: profile.display_name ?? '',
    bio: profile.bio ?? '',
    location: profile.location ?? '',
    avatar_url: profile.avatar_url ?? '',
    cover_url: profile.cover_url ?? '',
    avatar_crop_x: profile.avatar_crop_x ?? null as number | null,
    avatar_crop_y: profile.avatar_crop_y ?? null as number | null,
    avatar_crop_width: profile.avatar_crop_width ?? null as number | null,
    avatar_crop_height: profile.avatar_crop_height ?? null as number | null,
    cover_crop_x: profile.cover_crop_x ?? null as number | null,
    cover_crop_y: profile.cover_crop_y ?? null as number | null,
    cover_crop_width: profile.cover_crop_width ?? null as number | null,
    cover_crop_height: profile.cover_crop_height ?? null as number | null,
    instagram: profile.instagram ?? '',
    facebook: profile.facebook ?? '',
    tiktok: profile.tiktok ?? '',
    soundcloud_url: profile.soundcloud_url ?? '',
    spotify_url: profile.spotify_url ?? '',
    bandcamp_url: profile.bandcamp_url ?? '',
    apple_music_url: profile.apple_music_url ?? '',
    youtube_url: profile.youtube_url ?? '',
    beatport_url: profile.beatport_url ?? '',
    mixcloud_url: profile.mixcloud_url ?? '',
    website: profile.website ?? '',
    booking_email: profile.booking_email ?? '',
    featured_track_url: profile.featured_track_url ?? '',
    is_available: profile.is_available ?? true,
    price_range: profile.price_range ?? '',
    booking_info: profile.booking_info ?? '',
    announcements: profile.announcements ?? '',
    genres: profile.genres ?? [],
    services: profile.services ?? [],
    section_visibility: profile.section_visibility ?? {},
    network_tab: profile.network_tab ?? '',
    network_category: profile.network_category ?? '',
    network_subcategory: profile.network_subcategory ?? '',
  })

  // Professionals edit everything through the 4-step wizard at
  // /dashboard/professional, so the dashboard only reports what is still
  // missing rather than carrying a second copy of the same fields.
  const proChecklist = [
    { label: t('dashboard_pro_check_category'), done: !!profile.network_category },
    { label: t('dashboard_pro_check_bio'), done: !!(profile.bio ?? '').trim() },
    { label: t('dashboard_pro_check_city'), done: !!(profile.location ?? '').trim() },
    { label: t('dashboard_pro_check_contact'), done: !!(profile.booking_email || profile.phone) },
    { label: t('dashboard_pro_check_avatar'), done: !!profile.avatar_url },
  ]
  const proIncomplete = isPro && proChecklist.some(item => !item.done)

  // Venues edit through /dashboard/venue for the same reason.
  const venueChecklist = [
    { label: t('dashboard_venue_check_type'), done: !!profile.network_category },
    { label: t('dashboard_venue_check_bio'), done: !!(profile.bio ?? '').trim() },
    { label: t('dashboard_venue_check_address'), done: !!(profile.venue_address ?? '').trim() },
    { label: t('dashboard_venue_check_cover'), done: !!profile.cover_url },
    { label: t('dashboard_venue_check_contact'), done: !!(profile.booking_email || profile.phone) },
  ]
  const venueIncomplete = isVenue && venueChecklist.some(item => !item.done)

  /** The two account types whose profile tab is a wizard entry point rather
   *  than a form. Kept together so the shared non-wizard branch excludes both. */
  const usesWizard = isPro || isVenue

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function toggleGenre(genre: string) {
    setForm(prev => ({
      ...prev,
      genres: prev.genres.includes(genre)
        ? prev.genres.filter((g: string) => g !== genre)
        : [...prev.genres, genre]
    }))
  }

  function toggleVisibility(section: string) {
    setForm(prev => ({
      ...prev,
      section_visibility: {
        ...prev.section_visibility,
        [section]: !prev.section_visibility[section]
      }
    }))
  }

  // Non-pro profile save
  async function handleSave() {
    setSaving(true)
    setError('')
    setSaved(false)

    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: form.display_name,
        bio: form.bio,
        location: form.location,
        avatar_url: form.avatar_url || null,
        cover_url: form.cover_url || null,
        avatar_crop_x: form.avatar_crop_x,
        avatar_crop_y: form.avatar_crop_y,
        avatar_crop_width: form.avatar_crop_width,
        avatar_crop_height: form.avatar_crop_height,
        cover_crop_x: form.cover_crop_x,
        cover_crop_y: form.cover_crop_y,
        cover_crop_width: form.cover_crop_width,
        cover_crop_height: form.cover_crop_height,
        instagram: form.instagram || null,
        facebook: form.facebook || null,
        tiktok: form.tiktok || null,
        soundcloud_url: form.soundcloud_url || null,
        spotify_url: form.spotify_url || null,
        bandcamp_url: form.bandcamp_url || null,
        apple_music_url: form.apple_music_url || null,
        youtube_url: form.youtube_url || null,
        beatport_url: form.beatport_url || null,
        mixcloud_url: form.mixcloud_url || null,
        website: form.website || null,
        booking_email: form.booking_email || null,
        featured_track_url: form.featured_track_url || null,
        is_available: form.is_available,
        price_range: form.price_range || null,
        booking_info: form.booking_info || null,
        announcements: form.announcements || null,
        genres: form.genres,
        services: form.services,
        section_visibility: form.section_visibility,
        network_tab: form.network_tab || null,
        network_category: form.network_category || null,
        network_subcategory: form.network_subcategory || null,
      })
      .eq('id', profile.id)

    setSaving(false)
    if (error) {
      setError(error.message)
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      router.refresh()
    }
  }

  function handleListingEdit(listing: any) {
    setEditingListingId(listing.id)
    const r: string = listing.role ?? ''
    const g = Object.keys(NETWORK.Artists).includes(r) ? 'Artists'
      : r === 'Venues' ? 'Venues'
      : Object.keys(NETWORK.Professionals['For Events']).includes(r) ? 'Professionals'
      : Object.keys(NETWORK.Professionals['For Artists']).includes(r) ? 'Professionals'
      : ''
    const sg = Object.keys(NETWORK.Professionals['For Events']).includes(r) ? 'For Events'
      : Object.keys(NETWORK.Professionals['For Artists']).includes(r) ? 'For Artists'
      : ''
    setListingRoleGroup(g)
    setListingRoleSubgroup(sg)
    setListingForm({
      type:        listing.type,
      role:        listing.role ?? '',
      title:       listing.title,
      description: listing.description ?? '',
      city:        listing.city        ?? '',
      date_needed: listing.date_needed ?? '',
    })
    setShowListingForm(true)
  }

  async function handleListingDelete(id: string) {
    const res = await fetch(`/api/listings/${id}`, { method: 'DELETE' })
    if (res.ok) setListingItems(prev => prev.filter((l: any) => l.id !== id))
  }

  async function handleListingSubmit(e: React.FormEvent) {
    e.preventDefault()
    setListingSubmitting(true)

    const method = editingListingId ? 'PATCH' : 'POST'
    const url    = editingListingId ? `/api/listings/${editingListingId}` : '/api/listings'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(listingForm),
    })
    const data = await res.json()
    setListingSubmitting(false)

    if (res.ok) {
      if (editingListingId) {
        setListingItems(prev => prev.map((l: any) => l.id === editingListingId ? data : l))
      } else {
        setListingItems(prev => [data, ...prev])
      }
      setShowListingForm(false)
      setEditingListingId(null)
      setListingForm({ type: 'seeking', role: '', title: '', description: '', city: '', date_needed: '' })
    }
  }

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-[#E8A020] text-sm"
  const labelClass = "text-white/50 text-xs mb-1.5 block uppercase tracking-wider"

  const profileTypeLabel: Record<string, string> = {
    user: t('dashboard_type_user'),
    organizer: t('dashboard_type_organizer'),
    artist: t('dashboard_type_artist'),
    venue: t('dashboard_type_venue'),
    professional: t('dashboard_type_professional'),
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'profile', label: t('dashboard_tab_profile') },
    ...(!isPro ? [{ key: 'content' as Tab, label: t('dashboard_tab_content') }] : []),
    { key: 'listings', label: t('listings_title') },
    { key: 'visibility', label: t('dashboard_tab_visibility') },
    { key: 'settings', label: t('dashboard_tab_settings') },
  ]

  const submitLink: Record<string, { href: string; label: string }> = {
    organizer: { href: '/dashboard/events/new', label: t('dashboard_new_event') },
    artist: { href: '/submit/release', label: t('dashboard_new_release') },
    // Same shape as spot: the venue itself is the account's first job, its
    // events come after.
    venue: venueIncomplete
      ? { href: '/dashboard/venue', label: t('dashboard_venue_complete_cta') }
      : { href: '/dashboard/events/new', label: t('dashboard_new_event') },
    // Points at the spot itself until one exists, then at the event flow —
    // the spot is the account's first job, its events come after.
    spot: ownedSpot
      ? { href: '/dashboard/events/new', label: t('dashboard_new_event') }
      : { href: '/dashboard/spots/new', label: t('dashboard_submit_spot') },
    // A professional's own listing is the thing they publish, so the header CTA
    // points at the wizard that fills it in.
    professional: {
      href: '/dashboard/professional',
      label: proIncomplete ? t('dashboard_pro_complete_cta') : t('dashboard_pro_edit_cta'),
    },
  }

  const saveButton = (onClick: () => void) => (
    <div className="flex items-center gap-3">
      <button
        onClick={onClick}
        disabled={saving}
        className="px-8 py-3 rounded-xl font-bold text-sm transition-opacity disabled:opacity-50"
        style={{ backgroundColor: '#E8A020', color: '#0F0F1A' }}
      >
        {saving ? t('dashboard_saving') : t('dashboard_save_profile')}
      </button>
      {saved && <span className="text-sm" style={{ color: '#4ade80' }}>{t('dashboard_saved')}</span>}
      {error && <span className="text-sm text-red-400">{error}</span>}
    </div>
  )

  // Free users get the consumer view — no tabs
  if (profile.profile_type === 'user') {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#0F0F1A' }}>
        <div className="border-b" style={{ borderColor: 'rgba(255,255,255,0.06)', backgroundColor: 'rgba(15,15,26,0.95)' }}>
          <div className="px-4 py-4 flex items-center gap-4" style={{ maxWidth: 680, margin: '0 auto' }}>
            {form.avatar_url ? (
              <div className="relative w-9 h-9 rounded-xl overflow-hidden flex-shrink-0" style={{ border: '2px solid #E8A020' }}>
                <CroppedImage src={form.avatar_url} alt={form.display_name} crop={getAvatarCrop(form)} sizes="36px" />
              </div>
            ) : (
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold" style={{ backgroundColor: '#1A1A2E', border: '2px solid #E8A020', color: '#E8A020' }}>
                {form.display_name[0]?.toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-white text-sm font-medium">{form.display_name}</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.50)' }}>@{profile.username} · {t('dashboard_type_user')}</p>
            </div>
          </div>
        </div>
        <ConsumerDashboard
          name={profile.display_name || profile.username || t('dashboard_friend_fallback')}
          savedEvents={savedEvents ?? []}
          upcomingEvents={upcomingEvents ?? []}
          savedSpots={savedSpots ?? []}
          followedProfiles={followedProfiles ?? []}
        />
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '20px 16px', marginTop: 40, borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>{t('dashboard_are_you_pro')}</span>
          <button
            onClick={() => setShowUpgrade(true)}
            style={{ color: '#E8A020', fontSize: 13, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            {t('dashboard_create_pro_profile')}
          </button>
        </div>
        {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0F0F1A' }}>

      {/* Top bar */}
      <div className="border-b" style={{ borderColor: 'rgba(255,255,255,0.06)', backgroundColor: 'rgba(15,15,26,0.95)' }}>
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {form.avatar_url ? (
              <div className="relative w-9 h-9 rounded-xl overflow-hidden flex-shrink-0" style={{ border: '2px solid #E8A020' }}>
                <CroppedImage src={form.avatar_url} alt={form.display_name} crop={getAvatarCrop(form)} sizes="36px" />
              </div>
            ) : (
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold" style={{ backgroundColor: '#1A1A2E', border: '2px solid #E8A020', color: '#E8A020' }}>
                {form.display_name[0]?.toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-white text-sm font-medium">{form.display_name}</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.50)' }}>@{profile.username} · {profileTypeLabel[profile.profile_type]}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/profile/${profile.username}`}
              target="_blank"
              className="text-xs px-3 py-2 rounded-lg transition-opacity hover:opacity-80"
              style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}
            >
              {t('dashboard_view_profile')}
            </Link>
            {!isPro && submitLink[profile.profile_type] && (
              <Link
                href={submitLink[profile.profile_type].href}
                className="text-xs px-3 py-2 rounded-lg font-medium"
                style={{ backgroundColor: '#E8A020', color: '#0F0F1A' }}
              >
                {submitLink[profile.profile_type].label}
              </Link>
            )}
          </div>
        </div>

        {/* Upgrade banner — free-tier users only */}
        {profile.profile_type === 'user' && profile.plan_tier === 'free' && (
          <div className="max-w-6xl mx-auto px-4 py-2.5">
            <div className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl" style={{ backgroundColor: '#0F0F1A', border: '1px solid rgba(232,160,32,0.35)' }}>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>
                <span style={{ color: '#E8A020', fontWeight: 600 }}>{t('upgrade_become_creator')}</span>: {t('dashboard_upgrade_banner_desc')}
              </p>
              <button
                onClick={() => setShowUpgrade(true)}
                className="flex-shrink-0 text-xs font-bold px-4 py-2 rounded-lg transition-opacity hover:opacity-80"
                style={{ backgroundColor: '#E8A020', color: '#0F0F1A' }}
              >
                {t('dashboard_upgrade_btn')}
              </button>
            </div>
          </div>
        )}

        {/* Complete-your-profile nudge — where an approved /upgrade request
            lands a professional whose profile is still mostly empty. */}
        {proIncomplete && (
          <div className="max-w-6xl mx-auto px-4 py-2.5">
            <div className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl" style={{ backgroundColor: '#0F0F1A', border: '1px solid rgba(232,160,32,0.35)' }}>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>
                <span style={{ color: '#E8A020', fontWeight: 600 }}>{t('dashboard_pro_profile_title')}</span>: {t('dashboard_pro_complete_nudge')}
              </p>
              <Link
                href="/dashboard/professional"
                className="flex-shrink-0 text-xs font-bold px-4 py-2 rounded-lg transition-opacity hover:opacity-80"
                style={{ backgroundColor: '#E8A020', color: '#0F0F1A' }}
              >
                {t('dashboard_pro_complete_cta')}
              </Link>
            </div>
          </div>
        )}

        {/* Same nudge for a venue account that has not filled its venue in. */}
        {venueIncomplete && (
          <div className="max-w-6xl mx-auto px-4 py-2.5">
            <div className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl" style={{ backgroundColor: '#0F0F1A', border: '1px solid rgba(232,160,32,0.35)' }}>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>
                <span style={{ color: '#E8A020', fontWeight: 600 }}>{t('dashboard_venue_profile_title')}</span>: {t('dashboard_venue_complete_nudge')}
              </p>
              <Link
                href="/dashboard/venue"
                className="flex-shrink-0 text-xs font-bold px-4 py-2 rounded-lg transition-opacity hover:opacity-80"
                style={{ backgroundColor: '#E8A020', color: '#0F0F1A' }}
              >
                {t('dashboard_venue_complete_cta')}
              </Link>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="max-w-6xl mx-auto px-4 flex gap-1">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="px-4 py-2.5 text-sm font-medium transition-all"
              style={{
                color: activeTab === tab.key ? '#E8A020' : 'rgba(255,255,255,0.35)',
                borderBottom: activeTab === tab.key ? '2px solid #E8A020' : '2px solid transparent',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* ══ TAB: PROFILE (professional) ══ */}
        {activeTab === 'profile' && isPro && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
            <div className="space-y-8">

              {/* Wizard entry point — professionals edit everything through the
                  4-step flow, the same way spots and events do. */}
              <div className="p-6 rounded-2xl space-y-5" style={{ backgroundColor: '#111120', border: '0.5px solid rgba(255,255,255,0.07)' }}>
                <div>
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">{t('dashboard_pro_profile_title')}</h2>
                  <p className="text-sm mt-2 leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    {t('dashboard_pro_profile_desc')}
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    {t('dashboard_pro_checklist_title')}
                  </p>
                  {proChecklist.map(item => (
                    <div key={item.label} className="flex items-center gap-2 text-sm">
                      <span style={{ color: item.done ? '#4ade80' : 'rgba(255,255,255,0.25)' }}>{item.done ? '✓' : '○'}</span>
                      <span style={{ color: item.done ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.75)' }}>{item.label}</span>
                    </div>
                  ))}
                </div>

                <Link
                  href="/dashboard/professional"
                  className="inline-block px-8 py-3 rounded-xl font-bold text-sm transition-opacity hover:opacity-90"
                  style={{ backgroundColor: '#E8A020', color: '#0F0F1A' }}
                >
                  {proIncomplete ? t('dashboard_pro_complete_cta') : t('dashboard_pro_edit_cta')}
                </Link>
              </div>
            </div>

            {/* Profile Preview */}
            <div className="hidden lg:block">
              <div className="sticky top-6">
                <p className="text-xs uppercase tracking-wider mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>{t('dashboard_profile_preview')}</p>
                <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#0a0a14', border: '0.5px solid rgba(255,255,255,0.08)' }}>
                  <div className="relative h-24" style={{ backgroundColor: '#1a1a2e' }}>
                    {profile.cover_url && <CroppedImage src={profile.cover_url} alt="Banner" crop={getCoverCrop(profile)} sizes="360px" />}
                  </div>
                  <div className="px-4 pb-4">
                    <div className="relative -mt-8 mb-3 w-16 h-16 rounded-xl overflow-hidden flex-shrink-0" style={{ border: '2px solid #E8A020', backgroundColor: '#1A1A2E' }}>
                      {profile.avatar_url ? (
                        <CroppedImage src={profile.avatar_url} alt={profile.display_name} crop={getAvatarCrop(profile)} sizes="64px" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl font-bold" style={{ color: '#E8A020' }}>
                          {profile.display_name[0]?.toUpperCase()}
                        </div>
                      )}
                    </div>
                    <p className="font-bold text-white text-sm">{profile.display_name}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.50)' }}>@{profile.username}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {profile.network_category && (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.45)' }}>
                          {networkCategoryLabel(profile.network_category, lang)}
                        </span>
                      )}
                      {profile.location && (
                        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.50)' }}>📍 {profile.location}</span>
                      )}
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{
                        backgroundColor: profile.is_available ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.05)',
                        color: profile.is_available ? '#4ade80' : 'rgba(255,255,255,0.3)',
                      }}>
                        {profile.is_available ? t('dashboard_available_status') : t('dashboard_busy_status')}
                      </span>
                    </div>
                    {profile.bio && (
                      <p className="text-xs mt-3 leading-relaxed line-clamp-3" style={{ color: 'rgba(255,255,255,0.5)' }}>{profile.bio}</p>
                    )}
                  </div>
                </div>
                <Link
                  href={`/profile/${profile.username}`}
                  target="_blank"
                  className="mt-3 block text-center text-xs py-2.5 rounded-xl transition-opacity hover:opacity-80"
                  style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}
                >
                  {t('dashboard_view_full_profile')}
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ══ TAB: PROFILE (venue) ══ */}
        {activeTab === 'profile' && isVenue && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
            <div className="space-y-8">

              {/* Wizard entry point — venues edit everything through the 4-step
                  flow, the same way spots, events and professionals do. */}
              <div className="p-6 rounded-2xl space-y-5" style={{ backgroundColor: '#111120', border: '0.5px solid rgba(255,255,255,0.07)' }}>
                <div>
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">{t('dashboard_venue_profile_title')}</h2>
                  <p className="text-sm mt-2 leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    {t('dashboard_venue_profile_desc')}
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    {t('dashboard_pro_checklist_title')}
                  </p>
                  {venueChecklist.map(item => (
                    <div key={item.label} className="flex items-center gap-2 text-sm">
                      <span style={{ color: item.done ? '#4ade80' : 'rgba(255,255,255,0.25)' }}>{item.done ? '✓' : '○'}</span>
                      <span style={{ color: item.done ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.75)' }}>{item.label}</span>
                    </div>
                  ))}
                </div>

                <Link
                  href="/dashboard/venue"
                  className="inline-block px-8 py-3 rounded-xl font-bold text-sm transition-opacity hover:opacity-90"
                  style={{ backgroundColor: '#E8A020', color: '#0F0F1A' }}
                >
                  {venueIncomplete ? t('dashboard_venue_complete_cta') : t('dashboard_venue_edit_cta')}
                </Link>
              </div>
            </div>

            {/* Profile Preview */}
            <div className="hidden lg:block">
              <div className="sticky top-6">
                <p className="text-xs uppercase tracking-wider mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>{t('dashboard_profile_preview')}</p>
                <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#0a0a14', border: '0.5px solid rgba(255,255,255,0.08)' }}>
                  <div className="relative h-24" style={{ backgroundColor: '#1a1a2e' }}>
                    {profile.cover_url && <CroppedImage src={profile.cover_url} alt="Banner" crop={getCoverCrop(profile)} sizes="360px" />}
                  </div>
                  <div className="px-4 pb-4">
                    <div className="relative -mt-8 mb-3 w-16 h-16 rounded-xl overflow-hidden flex-shrink-0" style={{ border: '2px solid #E8A020', backgroundColor: '#1A1A2E' }}>
                      {profile.avatar_url ? (
                        <CroppedImage src={profile.avatar_url} alt={profile.display_name} crop={getAvatarCrop(profile)} sizes="64px" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl font-bold" style={{ color: '#E8A020' }}>
                          {profile.display_name[0]?.toUpperCase()}
                        </div>
                      )}
                    </div>
                    <p className="font-bold text-white text-sm">{profile.display_name}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.50)' }}>@{profile.username}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {profile.network_category && (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.45)' }}>
                          {networkCategoryLabel(profile.network_category, lang)}
                        </span>
                      )}
                      {profile.venue_capacity && (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.45)' }}>
                          👥 {profile.venue_capacity}
                        </span>
                      )}
                      {profile.location && (
                        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.50)' }}>📍 {profile.location}</span>
                      )}
                    </div>
                    {profile.bio && (
                      <p className="text-xs mt-3 leading-relaxed line-clamp-3" style={{ color: 'rgba(255,255,255,0.5)' }}>{profile.bio}</p>
                    )}
                  </div>
                </div>
                <Link
                  href={`/profile/${profile.username}`}
                  target="_blank"
                  className="mt-3 block text-center text-xs py-2.5 rounded-xl transition-opacity hover:opacity-80"
                  style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}
                >
                  {t('dashboard_view_full_profile')}
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ══ TAB: PROFILE (everyone still on the plain form) ══ */}
        {activeTab === 'profile' && !usesWizard && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">

            {/* Edit Panel */}
            <div className="space-y-8">

              {/* Photos */}
              <div className="p-6 rounded-2xl space-y-5" style={{ backgroundColor: '#111120', border: '0.5px solid rgba(255,255,255,0.07)' }}>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">{t('dashboard_photos')}</h2>
                <div>
                  <label className={labelClass}>{t('dashboard_banner_photo')}</label>
                  <ImageUpload
                    folder="banners"
                    onUpload={(url) => setForm(prev => ({ ...prev, cover_url: url, cover_crop_x: null, cover_crop_y: null, cover_crop_width: null, cover_crop_height: null }))}
                    existingUrl={form.cover_url}
                  />
                  {form.cover_url && (
                    <button type="button" onClick={() => setShowCoverCropper(true)} className="text-xs mt-1.5 hover:opacity-80" style={{ color: '#E8A020' }}>
                      {t('image_crop_edit')}
                    </button>
                  )}
                  {showCoverCropper && form.cover_url && (
                    <ImageCropper
                      imageUrl={form.cover_url}
                      aspect={COVER_CROP_ASPECT}
                      initialCrop={getCoverCrop(form)}
                      onConfirm={(box: CropBox) => {
                        setForm(prev => ({ ...prev, cover_crop_x: box.crop_x, cover_crop_y: box.crop_y, cover_crop_width: box.crop_width, cover_crop_height: box.crop_height }))
                        setShowCoverCropper(false)
                      }}
                      onCancel={() => setShowCoverCropper(false)}
                    />
                  )}
                </div>
                <div>
                  <label className={labelClass}>{t('dashboard_profile_photo')}</label>
                  <ImageUpload
                    folder="avatars"
                    onUpload={(url) => setForm(prev => ({ ...prev, avatar_url: url, avatar_crop_x: null, avatar_crop_y: null, avatar_crop_width: null, avatar_crop_height: null }))}
                    existingUrl={form.avatar_url}
                  />
                  {form.avatar_url && (
                    <button type="button" onClick={() => setShowAvatarCropper(true)} className="text-xs mt-1.5 hover:opacity-80" style={{ color: '#E8A020' }}>
                      {t('image_crop_edit')}
                    </button>
                  )}
                  {showAvatarCropper && form.avatar_url && (
                    <ImageCropper
                      imageUrl={form.avatar_url}
                      aspect={AVATAR_CROP_ASPECT}
                      initialCrop={getAvatarCrop(form)}
                      onConfirm={(box: CropBox) => {
                        setForm(prev => ({ ...prev, avatar_crop_x: box.crop_x, avatar_crop_y: box.crop_y, avatar_crop_width: box.crop_width, avatar_crop_height: box.crop_height }))
                        setShowAvatarCropper(false)
                      }}
                      onCancel={() => setShowAvatarCropper(false)}
                    />
                  )}
                </div>
              </div>

              {/* Basic Info */}
              <div className="p-6 rounded-2xl space-y-4" style={{ backgroundColor: '#111120', border: '0.5px solid rgba(255,255,255,0.07)' }}>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">{t('dashboard_basic_info')}</h2>
                <div>
                  <label className={labelClass}>{t('dashboard_display_name')}</label>
                  <input name="display_name" value={form.display_name} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{t('dashboard_bio')}</label>
                  <textarea name="bio" value={form.bio} onChange={handleChange} rows={4} placeholder={t('dashboard_bio_placeholder')} className={`${inputClass} resize-none`} />
                </div>
                <div>
                  <label className={labelClass}>{t('dashboard_city_location')}</label>
                  <input name="location" value={form.location} onChange={handleChange} placeholder={t('dashboard_city_location_placeholder')} className={inputClass} />
                </div>

                {/* Availability */}
                <div className="flex items-center justify-between p-4 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.07)' }}>
                  <div>
                    <p className="text-sm text-white font-medium">{t('dashboard_available_for_booking')}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.50)' }}>{t('dashboard_availability_desc')}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, is_available: !prev.is_available }))}
                    className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0"
                    style={{ backgroundColor: form.is_available ? '#E8A020' : 'rgba(255,255,255,0.15)' }}
                  >
                    <div className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all" style={{ left: form.is_available ? '24px' : '4px' }} />
                  </button>
                </div>

                {/* The venue "Network Listing" block used to sit here. Venues
                    now pick their type in the wizard's step 1, so keeping it
                    would have been a second, competing way to set
                    network_category on the same row. */}

                {/* Network Listing — artist */}
                {profile.profile_type === 'artist' && (
                  <div className="space-y-3">
                    <label className={labelClass}>{t('dashboard_network_listing')}</label>
                    <div className="flex gap-2">
                      {(['Artists', 'Artists'] as const).map(tab => (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => setForm(p => ({ ...p, network_tab: tab, network_category: '', network_subcategory: '' }))}
                          className="text-xs px-3 py-2 rounded-lg transition-all"
                          style={{
                            backgroundColor: form.network_tab === tab ? '#E8A020' : 'rgba(255,255,255,0.05)',
                            color: form.network_tab === tab ? '#09090f' : 'rgba(255,255,255,0.45)',
                            border: 'none',
                            cursor: 'pointer',
                            fontFamily: 'var(--font-sans)',
                          }}
                        >
                          {t('listings_cat_artists')}
                        </button>
                      ))}
                    </div>

                    {form.network_tab === 'Artists' && (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-3 py-1.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: '0.5px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.55)' }}>
                            {t('dashboard_music_artists')}
                          </span>
                        </div>
                        <div>
                          <label className={labelClass}>{t('dashboard_role')}</label>
                          <select
                            value={form.network_subcategory}
                            onChange={e => setForm(p => ({ ...p, network_tab: 'Artists', network_category: e.target.value, network_subcategory: '' }))}
                            className={inputClass}
                            style={{ backgroundColor: 'rgba(255,255,255,0.05)', colorScheme: 'dark' }}
                          >
                            <option value="">{t('dashboard_select_role')}</option>
                            {Object.keys(NETWORK['Artists']).map((s: string) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}

                    {form.network_tab === 'Artists' && (
                      <>
                        <div>
                          <label className={labelClass}>{t('listings_category')}</label>
                          <select
                            value={form.network_category}
                            onChange={e => setForm(p => ({ ...p, network_category: e.target.value, network_subcategory: '' }))}
                            className={inputClass}
                            style={{ backgroundColor: 'rgba(255,255,255,0.05)', colorScheme: 'dark' }}
                          >
                            <option value="">{t('dashboard_select_category')}</option>
                            {Object.keys(NETWORK['Artists']).map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Genres — artists */}
                {profile.profile_type === 'artist' && (
                  <div>
                    <label className={labelClass}>{t('dashboard_genres')}</label>
                    <div className="flex flex-wrap gap-2">
                      {GENRES.map(g => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => toggleGenre(g)}
                          className="text-xs px-3 py-1.5 rounded-full transition-all"
                          style={{
                            backgroundColor: form.genres.includes(g) ? 'rgba(232,160,32,0.2)' : 'rgba(255,255,255,0.05)',
                            color: form.genres.includes(g) ? '#E8A020' : 'rgba(255,255,255,0.4)',
                            border: `0.5px solid ${form.genres.includes(g) ? 'rgba(232,160,32,0.4)' : 'rgba(255,255,255,0.1)'}`,
                          }}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Featured track — artists/organizers/venues */}
                {(profile.profile_type === 'artist' || profile.profile_type === 'organizer' || profile.profile_type === 'venue') && (
                  <div>
                    <label className={labelClass}>{t('dashboard_featured_track_url')}</label>
                    <input name="featured_track_url" value={form.featured_track_url} onChange={handleChange} placeholder="https://soundcloud.com/..." className={inputClass} />
                  </div>
                )}

                {/* Booking info — organizers/venues */}
                {(profile.profile_type === 'organizer' || profile.profile_type === 'venue') && (
                  <div>
                    <label className={labelClass}>{t('dashboard_booking_info')}</label>
                    <textarea name="booking_info" value={form.booking_info} onChange={handleChange} rows={3} placeholder={t('dashboard_booking_info_placeholder')} className={`${inputClass} resize-none`} />
                  </div>
                )}

                {/* Announcements — organizers/venues */}
                {(profile.profile_type === 'organizer' || profile.profile_type === 'venue') && (
                  <div>
                    <label className={labelClass}>{t('dashboard_announcements')}</label>
                    <textarea name="announcements" value={form.announcements} onChange={handleChange} rows={3} placeholder={t('dashboard_announcements_placeholder')} className={`${inputClass} resize-none`} />
                  </div>
                )}
              </div>

              {/* Socials */}
              <div className="p-6 rounded-2xl space-y-4" style={{ backgroundColor: '#111120', border: '0.5px solid rgba(255,255,255,0.07)' }}>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">{t('dashboard_social_links')}</h2>
                {SOCIAL_FIELDS.map(field => (
                  <div key={field.key}>
                    <label className={labelClass}>{field.label}</label>
                    <input
                      name={field.key}
                      value={(form as any)[field.key] ?? ''}
                      onChange={handleChange}
                      placeholder={field.placeholder}
                      className={inputClass}
                    />
                  </div>
                ))}
              </div>

              {(profile.profile_type === 'artist' || profile.profile_type === 'organizer' || profile.profile_type === 'venue') && (
                <CreatorGallery profileId={profile.id} />
              )}

              {saveButton(handleSave)}
            </div>

            {/* Profile Preview */}
            <div className="hidden lg:block">
              <div className="sticky top-6">
                <p className="text-xs uppercase tracking-wider mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>{t('dashboard_profile_preview')}</p>
                <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#0a0a14', border: '0.5px solid rgba(255,255,255,0.08)' }}>
                  <div className="relative h-24" style={{ backgroundColor: '#1a1a2e' }}>
                    {form.cover_url && <CroppedImage src={form.cover_url} alt="Banner" crop={getCoverCrop(form)} sizes="360px" />}
                  </div>
                  <div className="px-4 pb-4">
                    <div className="relative -mt-8 mb-3 w-16 h-16 rounded-xl overflow-hidden flex-shrink-0" style={{ border: '2px solid #E8A020', backgroundColor: '#1A1A2E' }}>
                      {form.avatar_url ? (
                        <CroppedImage src={form.avatar_url} alt={form.display_name} crop={getAvatarCrop(form)} sizes="64px" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl font-bold" style={{ color: '#E8A020' }}>
                          {form.display_name[0]?.toUpperCase()}
                        </div>
                      )}
                    </div>
                    <p className="font-bold text-white text-sm">{form.display_name || t('dashboard_display_name')}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.50)' }}>@{profile.username}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.45)' }}>
                        {profileTypeLabel[profile.profile_type]}
                      </span>
                      {form.location && (
                        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.50)' }}>📍 {form.location}</span>
                      )}
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{
                        backgroundColor: form.is_available ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.05)',
                        color: form.is_available ? '#4ade80' : 'rgba(255,255,255,0.3)',
                      }}>
                        {form.is_available ? t('dashboard_available_status') : t('dashboard_not_available_status')}
                      </span>
                    </div>
                    {form.bio && (
                      <p className="text-xs mt-3 leading-relaxed line-clamp-3" style={{ color: 'rgba(255,255,255,0.5)' }}>{form.bio}</p>
                    )}
                    {form.genres.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {form.genres.slice(0, 3).map((g: string) => (
                          <span key={g} className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(232,160,32,0.1)', color: '#E8A020' }}>{g}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <Link
                  href={`/profile/${profile.username}`}
                  target="_blank"
                  className="mt-3 block text-center text-xs py-2.5 rounded-xl transition-opacity hover:opacity-80"
                  style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}
                >
                  {t('dashboard_view_full_profile')}
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ══ TAB: CONTENT (non-professional only) ══ */}
        {activeTab === 'content' && !isPro && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">{t('dashboard_your_content')}</h2>
              {submitLink[profile.profile_type] && (
                <Link
                  href={submitLink[profile.profile_type].href}
                  className="text-sm px-4 py-2 rounded-lg font-medium"
                  style={{ backgroundColor: '#E8A020', color: '#0F0F1A' }}
                >
                  {submitLink[profile.profile_type].label}
                </Link>
              )}
            </div>

            {/* Spot — one per account, so this is a single card, not a list */}
            {profile.profile_type === 'spot' && (
              <div className="mb-8">
                <h3 className="text-xs uppercase tracking-wider mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {t('dashboard_your_spot')}
                </h3>
                {ownedSpot ? (
                  <div className="flex items-center gap-4 p-4 rounded-xl" style={{ backgroundColor: '#111120', border: '0.5px solid rgba(255,255,255,0.07)' }}>
                    {ownedSpot.cover_image && (
                      <img
                        src={ownedSpot.cover_image}
                        alt=""
                        className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{ownedSpot.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.50)' }}>
                        {[ownedSpot.subcategory, ownedSpot.neighborhood, ownedSpot.city].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full flex-shrink-0" style={{
                      backgroundColor: ownedSpot.is_published ? 'rgba(74,222,128,0.1)' : 'rgba(232,160,32,0.1)',
                      color: ownedSpot.is_published ? '#4ade80' : '#E8A020',
                    }}>
                      {ownedSpot.is_published ? t('dashboard_status_live') : t('dashboard_status_pending')}
                    </span>
                    {ownedSpot.is_published && (
                      <Link
                        href={`/spots/${ownedSpot.slug}`}
                        className="text-xs px-3 py-1.5 rounded-lg flex-shrink-0 transition-opacity hover:opacity-80"
                        style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}
                      >
                        {t('dashboard_view_profile')}
                      </Link>
                    )}
                    <Link
                      href={`/dashboard/edit/spot/${ownedSpot.id}`}
                      className="text-xs px-3 py-1.5 rounded-lg flex-shrink-0 transition-opacity hover:opacity-80"
                      style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}
                    >
                      {t('dashboard_edit')}
                    </Link>
                  </div>
                ) : (
                  <div className="p-8 rounded-2xl text-center" style={{ backgroundColor: '#111120', border: '0.5px solid rgba(255,255,255,0.07)' }}>
                    <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      {t('dashboard_no_spot_yet')}
                    </p>
                    <Link
                      href="/dashboard/spots/new"
                      className="inline-block text-xs px-4 py-2 rounded-lg font-medium"
                      style={{ backgroundColor: '#E8A020', color: '#0F0F1A' }}
                    >
                      {t('dashboard_submit_spot')}
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* Events */}
            {(profile.profile_type === 'organizer' || profile.profile_type === 'venue' || profile.profile_type === 'spot') && (
              <div>
                {(() => {
                  const totalViews = events.reduce((sum: number, e: any) => sum + (e.view_count ?? 0), 0)
                  const totalGoing = events.reduce((sum: number, e: any) => sum + (e.going_count ?? 0), 0)
                  const totalInterested = events.reduce((sum: number, e: any) => sum + (e.interested_count ?? 0), 0)
                  const topEvent = events.length > 0
                    ? events.reduce((top: any, e: any) => (e.going_count ?? 0) > (top.going_count ?? 0) ? e : top, events[0])
                    : null
                  return (
                    <div className="mb-4">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3 rounded-xl" style={{ backgroundColor: '#111120', border: '0.5px solid rgba(255,255,255,0.07)' }}>
                          <p className="text-xl font-bold text-white">{totalViews}</p>
                          <p className="text-xs uppercase" style={{ color: 'rgba(255,255,255,0.35)' }}>Views</p>
                        </div>
                        <div className="p-3 rounded-xl" style={{ backgroundColor: '#111120', border: '0.5px solid rgba(255,255,255,0.07)' }}>
                          <p className="text-xl font-bold text-white">{profile.view_count ?? 0}</p>
                          <p className="text-xs uppercase" style={{ color: 'rgba(255,255,255,0.35)' }}>Profile Views</p>
                        </div>
                        <div className="p-3 rounded-xl" style={{ backgroundColor: '#111120', border: '0.5px solid rgba(255,255,255,0.07)' }}>
                          <p className="text-xl font-bold text-white">{totalGoing}</p>
                          <p className="text-xs uppercase" style={{ color: 'rgba(255,255,255,0.35)' }}>Going</p>
                        </div>
                        <div className="p-3 rounded-xl" style={{ backgroundColor: '#111120', border: '0.5px solid rgba(255,255,255,0.07)' }}>
                          <p className="text-xl font-bold text-white">{totalInterested}</p>
                          <p className="text-xs uppercase" style={{ color: 'rgba(255,255,255,0.35)' }}>Interested</p>
                        </div>
                        <div className="p-3 rounded-xl" style={{ backgroundColor: '#111120', border: '0.5px solid rgba(255,255,255,0.07)' }}>
                          <p className="text-xl font-bold text-white">{savedEventsCount ?? 0}</p>
                          <p className="text-xs uppercase" style={{ color: 'rgba(255,255,255,0.35)' }}>Saved</p>
                        </div>
                      </div>
                      {topEvent && (
                        <p className="text-xs mt-3" style={{ color: 'rgba(255,255,255,0.5)' }}>
                          🏆 Top event: {topEvent.title} ({topEvent.going_count ?? 0} going)
                        </p>
                      )}
                    </div>
                  )
                })()}

                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>{t('events_title')} ({events.length})</h3>
                  <Link
                    href="/dashboard/events/new"
                    className="text-xs px-3 py-1.5 rounded-lg font-medium"
                    style={{ backgroundColor: '#E8A020', color: '#0F0F1A' }}
                  >
                    {t('dashboard_add_event')}
                  </Link>
                </div>
                {events.length === 0 ? (
                  <div className="p-8 rounded-2xl text-center" style={{ backgroundColor: '#111120', border: '0.5px solid rgba(255,255,255,0.07)' }}>
                    <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>{t('dashboard_no_events_yet')}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {events.map((event: any) => (
                      <div key={event.id} className="flex items-center gap-4 p-4 rounded-xl" style={{ backgroundColor: '#111120', border: '0.5px solid rgba(255,255,255,0.07)' }}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{event.title}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.50)' }}>{event.venue} · {event.date}</p>
                        </div>
                        <span className="text-xs flex-shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }}>
                          👁 {event.view_count ?? 0} · 👥 {event.going_count ?? 0} · ⭐ {event.interested_count ?? 0}
                        </span>
                        <span className="text-xs px-2 py-1 rounded-full flex-shrink-0" style={{
                          backgroundColor: event.status === 'approved' ? 'rgba(74,222,128,0.1)' : 'rgba(232,160,32,0.1)',
                          color: event.status === 'approved' ? '#4ade80' : '#E8A020',
                        }}>
                          {event.status === 'approved' ? t('dashboard_status_live') : t('dashboard_status_pending')}
                        </span>
                        {event.featured ? (
                          <span className="text-xs px-2 py-1 rounded-full flex-shrink-0" style={{ backgroundColor: 'rgba(232,160,32,0.15)', color: '#E8A020' }}>
                            ⭐ Featured
                          </span>
                        ) : (featuredRequests ?? []).some((r: any) => r.event_id === event.id && r.status === 'pending') ? (
                          <span className="text-xs px-2 py-1 rounded-full flex-shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>
                            ⏳ Featured request pending
                          </span>
                        ) : (
                          <button
                            onClick={() => handleRequestFeatured(event.id)}
                            disabled={requestingFeaturedId === event.id}
                            className="text-xs px-3 py-1.5 rounded-lg flex-shrink-0 transition-opacity hover:opacity-80 disabled:opacity-50"
                            style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}
                          >
                            ⭐ Request Featured
                          </button>
                        )}
                        <Link
                          href={`/dashboard/edit/event/${event.id}`}
                          className="text-xs px-3 py-1.5 rounded-lg flex-shrink-0 transition-opacity hover:opacity-80"
                          style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}
                        >
                          {t('dashboard_edit')}
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Artist Analytics */}
            {profile.profile_type === 'artist' && (
              <div>
                <div className="mb-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl" style={{ backgroundColor: '#111120', border: '0.5px solid rgba(255,255,255,0.07)' }}>
                      <p className="text-xl font-bold text-white">{profile.view_count ?? 0}</p>
                      <p className="text-xs uppercase" style={{ color: 'rgba(255,255,255,0.35)' }}>Profile Views</p>
                    </div>
                    <div className="p-3 rounded-xl" style={{ backgroundColor: '#111120', border: '0.5px solid rgba(255,255,255,0.07)' }}>
                      <p className="text-xl font-bold text-white">{(artistBookings ?? []).length}</p>
                      <p className="text-xs uppercase" style={{ color: 'rgba(255,255,255,0.35)' }}>Upcoming Bookings</p>
                    </div>
                    <div className="p-3 rounded-xl" style={{ backgroundColor: '#111120', border: '0.5px solid rgba(255,255,255,0.07)' }}>
                      <p className="text-xl font-bold text-white">{releases.length}</p>
                      <p className="text-xs uppercase" style={{ color: 'rgba(255,255,255,0.35)' }}>Releases</p>
                    </div>
                    <div className="p-3 rounded-xl" style={{ backgroundColor: '#111120', border: '0.5px solid rgba(255,255,255,0.07)' }}>
                      <p className="text-xl font-bold text-white">{(receivedInterests ?? []).length}</p>
                      <p className="text-xs uppercase" style={{ color: 'rgba(255,255,255,0.35)' }}>Listing Interests</p>
                    </div>
                  </div>
                </div>

                <h3 className="text-xs uppercase tracking-wider mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>Upcoming Bookings ({(artistBookings ?? []).length})</h3>
                {(artistBookings ?? []).length === 0 ? (
                  <div className="p-8 rounded-2xl text-center" style={{ backgroundColor: '#111120', border: '0.5px solid rgba(255,255,255,0.07)' }}>
                    <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>{t('dashboard_no_events_yet')}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(artistBookings ?? []).map((event: any) => (
                      <Link
                        key={event.id}
                        href={`/events/${event.id}`}
                        className="flex items-center gap-4 p-4 rounded-xl transition-opacity hover:opacity-80"
                        style={{ backgroundColor: '#111120', border: '0.5px solid rgba(255,255,255,0.07)' }}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{event.title}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.50)' }}>{event.venue} · {event.date}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Releases */}
            {profile.profile_type === 'artist' && (
              <div>
                <h3 className="text-xs uppercase tracking-wider mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>{t('dashboard_releases_label')} ({releases.length})</h3>
                {releases.length === 0 ? (
                  <div className="p-8 rounded-2xl text-center" style={{ backgroundColor: '#111120', border: '0.5px solid rgba(255,255,255,0.07)' }}>
                    <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>{t('dashboard_no_releases_yet')}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {releases.map((release: any) => (
                      <div key={release.id} className="rounded-xl overflow-hidden" style={{ backgroundColor: '#111120', border: '0.5px solid rgba(255,255,255,0.07)' }}>
                        <div className="relative aspect-square bg-white/5">
                          {release.cover_image && <Image src={release.cover_image} alt={release.title} fill className="object-cover" />}
                        </div>
                        <div className="p-3">
                          <p className="text-xs font-medium text-white truncate">{release.title}</p>
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.50)' }}>{release.type}</p>
                            <span className="text-xs px-1.5 py-0.5 rounded-full" style={{
                              backgroundColor: release.status === 'approved' ? 'rgba(74,222,128,0.1)' : 'rgba(232,160,32,0.1)',
                              color: release.status === 'approved' ? '#4ade80' : '#E8A020',
                            }}>
                              {release.status === 'approved' ? t('dashboard_status_live') : t('dashboard_status_pending')}
                            </span>
                          </div>
                          <Link
                            href={`/dashboard/edit/release/${release.id}`}
                            className="mt-2 block w-full text-center text-xs py-1.5 rounded-lg transition-opacity hover:opacity-80"
                            style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}
                          >
                            {t('dashboard_edit')}
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        )}

        {/* ══ TAB: LISTINGS ══ */}
        {activeTab === 'listings' && (
          <div className="space-y-6">
            {isPro && (() => {
              const activeListingsCount = listingItems.filter((l: any) => l.is_active).length
              const totalListingInterests = listingItems.reduce((sum: number, l: any) => sum + (l._interest_count ?? 0), 0)
              return (
                <div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    <div className="p-3 rounded-xl" style={{ backgroundColor: '#111120', border: '0.5px solid rgba(255,255,255,0.07)' }}>
                      <p className="text-xl font-bold text-white">{profile.view_count ?? 0}</p>
                      <p className="text-xs uppercase" style={{ color: 'rgba(255,255,255,0.35)' }}>Profile Views</p>
                    </div>
                    <div className="p-3 rounded-xl" style={{ backgroundColor: '#111120', border: '0.5px solid rgba(255,255,255,0.07)' }}>
                      <p className="text-xl font-bold text-white">{(professionalContributions ?? []).length}</p>
                      <p className="text-xs uppercase" style={{ color: 'rgba(255,255,255,0.35)' }}>Event Contributions</p>
                    </div>
                    <div className="p-3 rounded-xl" style={{ backgroundColor: '#111120', border: '0.5px solid rgba(255,255,255,0.07)' }}>
                      <p className="text-xl font-bold text-white">{activeListingsCount}</p>
                      <p className="text-xs uppercase" style={{ color: 'rgba(255,255,255,0.35)' }}>Active Listings</p>
                    </div>
                    <div className="p-3 rounded-xl" style={{ backgroundColor: '#111120', border: '0.5px solid rgba(255,255,255,0.07)' }}>
                      <p className="text-xl font-bold text-white">{totalListingInterests}</p>
                      <p className="text-xs uppercase" style={{ color: 'rgba(255,255,255,0.35)' }}>Listing Interests</p>
                    </div>
                  </div>

                  {(professionalContributions ?? []).length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-xs uppercase tracking-wider mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        Event Contributions ({(professionalContributions ?? []).length})
                      </h3>
                      <div className="space-y-2">
                        {(professionalContributions ?? []).map((event: any) => (
                          <Link
                            key={event.id}
                            href={`/events/${event.id}`}
                            className="flex items-center gap-4 p-4 rounded-xl transition-opacity hover:opacity-80"
                            style={{ backgroundColor: '#111120', border: '0.5px solid rgba(255,255,255,0.07)' }}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white truncate">{event.title}</p>
                              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.50)' }}>{event.venue} · {event.date}</p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}

            <div>
              <h3 className="text-xs uppercase tracking-wider mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>
                {t('listings_title')} ({listingItems.length})
              </h3>

              {listingItems.length > 0 && (
                <div className="space-y-2 mb-4">
                  {listingItems.map((listing: any) => (
                    <div key={listing.id} className="flex items-center gap-4 p-4 rounded-xl" style={{ backgroundColor: '#111120', border: '0.5px solid rgba(255,255,255,0.07)' }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{listing.title}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.50)' }}>
                          {[listing.role, listing.city].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                      <span className="text-xs px-2 py-1 rounded-full flex-shrink-0" style={{
                        backgroundColor: listing.is_active ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.05)',
                        color: listing.is_active ? '#4ade80' : 'rgba(255,255,255,0.3)',
                      }}>
                        {listing.is_active ? t('dashboard_listing_active') : t('dashboard_listing_inactive')}
                      </span>
                      {listing._interest_count > 0 && (
                        <span className="text-xs px-2 py-1 rounded-full flex-shrink-0" style={{ backgroundColor: 'rgba(232,160,32,0.1)', color: '#E8A020' }}>
                          {listing._interest_count} {listing._interest_count !== 1 ? t('dashboard_interest_plural') : t('dashboard_interest_singular')}
                        </span>
                      )}
                      <button
                        onClick={() => handleListingEdit(listing)}
                        className="text-xs px-3 py-1.5 rounded-lg flex-shrink-0 transition-opacity hover:opacity-80"
                        style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}
                      >
                        {t('dashboard_edit')}
                      </button>
                      <button
                        onClick={() => handleListingDelete(listing.id)}
                        className="text-xs px-3 py-1.5 rounded-lg flex-shrink-0 transition-opacity hover:opacity-80"
                        style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}
                      >
                        {t('dashboard_delete')}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {showListingForm && (
                <form onSubmit={handleListingSubmit} className="p-5 rounded-2xl space-y-4 mb-4" style={{ backgroundColor: '#111120', border: '0.5px solid rgba(255,255,255,0.07)' }}>
                  <h4 className="text-sm font-semibold text-white">
                    {editingListingId ? t('dashboard_edit_listing') : t('dashboard_new_listing')}
                  </h4>

                  {/* Type toggle */}
                  <div className="flex gap-2">
                    {(['seeking', 'offering'] as const).map(lt => (
                      <button
                        key={lt}
                        type="button"
                        onClick={() => setListingForm(prev => ({ ...prev, type: lt }))}
                        className="text-xs px-3 py-2 rounded-lg transition-all"
                        style={{
                          backgroundColor: listingForm.type === lt ? '#E8A020' : 'rgba(255,255,255,0.05)',
                          color: listingForm.type === lt ? '#0F0F1A' : 'rgba(255,255,255,0.45)',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        {lt === 'seeking' ? t('listings_seeking') : t('listings_offering')}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <label className={labelClass}>{t('dashboard_role')}</label>
                    <select
                      value={listingRoleGroup}
                      onChange={e => {
                        const g = e.target.value
                        setListingRoleGroup(g)
                        setListingRoleSubgroup('')
                        setListingForm(prev => ({ ...prev, role: g === 'Venues' ? 'Venues' : '' }))
                      }}
                      className={inputClass}
                      style={{ backgroundColor: 'rgba(255,255,255,0.05)', colorScheme: 'dark' }}
                      required
                    >
                      <option value="">{t('dashboard_select_category')}</option>
                      <option value="Artists">{t('listings_cat_artists')}</option>
                      <option value="Venues">{t('listings_cat_venues')}</option>
                      <option value="Professionals">{t('listings_cat_professionals')}</option>
                    </select>

                    {listingRoleGroup === 'Professionals' && (
                      <select
                        value={listingRoleSubgroup}
                        onChange={e => {
                          setListingRoleSubgroup(e.target.value)
                          setListingForm(prev => ({ ...prev, role: '' }))
                        }}
                        className={inputClass}
                        style={{ backgroundColor: 'rgba(255,255,255,0.05)', colorScheme: 'dark' }}
                        required
                      >
                        <option value="">{t('dashboard_select_subcategory')}</option>
                        <option value="For Events">{t('dashboard_for_events')}</option>
                        <option value="For Artists">{t('dashboard_for_artists')}</option>
                      </select>
                    )}

                    {listingRoleGroup === 'Artists' && (
                      <select
                        value={listingForm.role}
                        onChange={e => setListingForm(prev => ({ ...prev, role: e.target.value }))}
                        className={inputClass}
                        style={{ backgroundColor: 'rgba(255,255,255,0.05)', colorScheme: 'dark' }}
                        required
                      >
                        <option value="">{t('dashboard_select_role')}</option>
                        {Object.keys(NETWORK.Artists).map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    )}

                    {listingRoleGroup === 'Professionals' && listingRoleSubgroup && (
                      <select
                        value={listingForm.role}
                        onChange={e => setListingForm(prev => ({ ...prev, role: e.target.value }))}
                        className={inputClass}
                        style={{ backgroundColor: 'rgba(255,255,255,0.05)', colorScheme: 'dark' }}
                        required
                      >
                        <option value="">{t('dashboard_select_role')}</option>
                        {Object.keys(NETWORK.Professionals[listingRoleSubgroup as 'For Events' | 'For Artists']).map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div>
                    <label className={labelClass}>{t('dashboard_title_label')}</label>
                    <input
                      value={listingForm.title}
                      onChange={e => setListingForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder={t('dashboard_listing_title_placeholder')}
                      className={inputClass}
                      required
                    />
                  </div>

                  <div>
                    <label className={labelClass}>{t('dashboard_description')}</label>
                    <textarea
                      value={listingForm.description}
                      onChange={e => setListingForm(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      className={`${inputClass} resize-none`}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>{t('listings_city')}</label>
                    <select
                      value={listingForm.city}
                      onChange={e => setListingForm(prev => ({ ...prev, city: e.target.value }))}
                      className={inputClass}
                      style={{ backgroundColor: 'rgba(255,255,255,0.05)', colorScheme: 'dark' }}
                    >
                      <option value="">{t('dashboard_select_city')}</option>
                      {CITIES.slice(1).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>{t('dashboard_date_optional')}</label>
                    <input
                      type="date"
                      value={listingForm.date_needed}
                      onChange={e => setListingForm(prev => ({ ...prev, date_needed: e.target.value }))}
                      className={inputClass}
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => { setShowListingForm(false); setEditingListingId(null); setListingRoleGroup(''); setListingRoleSubgroup('') }}
                      className="flex-1 py-2 rounded-lg text-sm"
                      style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', border: '0.5px solid rgba(255,255,255,0.1)' }}
                    >
                      {t('dashboard_cancel')}
                    </button>
                    <button
                      type="submit"
                      disabled={listingSubmitting}
                      className="flex-1 py-2 rounded-lg text-sm font-bold disabled:opacity-50"
                      style={{ backgroundColor: '#E8A020', color: '#0F0F1A' }}
                    >
                      {listingSubmitting ? t('dashboard_saving') : (editingListingId ? t('dashboard_save') : t('dashboard_publish'))}
                    </button>
                  </div>
                </form>
              )}

              {!showListingForm && (
                <button
                  onClick={() => { setEditingListingId(null); setListingRoleGroup(''); setListingRoleSubgroup(''); setListingForm({ type: 'seeking', role: '', title: '', description: '', city: '', date_needed: '' }); setShowListingForm(true) }}
                  className="text-xs px-4 py-2.5 rounded-xl w-full transition-opacity hover:opacity-80"
                  style={{ border: '1px dashed rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.4)', backgroundColor: 'transparent', cursor: 'pointer' }}
                >
                  + {t('dashboard_new_listing')}
                </button>
              )}
            </div>

            {/* ── Ενδιαφερόμενοι ── */}
            {(receivedInterests ?? []).length > 0 && (
              <div>
                <h3 className="text-xs uppercase tracking-wider mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {t('dashboard_interested_parties')} ({receivedInterests!.length})
                </h3>
                <div className="space-y-2">
                  {receivedInterests!.map((interest: any) => {
                    const actor = interest.profiles
                    const listing = interest.listings
                    const initials = (actor?.display_name ?? '?').slice(0, 2).toUpperCase()
                    return (
                      <div key={interest.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: '#111120', border: '0.5px solid rgba(255,255,255,0.07)' }}>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold" style={{ backgroundColor: 'rgba(232,160,32,0.15)', color: '#E8A020' }}>
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white font-medium truncate">{actor?.display_name}</p>
                          <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.50)' }}>
                            {t('dashboard_interested_in')} «{listing?.title}»
                          </p>
                        </div>
                        <a
                          href={`/profile/${actor?.username}`}
                          target="_blank"
                          className="text-xs px-3 py-1.5 rounded-lg flex-shrink-0 transition-opacity hover:opacity-80"
                          style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}
                        >
                          {t('dashboard_profile_arrow')}
                        </a>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── Έχω εκφράσει ενδιαφέρον ── */}
            {(sentInterests ?? []).length > 0 && (
              <div>
                <h3 className="text-xs uppercase tracking-wider mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {t('dashboard_sent_interest_heading')} ({sentInterests!.length})
                </h3>
                <div className="space-y-2">
                  {sentInterests!.map((interest: any) => {
                    const listing = interest.listings
                    const owner = listing?.profiles
                    return (
                      <div key={interest.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: '#111120', border: '0.5px solid rgba(255,255,255,0.07)' }}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white font-medium truncate">{listing?.title}</p>
                          <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.50)' }}>
                            {listing?.role && <span>{listing.role} · </span>}
                            {owner?.display_name}
                          </p>
                        </div>
                        <span className="text-xs px-2 py-1 rounded-full flex-shrink-0" style={{ backgroundColor: 'rgba(232,160,32,0.1)', color: '#E8A020' }}>
                          {t('dashboard_sent_check')}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ TAB: VISIBILITY ══ */}
        {activeTab === 'visibility' && (
          <div className="max-w-xl space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white mb-1">{t('dashboard_section_visibility')}</h2>
              <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.50)' }}>
                {t('dashboard_visibility_desc')}
              </p>
            </div>
            {(VISIBILITY_SECTIONS[profile.profile_type] ?? []).map(section => (
              <div key={section} className="flex items-center justify-between p-4 rounded-xl" style={{ backgroundColor: '#111120', border: '0.5px solid rgba(255,255,255,0.07)' }}>
                <p className="text-sm text-white">{t(SECTION_LABEL_KEYS[section])}</p>
                <button
                  type="button"
                  onClick={() => toggleVisibility(section)}
                  className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0"
                  style={{ backgroundColor: form.section_visibility[section] !== false ? '#E8A020' : 'rgba(255,255,255,0.15)' }}
                >
                  <div className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all" style={{ left: form.section_visibility[section] !== false ? '24px' : '4px' }} />
                </button>
              </div>
            ))}
            <button
              onClick={handleSave}
              disabled={saving}
              className="mt-4 px-8 py-3 rounded-xl font-bold text-sm disabled:opacity-50"
              style={{ backgroundColor: '#E8A020', color: '#0F0F1A' }}
            >
              {saving ? t('dashboard_saving') : t('dashboard_save_changes')}
            </button>
            {saved && <span className="text-sm ml-3" style={{ color: '#4ade80' }}>{t('dashboard_saved')}</span>}
          </div>
        )}

        {/* ══ TAB: SETTINGS ══ */}
        {activeTab === 'settings' && (
          <div className="max-w-xl space-y-6">
            <h2 className="text-lg font-bold text-white">{t('dashboard_account_settings')}</h2>
            <div className="p-6 rounded-2xl space-y-4" style={{ backgroundColor: '#111120', border: '0.5px solid rgba(255,255,255,0.07)' }}>
              <div>
                <label className={labelClass}>{t('dashboard_username')}</label>
                <p className="text-sm text-white">@{profile.username}</p>
                <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>{t('dashboard_username_immutable')}</p>
              </div>
              <div>
                <label className={labelClass}>{t('dashboard_profile_type')}</label>
                <p className="text-sm text-white">{profileTypeLabel[profile.profile_type]}</p>
                <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>{t('dashboard_contact_support_role')}</p>
              </div>
              <div>
                <label className={labelClass}>{t('dashboard_account_status')}</label>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{
                    backgroundColor: profile.is_verified ? 'rgba(232,160,32,0.15)' : 'rgba(255,255,255,0.05)',
                    color: profile.is_verified ? '#E8A020' : 'rgba(255,255,255,0.4)',
                  }}>
                    {profile.is_verified ? t('dashboard_verified') : t('dashboard_not_verified')}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    color: 'rgba(255,255,255,0.4)',
                  }}>
                    {profile.plan_tier ?? 'free'} {t('dashboard_plan_suffix')}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl space-y-4" style={{ backgroundColor: '#111120', border: '0.5px solid rgba(255,255,255,0.07)' }}>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">{t('dashboard_change_password')}</h3>
              <ChangePasswordForm />
            </div>
          </div>
        )}

      </div>

      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}
    </div>
  )
}
