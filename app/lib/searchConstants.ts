// Single source of truth for filter values used across search, events, and network.
// Keep in sync with actual DB values for genre and city columns.

export const CITIES: string[] = [
  "All Cities",
  "Athens",
  "Thessaloniki",
  "Mykonos",
  "Santorini",
  "Heraklion",
  "Patras",
  "Rhodes",
  "Ios",
  "Corfu",
  "Zakynthos",
  "Crete",
  "Rest of Greece",
];

// Greek display labels for CITIES values. Values stay in English for DB
// matching/filtering — only the displayed text is translated.
export const CITY_LABELS: Record<string, string> = {
  "All Cities": "Όλες οι πόλεις",
  "Athens": "Αθήνα",
  "Thessaloniki": "Θεσσαλονίκη",
  "Mykonos": "Μύκονος",
  "Santorini": "Σαντορίνη",
  "Heraklion": "Ηράκλειο",
  "Patras": "Πάτρα",
  "Rhodes": "Ρόδος",
  "Ios": "Ίος",
  "Corfu": "Κέρκυρα",
  "Zakynthos": "Ζάκυνθος",
  "Crete": "Κρήτη",
  "Rest of Greece": "Υπόλοιπη Ελλάδα",
};

export const GENRES: string[] = [
  "All",
  "Techno",
  "House",
  "Deep House",
  "Hip-Hop",
  "R&B",
  "Latin",
  "Open Air",
  "Rock",
  "Laïká",
  "Entechno",
  "Jazz",
  "Pop",
  "Reggae",
  "Classical",
  "Rebetika",
  "Other",
];
