// Hand-maintained types — no Supabase CLI generation is set up in this project.
// Update these when adding or removing columns.

export type ProfileType = 'organizer' | 'artist' | 'professional' | 'venue'

export type NetworkTab = 'Plan Your Event' | 'For Artists'

export interface Profile {
  // ── core (always populated, set at onboarding) ──
  id: string
  username: string
  display_name: string
  profile_type: ProfileType
  created_at: string

  // ── onboarding optional ──
  bio: string | null
  instagram: string | null
  avatar_url: string | null

  // ── dashboard-editable ──
  cover_url: string | null
  location: string | null
  facebook: string | null
  tiktok: string | null
  soundcloud_url: string | null
  spotify_url: string | null
  bandcamp_url: string | null
  apple_music_url: string | null
  youtube_url: string | null
  beatport_url: string | null
  mixcloud_url: string | null
  website: string | null
  booking_email: string | null
  featured_track_url: string | null
  is_available: boolean | null
  price_range: string | null
  booking_info: string | null
  announcements: string | null
  genres: string[] | null
  services: string[] | null
  section_visibility: Record<string, boolean> | null

  // ── network taxonomy (Phase 1 — nullable until set in dashboard Phase 2) ──
  network_tab: NetworkTab | null
  network_category: string | null
  network_subcategory: string | null

  // ── admin-set ──
  is_verified: boolean
  is_featured: boolean
  plan_tier: string | null
}

export interface Professional {
  id: string
  profile_id: string
  name: string
  category: string | null
  city: string | null
  description: string | null
  tags: string[] | null
  gallery: string[] | null
  image_url: string | null
  availability: 'available' | 'busy' | null
  email: string | null
  phone: string | null
  instagram: string | null
  facebook: string | null
  tiktok: string | null
  youtube: string | null
  soundcloud: string | null
  spotify: string | null
  website: string | null
  featured: boolean
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}
