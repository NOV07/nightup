import { GENRE_KEYS } from "./genres";

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

// Genre filter options: "All" + the stable keys from the shared genres file.
// Display text comes from genreLabel() (Greek), never from this list.
export const GENRE_FILTERS: string[] = ["All", ...GENRE_KEYS];
