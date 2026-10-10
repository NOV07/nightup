'use client'
import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useLanguage } from '@/app/components/LanguageContext'
import { MAP_HEIGHT, type LocationPickerProps } from './types'

const ATHENS: L.LatLngTuple = [37.9838, 23.7275]
const EMPTY_ZOOM = 12
const PIN_ZOOM = 17
// Changing the provider here also means adding its host to img-src in next.config.ts.
const TILE_URL = process.env.NEXT_PUBLIC_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const ATTRIBUTION = '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap</a>'
const TILE_ERRORS_BEFORE_NOTICE = 5

const round6 = (n: number) => Math.round(n * 1e6) / 1e6
const keyOf = (lat: number, lng: number) => `${round6(lat)},${round6(lng)}`

// Own SVG pin: Leaflet's default marker is a PNG it resolves at runtime, which
// breaks under bundlers and would be fetched from an external host.
const PIN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="40" viewBox="0 0 30 40" aria-hidden="true">
<path d="M15 1C7.3 1 1 7.2 1 14.9 1 25.3 15 39 15 39s14-13.7 14-24.1C29 7.2 22.7 1 15 1z" fill="#E8A020" stroke="#0F0F1A" stroke-width="1.5"/>
<circle cx="15" cy="15" r="5.5" fill="#0F0F1A"/></svg>`

const pinIcon = L.divIcon({ className: 'nightup-map-pin', html: PIN_SVG, iconSize: [30, 40], iconAnchor: [15, 39] })

// Scoped overrides for Leaflet's light default controls.
const CSS = `
.nightup-map .leaflet-container { background: #16162a; font-family: inherit; }
.nightup-map .nightup-map-pin { background: none; border: none; filter: drop-shadow(0 2px 3px rgba(0,0,0,0.55)); }
.nightup-map .leaflet-bar { border: 1px solid rgba(255,255,255,0.14); box-shadow: none; }
.nightup-map .leaflet-bar a { background: #111120; color: #E8A020; border-bottom-color: rgba(255,255,255,0.12); }
.nightup-map .leaflet-bar a:hover, .nightup-map .leaflet-bar a:focus { background: #1b1b30; color: #E8A020; }
.nightup-map .leaflet-bar a.leaflet-disabled { background: #111120; color: rgba(255,255,255,0.25); }
.nightup-map .leaflet-control-attribution { background: rgba(15,15,26,0.8); color: rgba(255,255,255,0.65); font-size: 10px; }
.nightup-map .leaflet-control-attribution a { color: #E8A020; }
`

export default function LocationPickerMap({ value, onChange, disabled = false }: LocationPickerProps) {
  const { t } = useLanguage()
  const elRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const tilesRef = useRef<L.TileLayer | null>(null)
  const onChangeRef = useRef(onChange)
  const disabledRef = useRef(disabled)
  // The last position this component reported, so the value coming back from
  // the parent does not re-centre the map under the user's finger.
  const lastEmitted = useRef<string | null>(null)
  const [tilesFailed, setTilesFailed] = useState(false)
  const [coarse, setCoarse] = useState(false)

  useEffect(() => { onChangeRef.current = onChange })
  useEffect(() => { disabledRef.current = disabled })

  function emit(latlng: L.LatLng) {
    const lat = round6(latlng.lat), lng = round6(latlng.lng)
    lastEmitted.current = keyOf(lat, lng)
    onChangeRef.current(lat, lng)
  }

  function placeMarker(map: L.Map, latlng: L.LatLngExpression) {
    if (markerRef.current) {
      markerRef.current.setLatLng(latlng)
      return markerRef.current
    }
    const marker = L.marker(latlng, {
      icon: pinIcon, draggable: !disabledRef.current, keyboard: true,
      title: t('spot_map_pin_title'), alt: t('spot_map_pin_title'), autoPan: true,
    }).addTo(map)
    marker.on('dragend', () => emit(marker.getLatLng()))
    markerRef.current = marker
    return marker
  }

  // Create the map once.
  useEffect(() => {
    const el = elRef.current
    if (!el) return
    // On touch screens one finger scrolls the page; the map pans and zooms
    // with two fingers, and the pin still drags with one.
    const isCoarse = window.matchMedia('(pointer: coarse)').matches
    setCoarse(isCoarse)

    const map = L.map(el, {
      center: value ? [value.lat, value.lng] : ATHENS,
      zoom: value ? PIN_ZOOM : EMPTY_ZOOM,
      scrollWheelZoom: false,
      dragging: !isCoarse,
      touchZoom: true,
      zoomControl: false,
      attributionControl: false,
    })
    L.control.zoom({ zoomInTitle: t('spot_map_zoom_in'), zoomOutTitle: t('spot_map_zoom_out') }).addTo(map)
    L.control.attribution({ prefix: false }).addTo(map)

    const tilePane = map.getPane('tilePane')
    if (tilePane) tilePane.style.filter = 'invert(1) hue-rotate(180deg) brightness(0.9) contrast(0.9)'

    let loaded = 0, errors = 0
    const tiles = L.tileLayer(TILE_URL, { maxZoom: 19, attribution: ATTRIBUTION })
    tiles.on('tileload', () => { loaded++ })
    tiles.on('tileerror', () => {
      errors++
      if (errors >= TILE_ERRORS_BEFORE_NOTICE) setTilesFailed(true)
    })
    tiles.on('load', () => { if (loaded === 0 && errors > 0) setTilesFailed(true) })
    tiles.on('loading', () => { loaded = 0; errors = 0 })
    tiles.addTo(map)
    tilesRef.current = tiles

    if (value) {
      placeMarker(map, [value.lat, value.lng])
      lastEmitted.current = keyOf(value.lat, value.lng)
    }

    map.on('click', (e: L.LeafletMouseEvent) => {
      if (disabledRef.current) return
      placeMarker(map, e.latlng)
      emit(e.latlng)
    })

    const ro = new ResizeObserver(() => map.invalidateSize())
    ro.observe(el)
    mapRef.current = map
    return () => {
      ro.disconnect()
      map.remove()
      mapRef.current = null
      markerRef.current = null
      tilesRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Follow position changes made outside the map (a resolved link, a reset).
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (!value) {
      markerRef.current?.remove()
      markerRef.current = null
      lastEmitted.current = null
      return
    }
    const k = keyOf(value.lat, value.lng)
    if (k === lastEmitted.current && markerRef.current) return
    lastEmitted.current = k
    placeMarker(map, [value.lat, value.lng])
    map.setView([value.lat, value.lng], PIN_ZOOM)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value?.lat, value?.lng])

  useEffect(() => {
    const m = markerRef.current
    if (m?.dragging) { if (disabled) m.dragging.disable(); else m.dragging.enable() }
  }, [disabled])

  function retryTiles() {
    setTilesFailed(false)
    tilesRef.current?.redraw()
  }

  return (
    <div className="nightup-map">
      <style>{CSS}</style>
      <div style={{ position: 'relative' }}>
        <div ref={elRef} role="application" aria-label={t('spot_map_aria')} data-testid="location-picker"
          style={{
            height: MAP_HEIGHT, borderRadius: 8, overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.12)', opacity: disabled ? 0.6 : 1,
          }} />
        {tilesFailed && (
          <div role="alert" style={{
            position: 'absolute', inset: 1, borderRadius: 8, zIndex: 1000,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
            backgroundColor: 'rgba(15,15,26,0.92)', color: 'rgba(255,255,255,0.8)', fontSize: 13, textAlign: 'center', padding: 16,
          }}>
            {t('spot_map_tiles_failed')}
            <button type="button" onClick={retryTiles}
              style={{ padding: '6px 14px', borderRadius: 999, fontSize: 12, cursor: 'pointer', backgroundColor: 'rgba(232,160,32,0.12)', color: '#E8A020', border: '1px solid rgba(232,160,32,0.35)' }}>
              {t('spot_map_retry')}
            </button>
          </div>
        )}
      </div>
      {coarse && (
        <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>{t('spot_map_two_fingers')}</p>
      )}
    </div>
  )
}
