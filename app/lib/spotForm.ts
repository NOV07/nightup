import { deserializeOpeningHours, type SpotFormData } from '@/components/spots/SpotFormSteps'
import { toGalleryItems } from '@/app/lib/types'
import { spotCategoriesOf, spotSubcategoriesOf } from '@/app/lib/spotCategories'

/** The stored row, back into the wizard's state shape. */
export function spotToForm(spot: any): Partial<SpotFormData> {
  const hasCrop = spot.crop_x != null && spot.crop_y != null && spot.crop_width != null && spot.crop_height != null
  return {
    name: spot.name ?? '',
    categories: spotCategoriesOf(spot),
    subcategories: spotSubcategoriesOf(spot),
    city: spot.city ?? '',
    neighborhood: spot.neighborhood ?? '',
    address: spot.address ?? '',
    // The pasted URL is not stored. The pin loads from lat/lng, and the link
    // field stays empty unless the owner pastes a new one.
    maps_url: '',
    lat: spot.lat ?? null,
    lng: spot.lng ?? null,
    cover_image: spot.cover_image ?? '',
    crop: hasCrop
      ? { crop_x: spot.crop_x, crop_y: spot.crop_y, crop_width: spot.crop_width, crop_height: spot.crop_height }
      : null,
    gallery: toGalleryItems(spot.gallery),
    opening_hours: deserializeOpeningHours(spot.opening_hours),
    phone: spot.phone ?? '',
    website: spot.website ?? '',
    instagram: spot.instagram ?? '',
    price_level: spot.price_level ?? 0,
    price_text: spot.price_text ?? '',
    description: spot.description ?? '',
  }
}
