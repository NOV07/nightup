import type { CropBox } from '../../components/ui/CroppedImage';
import type { GalleryItem } from '../lib/types';

/** Missing on rows returned by the spots_nearby() PostGIS RPC (its column
 *  list is fixed in the SQL function) — those spots render without a crop. */
export function spotCropFromRow(row: { crop_x?: number | null; crop_y?: number | null; crop_width?: number | null; crop_height?: number | null }): CropBox | null {
  if (row.crop_x == null || row.crop_y == null || row.crop_width == null || row.crop_height == null) return null;
  return { crop_x: row.crop_x, crop_y: row.crop_y, crop_width: row.crop_width, crop_height: row.crop_height };
}

export type SpotCategory = 'food' | 'drink' | 'nightlife' | 'show' | 'chill' | 'activity' | 'art' | 'wellness';

/** Aspect every spot cover is cropped to, in the admin panel and the wizard alike. */
export const SPOT_CROP_ASPECT = 16 / 9;

export interface Spot {
  id: string;
  name: string;
  slug: string;
  category: SpotCategory;
  subcategory: string | null;
  city: string;
  neighborhood: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  description: string | null;
  coverImage: string | null;
  crop?: CropBox | null;
  priceLevel: number | null;
  rating: number | null;
  phone?: string | null;
  website?: string | null;
  instagram: string | null;
  isSponsored: boolean;
  claimedByProfileId: string | null;
  featured?: boolean;
  gallery?: GalleryItem[];
  openingHours?: Record<string, string> | null;
}

/** Pick the Greek or English variant of a hardcoded label pair. */
export function loc(lang: string, el: string, en: string): string {
  return lang === 'en' ? en : el;
}

export const SPOT_CATEGORIES: {
  key: SpotCategory; emoji: string; label: string; label_en: string; sub: string; sub_en: string;
}[] = [
  { key: 'drink',     emoji: '🍸', label: 'Ποτό',              label_en: 'Drinks',        sub: 'cocktails · rooftop bar · wine & spirits · μπύρα', sub_en: 'cocktails · rooftop bar · wine & spirits · beer' },
  { key: 'food',      emoji: '🍽',  label: 'Φαγητό',            label_en: 'Food',          sub: 'street food · κινέζικο · brunch', sub_en: 'street food · chinese · brunch' },
  { key: 'nightlife', emoji: '🎵', label: 'Νύχτα',             label_en: 'Nightlife',     sub: 'club · bar hopping · live music', sub_en: 'club · bar hopping · live music' },
  { key: 'show',      emoji: '🎬', label: 'Διασκέδαση',         label_en: 'Entertainment', sub: 'stand-up comedy · σινεμά · θέατρο', sub_en: 'stand-up comedy · cinema · theatre' },
  { key: 'chill',     emoji: '☕', label: 'Χαλαρά',            label_en: 'Chill',         sub: 'καφές · γλυκό / παγωτό · picnic vibes', sub_en: 'coffee · dessert / ice cream · picnic vibes' },
  { key: 'activity',  emoji: '🎯', label: 'Δραστηριότητα',     label_en: 'Activity',      sub: 'bowling · escape room · επιτραπέζια', sub_en: 'bowling · escape room · board games' },
  { key: 'art',       emoji: '🎨', label: 'Τέχνη & Κουλτούρα', label_en: 'Art & Culture', sub: 'μουσείο · art gallery · βιβλιοπωλείο / reading', sub_en: 'museum · art gallery · bookstore / reading' },
  { key: 'wellness',  emoji: '🌿', label: 'Ευεξία',             label_en: 'Wellness',      sub: 'sunset spot · yoga / meditation · θαλασσινό μπάνιο · βόλτα φύση', sub_en: 'sunset spot · yoga / meditation · sea swim · nature walk' },
];

export const MOODS = [
  { key: 'chill', emoji: '😌', label: 'Χαλαρά',      label_en: 'Chill',               desc: 'low key vibes',        desc_en: 'low key vibes' },
  { key: 'wild',  emoji: '🔥', label: 'Έξαλλα',      label_en: 'Wild',                desc: 'non stop μέχρι πρωί',  desc_en: 'non stop till morning' },
  { key: 'food',  emoji: '🍽',  label: 'Φαγητό',      label_en: 'Food',                desc: 'foodie night',         desc_en: 'foodie night' },
  { key: 'diff',  emoji: '🎭', label: 'Κάτι αλλιώς', label_en: 'Something different', desc: 'κάτι διαφορετικό',     desc_en: 'a different kind of night' },
] as const;

