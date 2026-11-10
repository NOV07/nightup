'use client'
import { useLanguage } from '@/app/components/LanguageContext'
import { isInGreece, type Coords } from '@/app/lib/mapsCoords'
import type { PinInfo } from '@/app/lib/useMapsPin'
import LocationPicker from './LocationPicker'

const gold = 'rgba(232,160,32,0.07)'
const goldBorder = '1px solid rgba(232,160,32,0.22)'

/**
 * "We found the place": the place text, a small draggable map and the two
 * choices of the event form, "Change link" and "OK, that is correct".
 * Once confirmed the card keeps the map (still draggable) and shows a tick.
 */
export default function PinConfirmCard({ coords, info, confirmed, disabled, onPinChange, onConfirm, onChangeLink }: {
  coords: Coords
  info: PinInfo | null
  confirmed: boolean
  disabled?: boolean
  onPinChange: (lat: number, lng: number) => void
  onConfirm: () => void
  onChangeLink: () => void
}) {
  const { t } = useLanguage()
  const place = info?.placeText
  const shown = place ?? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`
  return (
    <div data-testid="pin-card" style={{ padding: '12px 14px', borderRadius: 12, backgroundColor: gold, border: goldBorder }}>
      <p style={{ fontSize: 12.5, color: '#E8A020', fontWeight: 700, margin: 0 }}>
        {confirmed ? t('event_map_confirmed') : t('event_map_found')}
      </p>
      <p data-testid="pin-place" style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 1.5, margin: '4px 0 10px', overflowWrap: 'anywhere' }}>
        {shown}
      </p>

      {info?.precision === 'viewport' && (
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 1.5, margin: '0 0 10px' }}>{t('spot_map_viewport_only')}</p>
      )}
      {(info?.precision === 'street') && (
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5, margin: '0 0 10px' }}>{t('spot_map_street_only')}</p>
      )}
      {info?.unverified && (
        <p style={{ fontSize: 12, color: '#E8A020', lineHeight: 1.5, margin: '0 0 10px' }}>⚠ {t('spot_map_unverified')}</p>
      )}

      <LocationPicker value={coords} onChange={onPinChange} disabled={disabled} />
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: '6px 0 0' }}>{t('spot_map_drag_hint')}</p>
      <p data-testid="pin-coords" style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.35)', margin: '4px 0 0' }}>
        {t('wizard_coords')}: {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
      </p>
      {!isInGreece(coords.lat, coords.lng) && (
        <p style={{ fontSize: 12, color: '#E8A020', margin: '4px 0 0' }}>⚠ {t('spot_maps_outside_greece')}</p>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
        <button type="button" onClick={onChangeLink} data-testid="pin-change-link"
          style={{ flex: 1, minHeight: 44, padding: '0 12px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', backgroundColor: 'transparent', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.18)' }}>
          {t('event_map_change_link')}
        </button>
        {!confirmed && (
          <button type="button" onClick={onConfirm} data-testid="pin-confirm"
            style={{ flex: 1, minHeight: 44, padding: '0 12px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', backgroundColor: '#E8A020', color: '#0F0F1A', border: 'none' }}>
            {t('event_map_confirm')}
          </button>
        )}
      </div>
    </div>
  )
}
