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
  instagram: string | null;
  isSponsored: boolean;
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
