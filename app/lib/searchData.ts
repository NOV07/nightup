export { CITIES, GENRES, CITY_LABELS } from "./searchConstants";

export const NETWORK = {
  "Artists": {
    "DJ": [],
    "Τραγουδιστής": [],
    "Μπάντα": [],
    "Οργανοπαίχτης": [],
  },
  "Venues": {
    "Club": [],
    "Bar / Lounge": [],
    "Rooftop": [],
    "Beach Bar": [],
    "Event Space": [],
    "Other": [],
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
