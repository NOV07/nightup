import type { CropBox } from '../../components/ui/CroppedImage';
import type { GalleryItem } from '../lib/types';
import type { SpotCategory } from '../lib/spotCategories.ts';

/** Missing on rows returned by the spots_nearby() PostGIS RPC (its column
 *  list is fixed in the SQL function) — those spots render without a crop. */
export function spotCropFromRow(row: { crop_x?: number | null; crop_y?: number | null; crop_width?: number | null; crop_height?: number | null }): CropBox | null {
  if (row.crop_x == null || row.crop_y == null || row.crop_width == null || row.crop_height == null) return null;
  return { crop_x: row.crop_x, crop_y: row.crop_y, crop_width: row.crop_width, crop_height: row.crop_height };
}

/** Aspect every spot cover is cropped to, in the admin panel and the wizard alike. */
export const SPOT_CROP_ASPECT = 16 / 9;

export interface Spot {
  id: string;
  name: string;
  slug: string;
  /** Primary category (icon + card): the first of `categories`. */
  category: SpotCategory;
  /** Up to 3 categories, primary first. The spot shows in every one of them. */
  categories: SpotCategory[];
  /** Up to 3 subcategory keys (see app/lib/spotCategories.ts). */
  subcategories: string[];
  city: string;
  neighborhood: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  description: string | null;
  coverImage: string | null;
  crop?: CropBox | null;
  priceLevel: number | null;
  /** Free text per person, e.g. "15–30€". Absent on spots_nearby() RPC rows. */
  priceText: string | null;
  rating: number | null;
  phone?: string | null;
  website?: string | null;
  instagram: string | null;
  isSponsored: boolean;
  /** Account that owns the spot (spots.owner_id). Null for admin-added spots. */
  ownerId?: string | null;
  featured?: boolean;
  gallery?: GalleryItem[];
  openingHours?: Record<string, string> | null;
}

/** "{price_text} / άτομο" when the spot has a free-text price, otherwise the
 *  legacy "€".repeat(price_level). `perPerson` is t('spots_price_per_person'). */
export function spotPriceLabel(spot: Pick<Spot, 'priceText' | 'priceLevel'>, perPerson: string): string | null {
  const text = spot.priceText?.trim();
  if (text) return `${text} ${perPerson}`;
  return spot.priceLevel ? '€'.repeat(spot.priceLevel) : null;
}

/** Pick the Greek or English variant of a hardcoded label pair. */
export function loc(lang: string, el: string, en: string): string {
  return lang === 'en' ? en : el;
}

export const MOODS = [
  { key: 'chill', emoji: '😌', label: 'Χαλαρά',      label_en: 'Chill',               desc: 'low key vibes',        desc_en: 'low key vibes' },
  { key: 'wild',  emoji: '🔥', label: 'Έξαλλα',      label_en: 'Wild',                desc: 'non stop μέχρι πρωί',  desc_en: 'non stop till morning' },
  { key: 'food',  emoji: '🍽',  label: 'Φαγητό',      label_en: 'Food',                desc: 'foodie night',         desc_en: 'foodie night' },
  { key: 'diff',  emoji: '🎭', label: 'Κάτι αλλιώς', label_en: 'Something different', desc: 'κάτι διαφορετικό',     desc_en: 'a different kind of night' },
] as const;
