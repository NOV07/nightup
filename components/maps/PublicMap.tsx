'use client'
import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useLanguage } from '@/app/components/LanguageContext'
import { mapColorOf } from '@/app/lib/mapColors'
import type { MapPoint } from '@/app/lib/mapFilters'

// Public map of /map. Same look as the LocationPicker (dark filtered OSM tiles,
// two-finger pan on touch screens, visible © OpenStreetMap), but read-only: it
// draws one focusable pin per point and tells the parent which one was picked.
// Changing the tile provider also means adding its host to img-src in next.config.ts.

const ATHENS: L.LatLngTuple = [37.9838, 23.7275]
const DEFAULT_ZOOM = 12
const FIT_MAX_ZOOM = 15
const TILE_URL = process.env.NEXT_PUBLIC_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const ATTRIBUTION = '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap</a>'
const TILE_ERRORS_BEFORE_NOTICE = 5

// Pin = a real <button> (Enter/Space/Tab work natively) with a 44px hit area and
// a smaller visible shape: circle for wellness, rounded square for venues.
const CSS = `
.nightup-public-map .leaflet-container { background: #16162a; font-family: inherit; }
.nightup-public-map .leaflet-tile { outline: 1px solid transparent; }
.nightup-public-map .nm-pin-wrap { background: none; border: none; }
.nightup-public-map .nm-pin { width: 44px; height: 44px; padding: 0; border: 0; background: transparent; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.nightup-public-map .nm-pin-dot { box-sizing: border-box; width: 28px; height: 28px; border: 3px solid #0F0F1A; box-shadow: 0 2px 5px rgba(0,0,0,0.55); transition: width .12s, height .12s, border-color .12s; }
.nightup-public-map .nm-pin-dot.is-round { border-radius: 50%; }
.nightup-public-map .nm-pin-dot.is-square { width: 26px; height: 26px; border-radius: 7px; }
.nightup-public-map .nm-pin.is-selected .nm-pin-dot { width: 42px; height: 42px; border: 4px solid #FFFFFF; }
.nightup-public-map .nm-pin.is-selected .nm-pin-dot.is-square { width: 40px; height: 40px; }
.nightup-public-map .nm-pin:focus-visible { outline: none; }
.nightup-public-map .nm-pin:focus-visible .nm-pin-dot { outline: 2px solid #FFFFFF; outline-offset: 3px; }
.nightup-public-map .leaflet-bar { border: 1px solid rgba(255,255,255,0.14); box-shadow: none; }
.nightup-public-map .leaflet-bar a { background: #111120; color: #E8A020; border-bottom-color: rgba(255,255,255,0.12); }
.nightup-public-map .leaflet-bar a:hover, .nightup-public-map .leaflet-bar a:focus { background: #1b1b30; color: #E8A020; }
.nightup-public-map .leaflet-control-attribution { background: rgba(15,15,26,0.8); color: rgba(255,255,255,0.65); font-size: 10px; }
.nightup-public-map .leaflet-control-attribution a { color: #E8A020; }
`

function makePinElement(p: MapPoint): HTMLButtonElement {
  const b = document.createElement('button')
  b.type = 'button'
  b.className = 'nm-pin'
  b.dataset.pin = p.id
  b.setAttribute('aria-label', p.name)
  b.setAttribute('aria-pressed', 'false')
  const dot = document.createElement('span')
  dot.className = `nm-pin-dot ${p.kind === 'wellness' ? 'is-round' : 'is-square'}`
  dot.style.background = mapColorOf(p.categories[0])
  dot.setAttribute('aria-hidden', 'true')
  b.appendChild(dot)
  return b
}

type Props = {
  points: readonly MapPoint[]
  selectedId: string | null
  onSelect: (id: string | null) => void
}

