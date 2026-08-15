export { CITIES, GENRES, CITY_LABELS } from "./searchConstants";

export const NETWORK = {
  "Artists": {
    "DJ": [],
    "Τραγουδιστής": [],
    "Μπάντα": [],
    "Οργανοπαίχτης": [],
  },
  // Venue types for the Greek nightlife / events market. Kept deliberately
  // short — these are the buckets someone actually filters by, not an
  // exhaustive list of every kind of room you can rent.
  "Venues": {
    "Club": [],
    "Bar / Lounge": [],
    "Rooftop": [],
    "Live Stage": [],
    "Event Hall": [],
    "Beach Club": [],
    "Restaurant": [],
  },
  "Professionals": {
    "For Events": {
      "Φωτογράφος / Videographer": [],
      "Sound & Lighting": [],
      "Catering": [],
      "Decoration": [],
    },
    "For Artists": {
      "Studio / Rehearsal": [],
      "Producer / Beatmaker": [],
      "Mix & Master Engineer": [],
      "Video Director": [],
      "Booking Agent / Manager": [],
    },
  },
} as const

// English display labels for the Greek NETWORK category values. The values
// themselves stay Greek — they are what profiles.network_category stores and
// what every filter matches on. Only the rendered text is translated.
export const NETWORK_CATEGORY_EN: Record<string, string> = {
  "Τραγουδιστής": "Singer",
  "Μπάντα": "Band",
  "Οργανοπαίχτης": "Instrumentalist",
  "Φωτογράφος / Videographer": "Photographer / Videographer",
}

export function networkCategoryLabel(value: string | null | undefined, lang: string): string {
  if (!value) return ""
  return lang === "en" ? NETWORK_CATEGORY_EN[value] ?? value : value
}

export function getListingCategory(role: string | null): { group: string; subgroup?: string } | null {
  if (!role) return null
  if (Object.keys(NETWORK.Artists).includes(role)) return { group: "Artists" }
  // "Venues" as a bare role predates the venue taxonomy and is still stored on
  // older listings, so it stays recognised alongside the real venue types.
  if (role === "Venues") return { group: "Venues" }
  if (Object.keys(NETWORK.Venues).includes(role)) return { group: "Venues" }
  if (Object.keys(NETWORK.Professionals["For Events"]).includes(role)) return { group: "Professionals", subgroup: "For Events" }
  if (Object.keys(NETWORK.Professionals["For Artists"]).includes(role)) return { group: "Professionals", subgroup: "For Artists" }
  return null
}
