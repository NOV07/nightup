// Shared shape + column list for the network profile queries, so the category
// routes and the network landing page all select exactly the same fields.

export type NetworkTab = 'Artists' | 'Venues' | 'Professionals'

export const TAB_META: Record<NetworkTab, { emoji: string; label: string; slug: string }> = {
  Artists:       { emoji: '🎵', label: 'Artists',       slug: 'artists' },
  Venues:        { emoji: '🏛', label: 'Venues',        slug: 'venues' },
  Professionals: { emoji: '🤝', label: 'Professionals', slug: 'professionals' },
}

/** Legacy values profiles.price_range used to be restricted to when the
 *  Professional and Venue wizards offered €/€€/€€€ buttons. Both wizards now
 *  write free text instead (see price_text_label in translations.ts), so
 *  this is unused — kept only because old profiles still hold these values
 *  and nothing currently needs removing it. */
export const PRICE_RANGES = ['€', '€€', '€€€'] as const

export const PROFILE_COLUMNS =
  "id, username, display_name, avatar_url, avatar_crop_x, avatar_crop_y, avatar_crop_width, avatar_crop_height, bio, location, network_tab, network_category, network_subcategory, is_featured, is_verified"

export interface Profile {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  avatar_crop_x?: number | null
  avatar_crop_y?: number | null
  avatar_crop_width?: number | null
  avatar_crop_height?: number | null
  bio: string | null
  location: string | null
  network_tab: string | null
  network_category: string | null
  network_subcategory: string | null
  is_featured: boolean | null
  is_verified: boolean | null
}
