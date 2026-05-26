export type SpotCategory = 'food' | 'drink' | 'nightlife' | 'show' | 'chill' | 'activity' | 'art' | 'wellness';

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
  { key: 'drink',     emoji: '🍸', label: 'Ποτό',              sub: 'cocktails · rooftop bar · wine & spirits · μπύρα' },
  { key: 'food',      emoji: '🍽',  label: 'Φαγητό',            sub: 'street food · κινέζικο · brunch' },
  { key: 'nightlife', emoji: '🎵', label: 'Νύχτα',             sub: 'club · bar hopping · live music' },
  { key: 'show',      emoji: '🎬', label: 'Entertainment',     sub: 'stand-up comedy · σινεμά · θέατρο' },
  { key: 'chill',     emoji: '☕', label: 'Χαλαρά',            sub: 'καφές · γλυκό / παγωτό · picnic vibes' },
  { key: 'activity',  emoji: '🎯', label: 'Δραστηριότητα',     sub: 'bowling · escape room · επιτραπέζια' },
  { key: 'art',       emoji: '🎨', label: 'Τέχνη & Κουλτούρα', sub: 'μουσείο · art gallery · βιβλιοπωλείο / reading' },
  { key: 'wellness',  emoji: '🌿', label: 'Wellness',          sub: 'sunset spot · yoga / meditation · θαλασσινό μπάνιο · βόλτα φύση' },
];

export const MOODS = [
  { key: 'chill', emoji: '😌', label: 'Χαλαρά',      desc: 'low key vibes' },
  { key: 'wild',  emoji: '🔥', label: 'Έξαλλα',      desc: 'non stop μέχρι πρωί' },
  { key: 'food',  emoji: '🍽',  label: 'Φαγητό',      desc: 'foodie night' },
  { key: 'diff',  emoji: '🎭', label: 'Κάτι αλλιώς', desc: 'κάτι διαφορετικό' },
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
  art: [
    { label: "Μουσείο", value: "μουσείο" },
    { label: "Art Gallery", value: "art gallery" },
    { label: "Βιβλιοπωλείο / Reading", value: "βιβλιοπωλείο" },
  ],
  wellness: [
    { label: "Sunset Spot", value: "sunset spot" },
    { label: "Yoga / Meditation", value: "yoga" },
    { label: "Θαλασσινό Μπάνιο", value: "θαλάσσια" },
    { label: "Βόλτα Φύση", value: "φύση" },
  ],
};
