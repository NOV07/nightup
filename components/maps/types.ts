export interface LatLng { lat: number; lng: number }

export interface LocationPickerProps {
  /** Pin position, or null for an empty map centred on Athens. */
  value: LatLng | null
  /** Called with coordinates rounded to 6 decimals when the user taps the map or drops the pin. */
  onChange: (lat: number, lng: number) => void
  disabled?: boolean
}

export const MAP_HEIGHT = 220
