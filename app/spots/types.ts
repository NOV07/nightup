export type SpotCategory = 'food' | 'drink' | 'nightlife' | 'show' | 'chill' | 'activity';

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
  priceLevel: number | null;
  rating: number | null;
  phone?: string | null;
  website?: string | null;
  instagram: string | null;
  isSponsored: boolean;
  gallery?: string[];
  openingHours?: Record<string, string> | null;
}

export const SPOT_CATEGORIES: {
  key: SpotCategory; emoji: string; label: string; sub: string;
}[] = [
  { key: 'drink',     emoji: '🍸', label: 'Ποτό',          sub: 'cocktails · wine · rooftop' },
  { key: 'food',      emoji: '🍽️', label: 'Φαγητό',        sub: 'σουβλάκι · σούσι · ιταλικό' },
  { key: 'nightlife', emoji: '🎶', label: 'Νύχτα',         sub: 'club · live · χορός' },
  { key: 'show',      emoji: '🎭', label: 'Θέαμα',         sub: 'stand-up · live · σινεμά' },
  { key: 'chill',     emoji: '☕', label: 'Χαλαρά',         sub: 'καφές · all-day · γλυκό' },
  { key: 'activity',  emoji: '🎯', label: 'Δραστηριότητα', sub: 'bowling · escape · καρτ' },
];

export const MOODS = [
  { key: 'chill', emoji: '😌', label: 'Χαλαρά',         desc: 'ποτό & κουβέντα' },
  { key: 'wild',  emoji: '🔥', label: 'Έξαλλα',         desc: 'χορός μέχρι πρωί' },
  { key: 'food',  emoji: '🍽️', label: 'Φαγητό-κέντρικ', desc: 'καλό τραπέζι' },
  { key: 'diff',  emoji: '🎭', label: 'Κάτι αλλιώς',    desc: 'θέαμα / εμπειρία' },
] as const;

// Υποκατηγορίες ανά κατηγορία. Το "value" πρέπει να ταιριάζει με
// το subcategory των spots στη DB. Όσες δεν έχουν spots ακόμα,
// εμφανίζονται με κατάσταση "σύντομα".
export const SUBCATEGORIES: Record<SpotCategory, { label: string; value: string }[]> = {
  food: [
    { label: "Σουβλάκι", value: "σουβλάκι" },
    { label: "Μπέργκερ", value: "burger" },
    { label: "Σούσι", value: "σούσι" },
    { label: "Ιταλικό", value: "ιταλικό" },
    { label: "Μεζεδοπωλείο", value: "μεζεδοπωλείο" },
    { label: "Brunch", value: "brunch" },
    { label: "Vegan", value: "vegan" },
    { label: "Θαλασσινά", value: "θαλασσινά" },
    { label: "Creative", value: "creative" },
    { label: "Street food", value: "street food" },
  ],
  drink: [
    { label: "Cocktail bar", value: "cocktail bar" },
    { label: "Wine bar", value: "wine bar" },
    { label: "Rooftop", value: "rooftop bar" },
    { label: "All-day bar", value: "all-day bar" },
    { label: "Μπυραρία", value: "μπυραρία" },
    { label: "Σφηνάδικο", value: "σφηνάδικο" },
  ],
  nightlife: [
    { label: "Club", value: "club" },
    { label: "Underground / Techno", value: "underground" },
    { label: "Mainstream", value: "mainstream" },
    { label: "Live stage", value: "live stage" },
    { label: "Μπουζούκια", value: "μπουζούκια" },
    { label: "Disco / Retro", value: "disco" },
  ],
  show: [
    { label: "Stand-up", value: "stand-up comedy" },
    { label: "Live μουσική", value: "live stage" },
    { label: "Θέατρο", value: "θέατρο" },
    { label: "Σινεμά", value: "σινεμά" },
    { label: "Performance", value: "performance" },
  ],
  chill: [
    { label: "Specialty καφέ", value: "specialty καφέ" },
    { label: "All-day café", value: "all-day café" },
    { label: "Γλυκό", value: "γλυκό" },
    { label: "Τσάι / Brunch", value: "τσάι" },
  ],
  activity: [
    { label: "Escape room", value: "escape room" },
    { label: "Bowling", value: "bowling" },
    { label: "Board games", value: "board game café" },
    { label: "Μπιλιάρδο", value: "μπιλιάρδο" },
    { label: "Καρτ", value: "καρτ" },
    { label: "Mini golf / Arcade", value: "arcade" },
  ],
};
