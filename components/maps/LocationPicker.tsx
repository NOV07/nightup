'use client'
import dynamic from 'next/dynamic'
import { MAP_HEIGHT, type LocationPickerProps } from './types'

export type { LatLng, LocationPickerProps } from './types'

function Placeholder() {
  return (
    <div aria-hidden style={{
      height: MAP_HEIGHT, borderRadius: 8,
      border: '1px solid rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.04)',
    }} />
  )
}

// Leaflet touches `window` at import time and ships its own CSS, so it is
// loaded in the browser only, and only once a map is actually on screen.
const LocationPickerMap = dynamic(() => import('./LocationPickerMap'), { ssr: false, loading: Placeholder })

export default function LocationPicker(props: LocationPickerProps) {
  return <LocationPickerMap {...props} />
}
