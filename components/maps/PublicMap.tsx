'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useLanguage } from '@/app/components/LanguageContext'
import { mapEmojiOf } from '@/app/lib/mapEmoji'
import { CLUSTER_MAX_ZOOM, CLUSTER_RADIUS_PX, clusterPoints } from '@/app/lib/mapCluster'
import type { MapPoint } from '@/app/lib/mapFilters'
import type { SpotStatus } from '@/app/lib/openingHours'
import type { TranslationKey } from '@/app/lib/translations'

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
// one round 34px marker inside it: gold gradient with the point's emoji. A venue
// shows its status: gold = open, grey with a grey-scale emoji = closed, a dark
// see-through disc with a gold outline = no readable hours. Events and wellness
// points are always "active" (normal gold).
const CSS = `
.nightup-public-map .leaflet-container { background: #16162a; font-family: inherit; }
.nightup-public-map .leaflet-tile { outline: 1px solid transparent; }
.nightup-public-map .nm-pin-wrap { background: none; border: none; }
.nightup-public-map .nm-pin { position: relative; width: 44px; height: 44px; padding: 0; border: 0; background: transparent; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.nightup-public-map .nm-pin-dot { box-sizing: border-box; width: 34px; height: 34px; border-radius: 50%; border: 2px solid #0F0F1A; background: linear-gradient(135deg, #F5B335, #E8A020); box-shadow: 0 2px 6px rgba(0,0,0,0.55); display: flex; align-items: center; justify-content: center; font-size: 17px; line-height: 1; transition: transform .12s, border-color .12s; }
.nightup-public-map .nm-pin-ring { display: none; position: absolute; left: 50%; top: 50%; width: 34px; height: 34px; margin: -17px 0 0 -17px; box-sizing: border-box; border-radius: 50%; box-shadow: inset 0 0 0 1.5px #F5B335; pointer-events: none; opacity: 0; }
.nightup-public-map .has-radar .nm-pin-ring { display: block; }
/* Radar blip: two thin rings that grow to 1.45x the marker and fade. Without motion: a still, soft halo. */
.nightup-public-map .has-radar .nm-pin-ring.r1 { opacity: 0.4; transform: scale(1.3); }
@media (prefers-reduced-motion: no-preference) {
  .nightup-public-map .has-radar .nm-pin-ring { animation: nm-blip 2.2s ease-out infinite; }
  .nightup-public-map .has-radar .nm-pin-ring.r2 { animation-delay: 0.9s; }
}
@keyframes nm-blip { 0% { transform: scale(1); opacity: 0.75; } 100% { transform: scale(1.45); opacity: 0; } }
.nightup-public-map .nm-pin-emoji { display: block; pointer-events: none; font-family: "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif; }
.nightup-public-map .nm-pin-dot.is-closed { background: #6B6B80; }
.nightup-public-map .nm-pin-dot.is-closed .nm-pin-emoji { filter: grayscale(1); opacity: 0.85; }
.nightup-public-map .nm-pin-dot.is-unknown { background: rgba(15,15,26,0.78); border-color: #E8A020; }
.nightup-public-map .nm-pin.is-selected .nm-pin-dot { transform: scale(1.18); border: 3px solid #FFFFFF; }
.nightup-public-map .nm-cluster { position: relative; width: 44px; height: 44px; padding: 0; border: 0; background: transparent; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.nightup-public-map .nm-cluster .nm-pin-ring { width: 38px; height: 38px; margin: -19px 0 0 -19px; }
.nightup-public-map .nm-cluster-dot { box-sizing: border-box; min-width: 38px; height: 38px; padding: 0 6px; border-radius: 19px; border: 2.5px solid #F5B335; background: #1A1A28; color: #fff; font-size: 14px; font-weight: 700; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 0 4px rgba(245,179,53,0.22), 0 2px 6px rgba(0,0,0,0.55); pointer-events: none; }
.nightup-public-map .nm-cluster:focus-visible { outline: none; }
.nightup-public-map .nm-cluster:focus-visible .nm-cluster-dot { outline: 2px solid #FFFFFF; outline-offset: 3px; }
.nightup-public-map .nm-pin:focus-visible { outline: none; }
.nightup-public-map .nm-pin:focus-visible .nm-pin-dot { outline: 2px solid #FFFFFF; outline-offset: 3px; }
.nightup-public-map .nm-user-wrap { background: none; border: none; pointer-events: none; }
.nightup-public-map .nm-user-halo { position: absolute; left: 50%; top: 50%; width: 40px; height: 40px; margin: -20px 0 0 -20px; border-radius: 50%; background: rgba(76,141,255,0.22); }
.nightup-public-map .nm-user-dot { position: absolute; left: 50%; top: 50%; width: 16px; height: 16px; margin: -8px 0 0 -8px; box-sizing: border-box; border-radius: 50%; background: #4C8DFF; border: 2.5px solid #FFFFFF; box-shadow: 0 1px 4px rgba(0,0,0,0.5); }
@media (pointer: coarse) { .nightup-public-map.is-quiet .leaflet-control-zoom { display: none; } }
.nightup-public-map .leaflet-bar { border: 1px solid rgba(255,255,255,0.14); box-shadow: none; }
.nightup-public-map .leaflet-bar a { background: #111120; color: #E8A020; border-bottom-color: rgba(255,255,255,0.12); }
.nightup-public-map .leaflet-bar a:hover, .nightup-public-map .leaflet-bar a:focus { background: #1b1b30; color: #E8A020; }
.nightup-public-map .leaflet-control-attribution { background: rgba(15,15,26,0.8); color: rgba(255,255,255,0.65); font-size: 10px; }
.nightup-public-map .leaflet-control-attribution a { color: #E8A020; }
`

