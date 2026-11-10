'use client'
import dynamic from 'next/dynamic'
import { useMemo } from 'react'
import { useLanguage } from '@/app/components/LanguageContext'
import { directionsUrl, type MapPoint } from '@/app/lib/mapFilters'

// Same read-only map as /map, with the event pin only. Leaflet touches `window`,
// so it loads in the browser after the page.
const PublicMap = dynamic(() => import('./PublicMap'), {
  ssr: false,
  loading: () => <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: '#12121F' }} />,
})

/** Small map of where the event is, plus the "Directions" button (Google Maps). */
export default function EventLocationMap({ lat, lng, name }: { lat: number; lng: number; name: string }) {
  const { t } = useLanguage()
  const points = useMemo<MapPoint[]>(() => [{
    kind: 'event', id: 'e-this', slug: '', name, area: null, lat, lng,
    categories: [], subcategories: [], description: null, accessNote: null, verifiedNight: false, image: null,
  }], [lat, lng, name])

  return (
    <div data-testid="event-location" style={{ marginTop: 20 }}>
      <div style={{ position: 'relative', height: 200, borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: '#12121F' }}>
        <PublicMap points={points} selectedId={null} onSelect={() => {}} ariaLabel={t('event_location_map_aria')} />
      </div>
      <a href={directionsUrl(lat, lng)} target="_blank" rel="noopener noreferrer"
        style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 44, borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: 'none', color: '#E8A020', border: '1px solid rgba(232,160,32,0.35)', backgroundColor: 'rgba(232,160,32,0.08)' }}>
        {t('event_directions')}
      </a>
    </div>
  )
}