export default function PublicMap({ points, selectedId, onSelect }: Props) {
  const { t } = useLanguage()
  const elRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const tilesRef = useRef<L.TileLayer | null>(null)
  const markersRef = useRef<Map<string, { marker: L.Marker; el: HTMLButtonElement }>>(new Map())
  const onSelectRef = useRef(onSelect)
  const fitKeyRef = useRef<string | null>(null)
  const [tilesFailed, setTilesFailed] = useState(false)
  const [coarse, setCoarse] = useState(false)

  useEffect(() => { onSelectRef.current = onSelect })

  // Create the map once.
  useEffect(() => {
    const el = elRef.current
    if (!el) return
    // Touch screens: one finger scrolls the page, two fingers move the map.
    const isCoarse = window.matchMedia('(pointer: coarse)').matches
    setCoarse(isCoarse)

    const map = L.map(el, {
      center: ATHENS,
      zoom: DEFAULT_ZOOM,
      scrollWheelZoom: true,
      dragging: !isCoarse,
      touchZoom: true,
      zoomControl: false,
      attributionControl: false,
    })
    // Zoom and attribution both sit top-right: the bottom corners are taken by
    // the bottom sheet (phone), the card (desktop) and the site's player pill,
    // and the attribution has to stay visible.
    L.control.zoom({ position: 'topright', zoomInTitle: t('spot_map_zoom_in'), zoomOutTitle: t('spot_map_zoom_out') }).addTo(map)
    L.control.attribution({ position: 'topright', prefix: false }).addTo(map)

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

    map.on('click', () => onSelectRef.current(null))

    const ro = new ResizeObserver(() => map.invalidateSize())
    ro.observe(el)
    mapRef.current = map
    const markers = markersRef.current
    return () => {
      ro.disconnect()
      map.remove()
      mapRef.current = null
      tilesRef.current = null
      markers.clear()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep the markers in step with the points: add new ones, drop the ones that
  // no longer match a filter. Existing pins stay (so a focused pin keeps focus).
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const markers = markersRef.current
    const wanted = new Set(points.map(p => p.id))
    for (const [id, m] of markers) {
      if (!wanted.has(id)) { m.marker.remove(); markers.delete(id) }
    }
    for (const p of points) {
      if (markers.has(p.id)) continue
      const el = makePinElement(p)
      const icon = L.divIcon({ className: 'nm-pin-wrap', html: el, iconSize: [44, 44], iconAnchor: [22, 22] })
      // keyboard:false -> the inner <button> is the only tab stop.
      const marker = L.marker([p.lat, p.lng], { icon, keyboard: false, riseOnHover: true }).addTo(map)
      marker.on('click', () => onSelectRef.current(p.id))
      markers.set(p.id, { marker, el })
    }

    // Frame the visible points when the set changes (filters), not on selection.
    const key = points.map(p => p.id).sort().join('|')
    if (key !== fitKeyRef.current && points.length > 0) {
      fitKeyRef.current = key
      if (points.length === 1) map.setView([points[0].lat, points[0].lng], FIT_MAX_ZOOM)
      else map.fitBounds(L.latLngBounds(points.map(p => [p.lat, p.lng] as L.LatLngTuple)), { padding: [60, 60], maxZoom: FIT_MAX_ZOOM })
    }
  }, [points])

  // Selected pin: bigger with a white outline; bring the point into view.
  useEffect(() => {
    for (const [id, { marker, el }] of markersRef.current) {
      const on = id === selectedId
      el.classList.toggle('is-selected', on)
      el.setAttribute('aria-pressed', String(on))
      marker.setZIndexOffset(on ? 1000 : 0)
    }
    const map = mapRef.current
    const sel = selectedId ? markersRef.current.get(selectedId) : null
    if (map && sel) {
      const sheet = window.matchMedia('(max-width: 767px)').matches
      map.panInside(sel.marker.getLatLng(), { paddingTopLeft: [40, 40], paddingBottomRight: [40, sheet ? 380 : 40] })
    }
  }, [selectedId, points])

  function retryTiles() {
    setTilesFailed(false)
    tilesRef.current?.redraw()
  }

  return (
    <div className="nightup-public-map" style={{ position: 'absolute', inset: 0 }}>
      <style>{CSS}</style>
      <div ref={elRef} role="application" aria-label={t('map_aria')} data-testid="public-map"
        style={{ position: 'absolute', inset: 0 }} />
      {coarse && (
        <p style={{ position: 'absolute', left: 12, top: 10, zIndex: 500, margin: 0, padding: '4px 8px', borderRadius: 6, background: 'rgba(15,15,26,0.8)', fontSize: 11.5, color: 'rgba(255,255,255,0.7)', pointerEvents: 'none' }}>
          {t('spot_map_two_fingers')}
        </p>
      )}
      {tilesFailed && (
        // A banner, not a cover: the pins keep working when the tiles do not load.
        <div role="alert" style={{
          position: 'absolute', left: 12, right: 72, top: coarse ? 52 : 10, zIndex: 1000, maxWidth: 420,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
          backgroundColor: 'rgba(15,15,26,0.94)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8,
          color: 'rgba(255,255,255,0.8)', fontSize: 13, padding: '6px 6px 6px 12px',
        }}>
          <span>{t('spot_map_tiles_failed')}</span>
          <button type="button" onClick={retryTiles}
            style={{ flex: 'none', minHeight: 44, padding: '6px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer', backgroundColor: 'rgba(232,160,32,0.12)', color: '#E8A020', border: '1px solid rgba(232,160,32,0.35)' }}>
            {t('spot_map_retry')}
          </button>
        </div>
      )}
    </div>
  )
}
