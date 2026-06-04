'use client'
import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import ImageUpload from '../../components/ui/ImageUpload'
import ChangePasswordForm from '@/components/auth/ChangePasswordForm'
import { NETWORK } from '../lib/searchData'

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
  professional: ['portfolio', 'testimonials', 'price_range', 'booking_availability'],
}

const SECTION_LABELS: Record<string, string> = {
  upcoming_events: 'Upcoming Events',
  featured_track: 'Featured Track',
  releases: 'Releases',
  mixes: 'Mixes',
  gallery: 'Gallery',
  announcements: 'Announcements',
  music_embed: 'Music / Sound Identity',
  booking_info: 'Booking Info',
  portfolio: 'Portfolio',
  testimonials: 'Testimonials',
  price_range: 'Price Range',
  booking_availability: 'Booking Availability',
}

type Tab = 'profile' | 'content' | 'visibility' | 'settings'

export default function DashboardClient({ profile, events, releases, professional }: {
  profile: any
  events: any[]
  releases: any[]
  professional: any
}) {
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const isPro = profile.profile_type === 'professional'

  const [activeTab, setActiveTab] = useState<Tab>('profile')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  // Shared profile form state (all user types)
  const [form, setForm] = useState({
    display_name: profile.display_name ?? '',
    bio: profile.bio ?? '',
    location: profile.location ?? '',
    avatar_url: profile.avatar_url ?? '',
    cover_url: profile.cover_url ?? '',
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

  // Pro-specific listing fields
  const [proForm, setProForm] = useState({
    category: professional?.category ?? '',
    availability: professional?.availability ?? 'available',
    tags: (professional?.tags ?? []).join(', '),
    email: professional?.email ?? '',
    phone: professional?.phone ?? '',
    website: professional?.website ?? '',
    instagram: professional?.instagram ?? '',
    facebook: professional?.facebook ?? '',
    tiktok: professional?.tiktok ?? '',
    youtube: professional?.youtube ?? '',
    soundcloud: professional?.soundcloud ?? '',
    spotify: professional?.spotify ?? '',
    gallery: (professional?.gallery ?? []) as string[],
    status: professional?.status ?? 'pending',
  })

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

  // Pro profile save — updates profiles + upserts professionals in parallel
  async function handleProSave() {
    setSaving(true)
    setError('')
    setSaved(false)

    const tagsArray = proForm.tags
      ? proForm.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
      : []

    const [profileResult, proResult] = await Promise.all([
      supabase
        .from('profiles')
        .update({
          display_name: form.display_name,
          bio: form.bio,
          location: form.location,
          avatar_url: form.avatar_url || null,
          cover_url: form.cover_url || null,
          network_tab: 'Plan Your Event',
          network_category: form.network_category || null,
          network_subcategory: form.network_subcategory || null,
        })
        .eq('id', profile.id),
      supabase
        .from('professionals')
        .upsert({
          profile_id: profile.id,
          name: form.display_name,
          description: form.bio,
          city: form.location,
          category: form.network_category || proForm.category,
          availability: proForm.availability,
          tags: tagsArray,
          email: proForm.email,
          phone: proForm.phone,
          website: proForm.website,
          instagram: proForm.instagram,
          facebook: proForm.facebook,
          tiktok: proForm.tiktok,
          youtube: proForm.youtube,
          soundcloud: proForm.soundcloud,
          spotify: proForm.spotify,
          gallery: proForm.gallery ?? [],
          status: proForm.status === 'approved' ? 'approved' : 'pending',
        }, { onConflict: 'profile_id' }),
    ])

    setSaving(false)
    const err = profileResult.error || proResult.error
    if (err) {
      setError(err.message)
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      router.refresh()
    }
  }

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-[#E8A020] text-sm"
  const labelClass = "text-white/50 text-xs mb-1.5 block uppercase tracking-wider"

  const profileTypeLabel: Record<string, string> = {
    user: 'Μέλος',
    organizer: 'Organizer',
    artist: 'Artist / DJ',
    venue: 'Venue',
    professional: 'Professional',
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'profile', label: 'Profile' },
    ...(!isPro ? [{ key: 'content' as Tab, label: 'Content' }] : []),
    { key: 'visibility', label: 'Visibility' },
    { key: 'settings', label: 'Settings' },
  ]

  const submitLink: Record<string, { href: string; label: string }> = {
    organizer: { href: '/dashboard/events/new', label: '+ New Event' },
    artist: { href: '/submit/release', label: '+ New Release' },
    venue: { href: '/dashboard/events/new', label: '+ New Event' },
  }

  const saveButton = (onClick: () => void) => (
    <div className="flex items-center gap-3">
      <button
        onClick={onClick}
        disabled={saving}
        className="px-8 py-3 rounded-xl font-bold text-sm transition-opacity disabled:opacity-50"
        style={{ backgroundColor: '#E8A020', color: '#0F0F1A' }}
      >
        {saving ? 'Saving...' : 'Save Profile'}
      </button>
      {saved && <span className="text-sm" style={{ color: '#4ade80' }}>✓ Saved!</span>}
      {error && <span className="text-sm text-red-400">{error}</span>}
    </div>
  )

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0F0F1A' }}>

      {/* Top bar */}
      <div className="border-b" style={{ borderColor: 'rgba(255,255,255,0.06)', backgroundColor: 'rgba(15,15,26,0.95)' }}>
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {form.avatar_url ? (
              <div className="relative w-9 h-9 rounded-xl overflow-hidden flex-shrink-0" style={{ border: '2px solid #E8A020' }}>
                <Image src={form.avatar_url} alt={form.display_name} fill className="object-cover" />
              </div>
            ) : (
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold" style={{ backgroundColor: '#1A1A2E', border: '2px solid #E8A020', color: '#E8A020' }}>
                {form.display_name[0]?.toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-white text-sm font-medium">{form.display_name}</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>@{profile.username} · {profileTypeLabel[profile.profile_type]}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/profile/${profile.username}`}
              target="_blank"
              className="text-xs px-3 py-2 rounded-lg transition-opacity hover:opacity-80"
              style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}
            >
              View Profile ↗
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

        {/* Upgrade banner — user tier only */}
        {profile.profile_type === 'user' && (
          <div className="max-w-6xl mx-auto px-4 py-2.5">
            <div className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl" style={{ backgroundColor: '#0F0F1A', border: '1px solid rgba(232,160,32,0.35)' }}>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>
                <span style={{ color: '#E8A020', fontWeight: 600 }}>Γίνε Creator</span> — Submit events, network profile, releases
              </p>
              <button
                onClick={() => {}}
                className="flex-shrink-0 text-xs font-bold px-4 py-2 rounded-lg transition-opacity hover:opacity-80"
                style={{ backgroundColor: '#E8A020', color: '#0F0F1A' }}
              >
                Upgrade
              </button>
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

              {/* Photos */}
              <div className="p-6 rounded-2xl space-y-5" style={{ backgroundColor: '#111120', border: '0.5px solid rgba(255,255,255,0.07)' }}>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Photos</h2>
                <div>
                  <label className={labelClass}>Banner Photo</label>
                  <ImageUpload
                    folder="banners"
                    onUpload={(url) => setForm(prev => ({ ...prev, cover_url: url }))}
                    existingUrl={form.cover_url}
                  />
                </div>
                <div>
                  <label className={labelClass}>Profile Photo</label>
                  <ImageUpload
                    folder="avatars"
                    onUpload={(url) => setForm(prev => ({ ...prev, avatar_url: url }))}
                    existingUrl={form.avatar_url}
                  />
                </div>
              </div>

              {/* Basic Info */}
              <div className="p-6 rounded-2xl space-y-4" style={{ backgroundColor: '#111120', border: '0.5px solid rgba(255,255,255,0.07)' }}>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Basic Info</h2>
                <div>
                  <label className={labelClass}>Display Name</label>
                  <input name="display_name" value={form.display_name} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Bio</label>
                  <textarea name="bio" value={form.bio} onChange={handleChange} rows={4} placeholder="Tell your story..." className={`${inputClass} resize-none`} />
                </div>
                <div>
                  <label className={labelClass}>City</label>
                  <input name="location" value={form.location} onChange={handleChange} placeholder="e.g. Athens" className={inputClass} />
                </div>
                {/* Network Listing — professional */}
                <div className="space-y-3">
                  <label className={labelClass}>Network Listing</label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-3 py-1.5 rounded-full" style={{ backgroundColor: 'rgba(232,160,32,0.12)', border: '0.5px solid rgba(232,160,32,0.3)', color: '#E8A020' }}>
                      Plan Your Event
                    </span>
                  </div>
                  <div>
                    <label className={labelClass}>Category</label>
                    <select
                      value={form.network_category}
                      onChange={e => setForm(p => ({ ...p, network_category: e.target.value, network_subcategory: '' }))}
                      className={inputClass}
                      style={{ backgroundColor: 'rgba(255,255,255,0.05)', colorScheme: 'dark' }}
                    >
                      <option value="">Select category</option>
                      {Object.keys(NETWORK['Plan Your Event'])
                        .filter(c => c !== 'Venues' && c !== 'Music & Artists')
                        .map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  {form.network_category && (
                    <div>
                      <label className={labelClass}>Specialization</label>
                      <select
                        value={form.network_subcategory}
                        onChange={e => setForm(p => ({ ...p, network_subcategory: e.target.value }))}
                        className={inputClass}
                        style={{ backgroundColor: 'rgba(255,255,255,0.05)', colorScheme: 'dark' }}
                      >
                        <option value="">Select specialization</option>
                        {((NETWORK['Plan Your Event'] as Record<string, string[]>)[form.network_category] ?? []).map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.07)' }}>
                  <div>
                    <p className="text-sm text-white font-medium">Available for booking</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Show availability status on your profile</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setProForm(p => ({ ...p, availability: p.availability === 'available' ? 'busy' : 'available' }))}
                    className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0"
                    style={{ backgroundColor: proForm.availability === 'available' ? '#E8A020' : 'rgba(255,255,255,0.15)' }}
                  >
                    <div className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all" style={{ left: proForm.availability === 'available' ? '24px' : '4px' }} />
                  </button>
                </div>
                <div>
                  <label className={labelClass}>Tags (comma-separated)</label>
                  <input
                    value={proForm.tags}
                    onChange={e => setProForm(p => ({ ...p, tags: e.target.value }))}
                    placeholder="e.g. photographer, events, Athens"
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Contact */}
              <div className="p-6 rounded-2xl space-y-4" style={{ backgroundColor: '#111120', border: '0.5px solid rgba(255,255,255,0.07)' }}>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Contact</h2>
                <div>
                  <label className={labelClass}>Email</label>
                  <input type="email" value={proForm.email} onChange={e => setProForm(p => ({ ...p, email: e.target.value }))} placeholder="booking@..." className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Phone</label>
                  <input type="tel" value={proForm.phone} onChange={e => setProForm(p => ({ ...p, phone: e.target.value }))} placeholder="+30 69..." className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Website</label>
                  <input type="url" value={proForm.website} onChange={e => setProForm(p => ({ ...p, website: e.target.value }))} placeholder="https://..." className={inputClass} />
                </div>
              </div>

              {/* Social Links */}
              <div className="p-6 rounded-2xl space-y-4" style={{ backgroundColor: '#111120', border: '0.5px solid rgba(255,255,255,0.07)' }}>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Social Links</h2>
                {[
                  { key: 'instagram', label: 'Instagram', placeholder: '@handle' },
                  { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/...' },
                  { key: 'tiktok', label: 'TikTok', placeholder: '@handle' },
                  { key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/...' },
                  { key: 'soundcloud', label: 'SoundCloud', placeholder: 'https://soundcloud.com/...' },
                  { key: 'spotify', label: 'Spotify', placeholder: 'https://open.spotify.com/...' },
                ].map(f => (
                  <div key={f.key}>
                    <label className={labelClass}>{f.label}</label>
                    <input
                      value={(proForm as any)[f.key] ?? ''}
                      onChange={e => setProForm(p => ({ ...p, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className={inputClass}
                    />
                  </div>
                ))}
              </div>

              {/* Gallery */}
              <div className="p-6 rounded-2xl space-y-4" style={{ backgroundColor: '#111120', border: '0.5px solid rgba(255,255,255,0.07)' }}>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Gallery</h2>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Add up to 10 photos to showcase your work</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {proForm.gallery.map((url, i) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden group" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.1)' }}>
                      <Image src={url} alt={`Gallery ${i + 1}`} fill className="object-cover" />
                      <button
                        type="button"
                        onClick={() => setProForm(p => ({ ...p, gallery: p.gallery.filter((_, idx) => idx !== i) }))}
                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ backgroundColor: 'rgba(0,0,0,0.7)', color: 'white' }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {proForm.gallery.length < 10 && (
                    <div className="aspect-square rounded-xl overflow-hidden" style={{ border: '0.5px dashed rgba(255,255,255,0.15)' }}>
                      <ImageUpload
                        folder="professionals"
                        onUpload={(url) => setProForm(p => ({ ...p, gallery: [...p.gallery, url] }))}
                      />
                    </div>
                  )}
                </div>
              </div>

              {saveButton(handleProSave)}
            </div>

            {/* Profile Preview */}
            <div className="hidden lg:block">
              <div className="sticky top-6">
                <p className="text-xs uppercase tracking-wider mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>Profile Preview</p>
                <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#0a0a14', border: '0.5px solid rgba(255,255,255,0.08)' }}>
                  <div className="relative h-24" style={{ backgroundColor: '#1a1a2e' }}>
                    {form.cover_url && <Image src={form.cover_url} alt="Banner" fill className="object-cover" />}
                  </div>
                  <div className="px-4 pb-4">
                    <div className="relative -mt-8 mb-3 w-16 h-16 rounded-xl overflow-hidden flex-shrink-0" style={{ border: '2px solid #E8A020', backgroundColor: '#1A1A2E' }}>
                      {form.avatar_url ? (
                        <Image src={form.avatar_url} alt={form.display_name} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl font-bold" style={{ color: '#E8A020' }}>
                          {form.display_name[0]?.toUpperCase()}
                        </div>
                      )}
                    </div>
                    <p className="font-bold text-white text-sm">{form.display_name || 'Display Name'}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>@{profile.username}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {(form.network_category || proForm.category) && (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.45)' }}>
                          {form.network_category || proForm.category}
                        </span>
                      )}
                      {form.location && (
                        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>📍 {form.location}</span>
                      )}
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{
                        backgroundColor: proForm.availability === 'available' ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.05)',
                        color: proForm.availability === 'available' ? '#4ade80' : 'rgba(255,255,255,0.3)',
                      }}>
                        {proForm.availability === 'available' ? '● Available' : '○ Busy'}
                      </span>
                    </div>
                    {form.bio && (
                      <p className="text-xs mt-3 leading-relaxed line-clamp-3" style={{ color: 'rgba(255,255,255,0.5)' }}>{form.bio}</p>
                    )}
                  </div>
                </div>
                <Link
                  href={`/profile/${profile.username}`}
                  target="_blank"
                  className="mt-3 block text-center text-xs py-2.5 rounded-xl transition-opacity hover:opacity-80"
                  style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}
                >
                  View Full Profile ↗
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ══ TAB: PROFILE (non-professional) ══ */}
        {activeTab === 'profile' && !isPro && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">

            {/* Edit Panel */}
            <div className="space-y-8">

              {/* Photos */}
              <div className="p-6 rounded-2xl space-y-5" style={{ backgroundColor: '#111120', border: '0.5px solid rgba(255,255,255,0.07)' }}>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Photos</h2>
                <div>
                  <label className={labelClass}>Banner Photo</label>
                  <ImageUpload
                    folder="banners"
                    onUpload={(url) => setForm(prev => ({ ...prev, cover_url: url }))}
                    existingUrl={form.cover_url}
                  />
                </div>
                <div>
                  <label className={labelClass}>Profile Photo</label>
                  <ImageUpload
                    folder="avatars"
                    onUpload={(url) => setForm(prev => ({ ...prev, avatar_url: url }))}
                    existingUrl={form.avatar_url}
                  />
                </div>
              </div>

              {/* Basic Info */}
              <div className="p-6 rounded-2xl space-y-4" style={{ backgroundColor: '#111120', border: '0.5px solid rgba(255,255,255,0.07)' }}>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Basic Info</h2>
                <div>
                  <label className={labelClass}>Display Name</label>
                  <input name="display_name" value={form.display_name} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Bio</label>
                  <textarea name="bio" value={form.bio} onChange={handleChange} rows={4} placeholder="Tell your story..." className={`${inputClass} resize-none`} />
                </div>
                <div>
                  <label className={labelClass}>City / Location</label>
                  <input name="location" value={form.location} onChange={handleChange} placeholder="e.g. Athens, Greece" className={inputClass} />
                </div>

                {/* Availability */}
                <div className="flex items-center justify-between p-4 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.07)' }}>
                  <div>
                    <p className="text-sm text-white font-medium">Available for booking</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Show availability status on your profile</p>
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

                {/* Network Listing — venue */}
                {profile.profile_type === 'venue' && (
                  <div className="space-y-3">
                    <label className={labelClass}>Network Listing</label>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs px-3 py-1.5 rounded-full" style={{ backgroundColor: 'rgba(232,160,32,0.12)', border: '0.5px solid rgba(232,160,32,0.3)', color: '#E8A020' }}>
                        Plan Your Event
                      </span>
                      <span className="text-xs px-3 py-1.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: '0.5px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.55)' }}>
                        Venues
                      </span>
                    </div>
                    <div>
                      <label className={labelClass}>What type of venue?</label>
                      <select
                        value={form.network_subcategory}
                        onChange={e => setForm(p => ({ ...p, network_tab: 'Plan Your Event', network_category: 'Venues', network_subcategory: e.target.value }))}
                        className={inputClass}
                        style={{ backgroundColor: 'rgba(255,255,255,0.05)', colorScheme: 'dark' }}
                      >
                        <option value="">Select venue type</option>
                        {NETWORK['Plan Your Event']['Venues'].map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Network Listing — artist */}
                {profile.profile_type === 'artist' && (
                  <div className="space-y-3">
                    <label className={labelClass}>Network Listing</label>
                    <div className="flex gap-2">
                      {(['Plan Your Event', 'For Artists'] as const).map(tab => (
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
                          {tab}
                        </button>
                      ))}
                    </div>

                    {form.network_tab === 'Plan Your Event' && (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-3 py-1.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: '0.5px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.55)' }}>
                            Music & Artists
                          </span>
                        </div>
                        <div>
                          <label className={labelClass}>Role</label>
                          <select
                            value={form.network_subcategory}
                            onChange={e => setForm(p => ({ ...p, network_category: 'Music & Artists', network_subcategory: e.target.value }))}
                            className={inputClass}
                            style={{ backgroundColor: 'rgba(255,255,255,0.05)', colorScheme: 'dark' }}
                          >
                            <option value="">Select role</option>
                            {NETWORK['Plan Your Event']['Music & Artists'].map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}

                    {form.network_tab === 'For Artists' && (
                      <>
                        <div>
                          <label className={labelClass}>Category</label>
                          <select
                            value={form.network_category}
                            onChange={e => setForm(p => ({ ...p, network_category: e.target.value, network_subcategory: '' }))}
                            className={inputClass}
                            style={{ backgroundColor: 'rgba(255,255,255,0.05)', colorScheme: 'dark' }}
                          >
                            <option value="">Select category</option>
                            {Object.keys(NETWORK['For Artists']).map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>
                        {form.network_category && (
                          <div>
                            <label className={labelClass}>Specialization</label>
                            <select
                              value={form.network_subcategory}
                              onChange={e => setForm(p => ({ ...p, network_subcategory: e.target.value }))}
                              className={inputClass}
                              style={{ backgroundColor: 'rgba(255,255,255,0.05)', colorScheme: 'dark' }}
                            >
                              <option value="">Select specialization</option>
                              {((NETWORK['For Artists'] as Record<string, string[]>)[form.network_category] ?? []).map(s => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Genres — artists */}
                {profile.profile_type === 'artist' && (
                  <div>
                    <label className={labelClass}>Genres</label>
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
                    <label className={labelClass}>Featured Track URL (SoundCloud or Spotify)</label>
                    <input name="featured_track_url" value={form.featured_track_url} onChange={handleChange} placeholder="https://soundcloud.com/..." className={inputClass} />
                  </div>
                )}

                {/* Booking info — organizers/venues */}
                {(profile.profile_type === 'organizer' || profile.profile_type === 'venue') && (
                  <div>
                    <label className={labelClass}>Booking Info</label>
                    <textarea name="booking_info" value={form.booking_info} onChange={handleChange} rows={3} placeholder="How to book your venue..." className={`${inputClass} resize-none`} />
                  </div>
                )}

                {/* Announcements — organizers/venues */}
                {(profile.profile_type === 'organizer' || profile.profile_type === 'venue') && (
                  <div>
                    <label className={labelClass}>Announcements</label>
                    <textarea name="announcements" value={form.announcements} onChange={handleChange} rows={3} placeholder="Any upcoming announcements..." className={`${inputClass} resize-none`} />
                  </div>
                )}
              </div>

              {/* Socials */}
              <div className="p-6 rounded-2xl space-y-4" style={{ backgroundColor: '#111120', border: '0.5px solid rgba(255,255,255,0.07)' }}>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Social Links</h2>
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

              {saveButton(handleSave)}
            </div>

            {/* Profile Preview */}
            <div className="hidden lg:block">
              <div className="sticky top-6">
                <p className="text-xs uppercase tracking-wider mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>Profile Preview</p>
                <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#0a0a14', border: '0.5px solid rgba(255,255,255,0.08)' }}>
                  <div className="relative h-24" style={{ backgroundColor: '#1a1a2e' }}>
                    {form.cover_url && <Image src={form.cover_url} alt="Banner" fill className="object-cover" />}
                  </div>
                  <div className="px-4 pb-4">
                    <div className="relative -mt-8 mb-3 w-16 h-16 rounded-xl overflow-hidden flex-shrink-0" style={{ border: '2px solid #E8A020', backgroundColor: '#1A1A2E' }}>
                      {form.avatar_url ? (
                        <Image src={form.avatar_url} alt={form.display_name} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl font-bold" style={{ color: '#E8A020' }}>
                          {form.display_name[0]?.toUpperCase()}
                        </div>
                      )}
                    </div>
                    <p className="font-bold text-white text-sm">{form.display_name || 'Display Name'}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>@{profile.username}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.45)' }}>
                        {profileTypeLabel[profile.profile_type]}
                      </span>
                      {form.location && (
                        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>📍 {form.location}</span>
                      )}
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{
                        backgroundColor: form.is_available ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.05)',
                        color: form.is_available ? '#4ade80' : 'rgba(255,255,255,0.3)',
                      }}>
                        {form.is_available ? '● Available' : '○ Not available'}
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
                  View Full Profile ↗
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ══ TAB: CONTENT (non-professional only) ══ */}
        {activeTab === 'content' && !isPro && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Your Content</h2>
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

            {/* Events */}
            {(profile.profile_type === 'organizer' || profile.profile_type === 'venue') && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>Events ({events.length})</h3>
                  <Link
                    href="/dashboard/events/new"
                    className="text-xs px-3 py-1.5 rounded-lg font-medium"
                    style={{ backgroundColor: '#E8A020', color: '#0F0F1A' }}
                  >
                    + Add Event
                  </Link>
                </div>
                {events.length === 0 ? (
                  <div className="p-8 rounded-2xl text-center" style={{ backgroundColor: '#111120', border: '0.5px solid rgba(255,255,255,0.07)' }}>
                    <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>No events yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {events.map((event: any) => (
                      <div key={event.id} className="flex items-center gap-4 p-4 rounded-xl" style={{ backgroundColor: '#111120', border: '0.5px solid rgba(255,255,255,0.07)' }}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{event.title}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{event.venue} · {event.date}</p>
                        </div>
                        <span className="text-xs px-2 py-1 rounded-full flex-shrink-0" style={{
                          backgroundColor: event.status === 'approved' ? 'rgba(74,222,128,0.1)' : 'rgba(232,160,32,0.1)',
                          color: event.status === 'approved' ? '#4ade80' : '#E8A020',
                        }}>
                          {event.status === 'approved' ? 'Live' : 'Pending'}
                        </span>
                        <Link
                          href={`/dashboard/edit/event/${event.id}`}
                          className="text-xs px-3 py-1.5 rounded-lg flex-shrink-0 transition-opacity hover:opacity-80"
                          style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}
                        >
                          Edit
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Releases */}
            {profile.profile_type === 'artist' && (
              <div>
                <h3 className="text-xs uppercase tracking-wider mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>Releases ({releases.length})</h3>
                {releases.length === 0 ? (
                  <div className="p-8 rounded-2xl text-center" style={{ backgroundColor: '#111120', border: '0.5px solid rgba(255,255,255,0.07)' }}>
                    <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>No releases yet.</p>
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
                            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{release.type}</p>
                            <span className="text-xs px-1.5 py-0.5 rounded-full" style={{
                              backgroundColor: release.status === 'approved' ? 'rgba(74,222,128,0.1)' : 'rgba(232,160,32,0.1)',
                              color: release.status === 'approved' ? '#4ade80' : '#E8A020',
                            }}>
                              {release.status === 'approved' ? 'Live' : 'Pending'}
                            </span>
                          </div>
                          <Link
                            href={`/dashboard/edit/release/${release.id}`}
                            className="mt-2 block w-full text-center text-xs py-1.5 rounded-lg transition-opacity hover:opacity-80"
                            style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}
                          >
                            Edit
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Consumer sections — user type */}
            {profile.profile_type === 'user' && (
              <div className="space-y-6">

                {/* Τελευταία βραδιά */}
                <div>
                  <h3 className="text-xs uppercase tracking-wider mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>Τελευταία βραδιά</h3>
                  <div className="p-8 rounded-2xl text-center space-y-2" style={{ backgroundColor: '#111120', border: '0.5px solid rgba(255,255,255,0.07)' }}>
                    <p className="text-2xl">🌙</p>
                    <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>Δεν έχεις φτιάξει βραδιά ακόμα</p>
                  </div>
                </div>

                {/* Saved spots */}
                <div>
                  <h3 className="text-xs uppercase tracking-wider mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>Saved spots</h3>
                  <div className="p-8 rounded-2xl text-center space-y-2" style={{ backgroundColor: '#111120', border: '0.5px solid rgba(255,255,255,0.07)' }}>
                    <p className="text-2xl">📍</p>
                    <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>Δεν έχεις αποθηκεύσει spots ακόμα</p>
                  </div>
                </div>

                {/* Saved events */}
                <div>
                  <h3 className="text-xs uppercase tracking-wider mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>Saved events</h3>
                  <div className="p-8 rounded-2xl text-center space-y-2" style={{ backgroundColor: '#111120', border: '0.5px solid rgba(255,255,255,0.07)' }}>
                    <p className="text-2xl">🎟️</p>
                    <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>Δεν έχεις αποθηκεύσει events ακόμα</p>
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

        {/* ══ TAB: VISIBILITY ══ */}
        {activeTab === 'visibility' && (
          <div className="max-w-xl space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white mb-1">Section Visibility</h2>
              <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.35)' }}>
                Control which sections appear on your public profile. Sections with no data are always hidden.
              </p>
            </div>
            {(VISIBILITY_SECTIONS[profile.profile_type] ?? []).map(section => (
              <div key={section} className="flex items-center justify-between p-4 rounded-xl" style={{ backgroundColor: '#111120', border: '0.5px solid rgba(255,255,255,0.07)' }}>
                <p className="text-sm text-white">{SECTION_LABELS[section]}</p>
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
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            {saved && <span className="text-sm ml-3" style={{ color: '#4ade80' }}>✓ Saved!</span>}
          </div>
        )}

        {/* ══ TAB: SETTINGS ══ */}
        {activeTab === 'settings' && (
          <div className="max-w-xl space-y-6">
            <h2 className="text-lg font-bold text-white">Account Settings</h2>
            <div className="p-6 rounded-2xl space-y-4" style={{ backgroundColor: '#111120', border: '0.5px solid rgba(255,255,255,0.07)' }}>
              <div>
                <label className={labelClass}>Username</label>
                <p className="text-sm text-white">@{profile.username}</p>
                <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Username cannot be changed</p>
              </div>
              <div>
                <label className={labelClass}>Profile Type</label>
                <p className="text-sm text-white">{profileTypeLabel[profile.profile_type]}</p>
                <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>To change your role, contact support</p>
              </div>
              <div>
                <label className={labelClass}>Account Status</label>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{
                    backgroundColor: profile.is_verified ? 'rgba(232,160,32,0.15)' : 'rgba(255,255,255,0.05)',
                    color: profile.is_verified ? '#E8A020' : 'rgba(255,255,255,0.4)',
                  }}>
                    {profile.is_verified ? '✓ Verified' : 'Not verified'}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    color: 'rgba(255,255,255,0.4)',
                  }}>
                    {profile.plan_tier ?? 'free'} plan
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl space-y-4" style={{ backgroundColor: '#111120', border: '0.5px solid rgba(255,255,255,0.07)' }}>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Change Password</h3>
              <ChangePasswordForm />
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