const STATUS_LABEL: Record<SpotStatus, TranslationKey> = { open: 'map_spot_open', closed: 'map_spot_closed', unknown: 'map_spot_unknown' }

/** Look and label of a pin. Called for new pins and again when the status of an existing one changes. */
function paintPin(el: HTMLButtonElement, p: MapPoint, status: SpotStatus | undefined, label: (k: TranslationKey) => string) {
  const dot = el.querySelector('.nm-pin-dot') as HTMLElement
  const st = p.kind === 'spot' ? status : undefined
  el.classList.toggle('has-radar', p.event?.radar === true)
  dot.classList.toggle('is-closed', st === 'closed')
  dot.classList.toggle('is-unknown', st === 'unknown')
  el.setAttribute('aria-label', st ? `${p.name}, ${label(STATUS_LABEL[st])}` : p.name)
}

function makePinElement(p: MapPoint): HTMLButtonElement {
  const b = document.createElement('button')
  b.type = 'button'
  b.className = 'nm-pin'
  b.dataset.pin = p.id
  b.setAttribute('aria-label', p.name)
  b.setAttribute('aria-pressed', 'false')
  // Radar blip rings (shown only for radar picks, see .has-radar), under the marker.
  for (const n of ['r1', 'r2']) {
    const ring = document.createElement('span')
    ring.className = `nm-pin-ring ${n}`
    ring.setAttribute('aria-hidden', 'true')
    b.appendChild(ring)
  }
  const dot = document.createElement('span')
  dot.className = 'nm-pin-dot'
  dot.setAttribute('aria-hidden', 'true')
  const emoji = document.createElement('span')
  emoji.className = 'nm-pin-emoji'
  emoji.textContent = mapEmojiOf(p)
  dot.appendChild(emoji)
  b.appendChild(dot)
  return b
}

