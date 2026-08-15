// Hand-maintained types — no Supabase CLI generation is set up in this project.
// Update these when adding or removing columns.

export type ProfileType = 'user' | 'organizer' | 'artist' | 'professional' | 'venue' | 'spot'

/** One entry in a gallery. Galleries used to be plain URL strings; they now
 *  carry a media type so a clip can render as a real <video> in the lightbox.
 *  `poster` is a still frame captured client-side at upload, used for the grid
 *  thumbnail (video items never autoplay outside the lightbox). */
export type GalleryItem = { url: string; type: 'image' | 'video'; poster?: string }

/** Normalises one stored entry. Rows written before the media-type migration
 *  are bare strings, and the migration is applied by hand — so every read path
 *  goes through this rather than assuming the new shape. */
export function toGalleryItem(raw: unknown): GalleryItem | null {
  if (typeof raw === 'string') return raw ? { url: raw, type: 'image' } : null
  if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>
    if (typeof o.url === 'string' && o.url) {
      return {
        url: o.url,
        type: o.type === 'video' ? 'video' : 'image',
        ...(typeof o.poster === 'string' && o.poster ? { poster: o.poster } : {}),
      }
    }
  }
  return null
}

export function toGalleryItems(raw: unknown): GalleryItem[] {
  if (!Array.isArray(raw)) return []
  return raw.map(toGalleryItem).filter((i): i is GalleryItem => i !== null)
}

// The values actually stored in profiles.network_tab and filtered on by the
// /network/* pages. (This previously read 'Plan Your Event' | 'For Artists',
// neither of which exists in the column.)
export type NetworkTab = 'Artists' | 'Professionals' | 'Venues'

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
  avatar_crop_x: number | null
  avatar_crop_y: number | null
  avatar_crop_width: number | null
  avatar_crop_height: number | null
  cover_crop_x: number | null
  cover_crop_y: number | null
  cover_crop_width: number | null
  cover_crop_height: number | null
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
  phone: string | null
  featured_track_url: string | null
  is_available: boolean | null
  price_range: string | null
  booking_info: string | null
  announcements: string | null
  genres: string[] | null
  services: string[] | null
  tags: string[] | null
  section_visibility: Record<string, boolean> | null

  // ── network taxonomy (Phase 1 — nullable until set in dashboard Phase 2) ──
  network_tab: NetworkTab | null
  network_category: string | null
  network_subcategory: string | null

  // ── admin-set ──
  is_verified: boolean
  is_featured: boolean
  plan_tier: string | null
  professional_status: string | null
}

export interface SavedEvent {
  id: string
  user_id: string
  event_id: string
  created_at: string
}

export interface SavedSpot {
  id: string
  user_id: string
  spot_id: string
  created_at: string
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