// Υποκατηγορίες ανά κατηγορία. Το "value" πρέπει να ταιριάζει με
// το subcategory των spots στη DB. Όσες δεν έχουν spots ακόμα,
// εμφανίζονται με κατάσταση "σύντομα".
export const SUBCATEGORIES: Record<SpotCategory, { label: string; label_en: string; value: string }[]> = {
  food: [
    { label: "Σουβλάκι", label_en: "Souvlaki", value: "σουβλάκι" },
    { label: "Μπέργκερ", label_en: "Burger", value: "burger" },
    { label: "Σούσι", label_en: "Sushi", value: "σούσι" },
    { label: "Ιταλικό", label_en: "Italian", value: "ιταλικό" },
    { label: "Μεζεδοπωλείο", label_en: "Meze", value: "μεζεδοπωλείο" },
    { label: "Brunch", label_en: "Brunch", value: "brunch" },
    { label: "Vegan", label_en: "Vegan", value: "vegan" },
    { label: "Θαλασσινά", label_en: "Seafood", value: "θαλασσινά" },
    { label: "Creative", label_en: "Creative", value: "creative" },
    { label: "Street food", label_en: "Street food", value: "street food" },
  ],
  drink: [
    { label: "Cocktail bar", label_en: "Cocktail bar", value: "cocktail bar" },
    { label: "Wine bar", label_en: "Wine bar", value: "wine bar" },
    { label: "Rooftop", label_en: "Rooftop", value: "rooftop bar" },
    { label: "All-day bar", label_en: "All-day bar", value: "all-day bar" },
    { label: "Μπυραρία", label_en: "Beer bar", value: "μπυραρία" },
    { label: "Σφηνάδικο", label_en: "Shots bar", value: "σφηνάδικο" },
  ],
  nightlife: [
    { label: "Club", label_en: "Club", value: "club" },
    { label: "Underground / Techno", label_en: "Underground / Techno", value: "underground" },
    { label: "Mainstream", label_en: "Mainstream", value: "mainstream" },
    { label: "Live stage", label_en: "Live stage", value: "live stage" },
    { label: "Μπουζούκια", label_en: "Bouzoukia", value: "μπουζούκια" },
    { label: "Disco / Retro", label_en: "Disco / Retro", value: "disco" },
  ],
  show: [
    { label: "Stand-up", label_en: "Stand-up", value: "stand-up comedy" },
    { label: "Live μουσική", label_en: "Live music", value: "live stage" },
    { label: "Θέατρο", label_en: "Theatre", value: "θέατρο" },
    { label: "Σινεμά", label_en: "Cinema", value: "σινεμά" },
    { label: "Performance", label_en: "Performance", value: "performance" },
  ],
  chill: [
    { label: "Specialty καφέ", label_en: "Specialty coffee", value: "specialty καφέ" },
    { label: "All-day café", label_en: "All-day café", value: "all-day café" },
    { label: "Γλυκό", label_en: "Dessert", value: "γλυκό" },
    { label: "Τσάι / Brunch", label_en: "Tea / Brunch", value: "τσάι" },
  ],
  activity: [
    { label: "Escape room", label_en: "Escape room", value: "escape room" },
    { label: "Bowling", label_en: "Bowling", value: "bowling" },
    { label: "Board games", label_en: "Board games", value: "board game café" },
    { label: "Μπιλιάρδο", label_en: "Billiards", value: "μπιλιάρδο" },
    { label: "Καρτ", label_en: "Karting", value: "καρτ" },
    { label: "Mini golf / Arcade", label_en: "Mini golf / Arcade", value: "arcade" },
  ],
  art: [
    { label: "Μουσείο", label_en: "Museum", value: "μουσείο" },
    { label: "Art Gallery", label_en: "Art Gallery", value: "art gallery" },
    { label: "Βιβλιοπωλείο / Reading", label_en: "Bookstore / Reading", value: "βιβλιοπωλείο" },
  ],
  wellness: [
    { label: "Sunset Spot", label_en: "Sunset Spot", value: "sunset spot" },
    { label: "Yoga / Meditation", label_en: "Yoga / Meditation", value: "yoga" },
    { label: "Θαλασσινό Μπάνιο", label_en: "Sea Swim", value: "θαλάσσια" },
    { label: "Βόλτα Φύση", label_en: "Nature Walk", value: "φύση" },
  ],
};
