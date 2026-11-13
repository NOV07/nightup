import type { Spot } from '../spots/types'
import type { GalleryItem } from './types'
import type { CropBox } from '../../components/ui/CroppedImage'
import { getCoverCrop } from './profileCrop'

/** The shape SpotProfileClient takes. */
export type VenueSpotView = Spot & { gallery: GalleryItem[]; openingHours: Record<string, string> | null }

const isPlaceholder = (url: string) => url.includes('picsum') || url.includes('pravatar')

/**
 * A venue profile (profiles row, profile_type = 'venue') in the shape the spot
 * page renders, so /profile/[username] can reuse SpotProfileClient. Display only:
 * a venue is never written to `spots`. Every field is '', [] or null when the
 * row lacks it, never undefined. Hours and gallery stay empty here: the profile
 * has no opening hours, and its gallery renders below the component.
 */
export function venueAsSpot(p: any): VenueSpotView {
  const coverUrl: string | null = p?.cover_url && !isPlaceholder(p.cover_url) ? p.cover_url : null
  const crop: CropBox | null = coverUrl ? getCoverCrop(p) : null
  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)
  const city = str(p?.location) ?? ''
  const place = [str(p?.venue_neighborhood), city].filter(Boolean).join(', ')
  const name = str(p?.display_name) ?? str(p?.username) ?? ''

  return {
    id: String(p?.id ?? ''),
    name,
    slug: str(p?.username) ?? '',
    category: 'drink', // required by the type, never shown: the venue passes kind="venue"
    categories: [],
    subcategories: [],
    city,
    neighborhood: place || null,
    address: str(p?.venue_address),
    lat: null,
    lng: null,
    description: str(p?.bio),
    coverImage: coverUrl,
    crop,
    priceLevel: null,
    priceText: str(p?.price_range),
    rating: null,
    phone: str(p?.phone),
    website: str(p?.website),
    instagram: str(p?.instagram),
    isSponsored: false,
    ownerId: str(p?.id),
    gallery: [],
    openingHours: null,
  }
}