type Props = {
  points: readonly MapPoint[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  /** Accessible name of the map. Defaults to the public map's. */
  ariaLabel?: string
  /** Open / closed / unknown of each venue, by point id. */
  statusById?: Record<string, SpotStatus>
  /** Pixels the corner notices (two-finger hint, tile banner) move down, to leave room for an overlay on the map. */
  topInset?: number
  /** The full-screen map page: no zoom buttons on touch screens and the two-finger hint only appears when a finger is put on the map. */
  quiet?: boolean
  /** Where the person is (only while "Near me" is on) and the radius to frame, or null for none. Never stored. */
  userLocation?: { lat: number; lng: number; radiusKm: number | null } | null
}

export default function PublicMap({ points, selectedId, onSelect, ariaLabel, statusById, topInset = 0, userLocation = null, quiet = false }: Props) {
  const { t } = useLanguage()
  const elRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const tilesRef = useRef<L.TileLayer | null>(null)
  const markersRef = useRef<Map<string, { marker: L.Marker; el: HTMLButtonElement }>>(new Map())
  const onSelectRef = useRef(onSelect)
  const fitKeyRef = useRef<string | null>(null)
  const userOnRef = useRef(false)
  const clustersRef = useRef<Map<string, L.Marker>>(new Map())
  const pointsRef = useRef<readonly MapPoint[]>(points)
  const selectedRef = useRef<string | null>(selectedId)
  const tRef = useRef(t)
  const [tilesFailed, setTilesFailed] = useState(false)
  const [coarse, setCoarse] = useState(false)
  const [hint, setHint] = useState(false)

  useEffect(() => { onSelectRef.current = onSelect; tRef.current = t })

  // Which points are drawn as their own pin and which are folded into a cluster at this zoom.
  // Pin markers are kept (just taken off the map) so a pin keeps its element; cluster markers are
  // reused while their members stay the same.
  const syncMarkers = useCallback(() => {
    const map = mapRef.current
    if (!map) return
    const zoom = map.getZoom()
    const items = pointsRef.current.map(p => {
      const px = map.project([p.lat, p.lng], zoom)
      return { id: p.id, x: px.x, y: px.y, lat: p.lat, lng: p.lng, solo: p.event?.radar === true || p.id === selectedRef.current, radar: p.event?.radar === true }
    })
    const { singles, clusters } = zoom > CLUSTER_MAX_ZOOM
      ? { singles: items.map(i => i.id), clusters: [] }
      : clusterPoints(items, CLUSTER_RADIUS_PX)
    const single = new Set(singles)
    for (const [id, m] of markersRef.current) {
      if (single.has(id)) { if (!map.hasLayer(m.marker)) m.marker.addTo(map) }
      else m.marker.remove()
    }
    const want = new Set(clusters.map(c => c.key))
    for (const [key, m] of clustersRef.current) {
      if (!want.has(key)) { m.remove(); clustersRef.current.delete(key) }
    }
    for (const c of clusters) {
      if (clustersRef.current.has(c.key)) continue
      const b = document.createElement('button')
      b.type = 'button'
      b.className = c.radar ? 'nm-cluster has-radar' : 'nm-cluster'
      if (c.radar) {
        for (const n of ['r1', 'r2']) {
          const ring = document.createElement('span')
          ring.className = `nm-pin-ring ${n}`
          ring.setAttribute('aria-hidden', 'true')
          b.appendChild(ring)
        }
      }
      b.setAttribute('aria-label', `${c.ids.length} ${tRef.current('map_cluster_aria')}`)
      const dot = document.createElement('span')
      dot.className = 'nm-cluster-dot'
      dot.setAttribute('aria-hidden', 'true')
      dot.textContent = String(c.ids.length)
      b.appendChild(dot)
      const marker = L.marker([c.lat, c.lng], { icon: L.divIcon({ className: 'nm-pin-wrap', html: b, iconSize: [44, 44], iconAnchor: [22, 22] }), keyboard: false, riseOnHover: true }).addTo(map)
      marker.on('click', () => {
        const members = c.ids.map(id => markersRef.current.get(id)?.marker.getLatLng()).filter((x): x is L.LatLng => !!x)
        if (members.length === 0) return
        const bounds = L.latLngBounds(members)
        if (bounds.getNorthEast().equals(bounds.getSouthWest())) map.setView(bounds.getCenter(), Math.min(map.getZoom() + 2, 19))
        else map.fitBounds(bounds, { padding: [60, 60], maxZoom: 18 })
      })
      clustersRef.current.set(c.key, marker)
    }
  }, [])
  const userLat = userLocation?.lat ?? null
  const userLng = userLocation?.lng ?? null
  const userRadius = userLocation?.radiusKm ?? null
  useEffect(() => { userOnRef.current = userLat !== null && userLng !== null })

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
    // Quiet mode: the two-finger hint shows for a moment when one finger touches the map, not at rest.
    let hintTimer: ReturnType<typeof setTimeout> | undefined
    const onTouch = (e: TouchEvent) => {
      if (!isCoarse || e.touches.length !== 1) return
      setHint(true)
      clearTimeout(hintTimer)
      hintTimer = setTimeout(() => setHint(false), 2500)
    }
    el.addEventListener('touchstart', onTouch, { passive: true })
    map.on('zoomend', syncMarkers)

    const ro = new ResizeObserver(() => map.invalidateSize())
    ro.observe(el)
    mapRef.current = map
    const markers = markersRef.current
    const clusters = clustersRef.current
    return () => {
      el.removeEventListener('touchstart', onTouch)
      clearTimeout(hintTimer)
      ro.disconnect()
      map.remove()
      mapRef.current = null
      tilesRef.current = null
      markers.clear()
      clusters.clear()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep the markers in step with the points: add new ones, drop the ones that
  // no longer match a filter. Existing pins stay (so a focused pin keeps focus).
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    pointsRef.current = points
    const markers = markersRef.current
    const wanted = new Set(points.map(p => p.id))
    for (const [id, m] of markers) {
      if (!wanted.has(id)) { m.marker.remove(); markers.delete(id) }
    }
    for (const p of points) {
      const have = markers.get(p.id)
      if (have) { paintPin(have.el, p, statusById?.[p.id], t); continue }
      const el = makePinElement(p)
      paintPin(el, p, statusById?.[p.id], t)
      const icon = L.divIcon({ className: 'nm-pin-wrap', html: el, iconSize: [44, 44], iconAnchor: [22, 22] })
      // keyboard:false -> the inner <button> is the only tab stop.
      const marker = L.marker([p.lat, p.lng], { icon, keyboard: false, riseOnHover: true })
      marker.on('click', () => onSelectRef.current(p.id))
      markers.set(p.id, { marker, el })
    }
    syncMarkers()

    // Frame the visible points when the set changes (filters), not on selection.
    const key = points.map(p => p.id).sort().join('|')
    // While "Near me" is on the view follows the person and the radius instead (effect below).
    if (key !== fitKeyRef.current && points.length > 0 && !userOnRef.current) {
      fitKeyRef.current = key
      if (points.length === 1) map.setView([points[0].lat, points[0].lng], FIT_MAX_ZOOM)
      else map.fitBounds(L.latLngBounds(points.map(p => [p.lat, p.lng] as L.LatLngTuple)), { padding: [60, 60], maxZoom: FIT_MAX_ZOOM })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, statusById])

  // Selected pin: bigger with a white outline; bring the point into view.
  useEffect(() => {
    selectedRef.current = selectedId
    syncMarkers()
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
  }, [selectedId, points, syncMarkers])

  // "Near me": a blue dot with a soft halo, an optional dashed circle of the radius, and the view framed on it.
  useEffect(() => {
    const map = mapRef.current
    if (!map || userLat === null || userLng === null) return
    const group = L.layerGroup().addTo(map)
    const icon = L.divIcon({ className: 'nm-user-wrap', html: '<span class="nm-user-halo"></span><span class="nm-user-dot"></span>', iconSize: [40, 40], iconAnchor: [20, 20] })
    L.marker([userLat, userLng], { icon, interactive: false, keyboard: false, zIndexOffset: 400 }).addTo(group)
    if (userRadius !== null) {
      const circle = L.circle([userLat, userLng], { radius: userRadius * 1000, color: '#F5B335', weight: 1.5, dashArray: '6 6', fillColor: '#F5B335', fillOpacity: 0.04, interactive: false }).addTo(group)
      map.fitBounds(circle.getBounds(), { padding: [24, 24] })
    } else {
      map.setView([userLat, userLng], 13)
    }
    return () => { group.remove() }
  }, [userLat, userLng, userRadius])

  function retryTiles() {
    setTilesFailed(false)
    tilesRef.current?.redraw()
  }

  return (
    <div className={`nightup-public-map${quiet ? ' is-quiet' : ''}`} style={{ position: 'absolute', inset: 0 }}>
      <style>{CSS}</style>
      <div ref={elRef} role="application" aria-label={ariaLabel ?? t('map_aria')} data-testid="public-map"
        style={{ position: 'absolute', inset: 0 }} />
      {coarse && (!quiet || hint) && (
        <p role={quiet ? 'status' : undefined} style={{ position: 'absolute', left: 12, top: 10 + topInset, zIndex: 500, margin: 0, padding: '4px 8px', borderRadius: 6, background: 'rgba(15,15,26,0.8)', fontSize: 11.5, color: 'rgba(255,255,255,0.7)', pointerEvents: 'none' }}>
          {t('spot_map_two_fingers')}
        </p>
      )}
      {tilesFailed && (
        // A banner, not a cover: the pins keep working when the tiles do not load.
        <div role="alert" style={{
          position: 'absolute', left: 12, right: 72, top: (coarse && !quiet ? 52 : 10) + topInset, zIndex: 1000, maxWidth: 420,
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
