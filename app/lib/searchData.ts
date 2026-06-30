export { CITIES, GENRES, CITY_LABELS } from "./searchConstants";

export const NETWORK = {
  "Artists": {
    "DJ": [],
    "Τραγουδιστής": [],
    "Μπάντα": [],
    "Οργανοπαίχτης": [],
  },
  "Venues": {},
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

export function getListingCategory(role: string | null): { group: string; subgroup?: string } | null {
  if (!role) return null
  if (Object.keys(NETWORK.Artists).includes(role)) return { group: "Artists" }
  if (role === "Venues") return { group: "Venues" }
  if (Object.keys(NETWORK.Professionals["For Events"]).includes(role)) return { group: "Professionals", subgroup: "For Events" }
  if (Object.keys(NETWORK.Professionals["For Artists"]).includes(role)) return { group: "Professionals", subgroup: "For Artists" }
  return null
}
