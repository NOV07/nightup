import { spotCropFromRow, type Spot } from "./types";
import { toGalleryItems } from "../lib/types";
import { spotCategoriesOf, spotSubcategoriesOf, primaryCategory } from "../lib/spotCategories";

/**
 * The one column list and row mapper for spot reads. Every page that lists or
 * shows a spot (/spots, the Tonight modal, the spot page, search, build-night)
 * goes through this, so a new column is added in one place.
 */
export const SPOT_COLS =
  "id, name, slug, category, subcategory, categories, subcategories, city, neighborhood, address, lat, lng, description, cover_image, crop_x, crop_y, crop_width, crop_height, price_level, price_text, rating, instagram, is_sponsored, featured";

/** Extra columns the single-spot page needs on top of SPOT_COLS. */
export const SPOT_PAGE_COLS = `${SPOT_COLS}, gallery, phone, website, opening_hours, owner_id`;

/** Works for table rows and for spots_nearby() RPC rows (fewer columns). */
export function mapSpot(s: any): Spot {
  const categories = spotCategoriesOf(s);
  return {
    id: String(s.id),
    name: s.name,
    slug: s.slug,
    // Primary category; 'drink' only if a row has no valid category at all.
    category: primaryCategory({ categories, category: s.category }) ?? "drink",
    categories,
    subcategories: spotSubcategoriesOf(s),
    city: s.city,
    neighborhood: s.neighborhood,
    address: s.address,
    lat: s.lat,
    lng: s.lng,
    description: s.description,
    coverImage: s.cover_image,
    crop: spotCropFromRow(s),
    priceLevel: s.price_level,
    priceText: s.price_text ?? null,
    rating: s.rating,
    instagram: s.instagram,
    isSponsored: s.is_sponsored === true,
    featured: s.featured === true,
  };
}

/** mapSpot plus the columns of SPOT_PAGE_COLS. */
export function mapSpotPage(s: any) {
  return {
    ...mapSpot(s),
    phone: s.phone,
    website: s.website,
    ownerId: s.owner_id ?? null,
    gallery: toGalleryItems(s.gallery),
    openingHours: (s.opening_hours ?? null) as Record<string, string> | null,
  };
}
