'use client'
import { useState, useEffect, useRef } from 'react'
import ImageUpload from '@/components/ui/ImageUpload'
import GalleryUpload from '@/components/ui/GalleryUpload'
import { GalleryPlayBadge } from '@/components/ui/GalleryLightbox'
import type { GalleryItem } from '@/app/lib/types'
import ImageCropper, { type CropBox } from '@/components/ui/ImageCropper'
import CroppedImage from '@/components/ui/CroppedImage'
import {
  SPOT_CATEGORIES, SUBCATEGORIES, SPOT_CROP_ASPECT, loc, type SpotCategory,
} from '@/app/spots/types'
import { SpotCategoryIcon } from '@/app/lib/spotIcons'
import SpotLivePreview from './SpotLivePreview'
import { useLanguage } from '@/app/components/LanguageContext'
import type { TranslationKey } from '@/app/lib/translations'
import { isShortMapsLink, isInGreece, validateCoords, type Coords } from '@/app/lib/mapsCoords'
import LocationPicker from '@/components/maps/LocationPicker'

// Same list the event wizard offers — spots had no city constant of its own.
const CITIES = ['Athens', 'Thessaloniki', 'Mykonos', 'Santorini', 'Heraklion', 'Patras', 'Rhodes', 'Ios', 'Corfu', 'Zakynthos']

export const MAX_GALLERY = 8

/** Written into opening_hours for a day the spot is shut. The public page
 *  prints the value verbatim, so this is the copy users actually see. */
export const CLOSED = 'Κλειστά'

export const DAYS = ['Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο', 'Κυριακή'] as const
export type Day = (typeof DAYS)[number]

// Stored values stay Greek (they are what the DB and public page hold) — only
// the wizard's display flips with the language toggle.
export const DAY_LABELS_EN: Record<Day, string> = {
  'Δευτέρα': 'Monday', 'Τρίτη': 'Tuesday', 'Τετάρτη': 'Wednesday', 'Πέμπτη': 'Thursday',
  'Παρασκευή': 'Friday', 'Σάββατο': 'Saturday', 'Κυριακή': 'Sunday',
}

const STEPS: { n: number; titleKey: TranslationKey }[] = [
  { n: 1, titleKey: 'wizard_step_basics' },
  { n: 2, titleKey: 'wizard_step_location' },
  { n: 3, titleKey: 'wizard_step_photos_hours' },
  { n: 4, titleKey: 'wizard_step_contact' },
]

// ── Style tokens (module-level — no state dependency) ─────────────────────
const inp: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  backgroundColor: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 12, padding: '12px 16px',
  color: 'white', fontSize: 14, outline: 'none',
}
const lbl: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.08em',
  color: 'rgba(255,255,255,0.4)', marginBottom: 6,
}

export interface DayHours { closed: boolean; hours: string }

export interface SpotFormData {
  name: string
  category: SpotCategory | ''
  subcategory: string
  city: string
  neighborhood: string
  address: string
  maps_url: string
  lat: number | null
  lng: number | null
  cover_image: string
  crop: CropBox | null
  gallery: GalleryItem[]
  opening_hours: Record<Day, DayHours>
  phone: string
  website: string
  instagram: string
  /** No longer edited in the wizard; carried through so an edit keeps the
   *  € level existing spots fall back to when price_text is empty. */
  price_level: number
  price_text: string
  description: string
}

type SetField = <K extends keyof SpotFormData>(k: K, v: SpotFormData[K]) => void

/**
 * Where the pin came from. UI only, never stored.
 *   url        exact coordinates from the Google link
 *   nominatim  street-level guess from the address in the link
 *   saved      the spot's stored coordinates (edit)
 *   manual     placed by the user on an empty map
 */
type PinSource = 'url' | 'nominatim' | 'saved' | 'manual'

/** What /api/maps/resolve answered for one link. */
interface ResolveOutcome {
  coords: Coords
  source: 'url' | 'nominatim'
  placeText?: string
  precision?: 'street' | 'building'
  unverified?: boolean
}

interface PinState {
  source: PinSource | null
  /** The user dragged the pin or tapped the map at least once. */
  touched: boolean
  /** Shown in the card above the map for a Nominatim result. */
  info: Omit<ResolveOutcome, 'coords' | 'source'> | null
}

const EMPTY_HOURS = DAYS.reduce((acc, d) => {
  acc[d] = { closed: false, hours: '' }
  return acc
}, {} as Record<Day, DayHours>)

const DEFAULTS: SpotFormData = {
  name: '', category: '', subcategory: '', city: '', neighborhood: '', address: '',
  maps_url: '', lat: null, lng: null, cover_image: '', crop: null, gallery: [],
  opening_hours: EMPTY_HOURS,
  phone: '', website: '', instagram: '', price_level: 0, price_text: '', description: '',
}

/**
 * Pulls coordinates out of a pasted Google Maps URL. Prefers the `@lat,lng`
 * the browser puts in the address bar; falls back to the `q=` / `ll=` params
 * some share links carry. Returns null when neither is present — the mobile
 * app's short share links have no coordinates in them at all; those are
 * expanded server-side by /api/maps/resolve (see ensureMapsCoords).
 */
export function parseLatLng(url: string): { lat: number; lng: number } | null {
  const at = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
  if (at) return { lat: parseFloat(at[1]), lng: parseFloat(at[2]) }
  const param = url.match(/[?&](?:q|ll)=(-?\d+\.\d+),(-?\d+\.\d+)/)
  if (param) return { lat: parseFloat(param[1]), lng: parseFloat(param[2]) }
  return null
}

/**
 * Flattens the per-day editor state into the `Record<string, string>` shape
 * SpotProfileClient renders. Days left blank are omitted rather than stored
 * empty, so the public page only lists days that mean something.
 */
export function serializeOpeningHours(hours: Record<Day, DayHours>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const day of DAYS) {
    const v = hours[day]
    if (!v) continue
    if (v.closed) out[day] = CLOSED
    else if (v.hours.trim()) out[day] = v.hours.trim()
  }
  return out
}

/** Inverse of serializeOpeningHours, for loading an existing spot into the form. */
export function deserializeOpeningHours(stored: Record<string, string> | null | undefined): Record<Day, DayHours> {
  const out = { ...EMPTY_HOURS }
  if (!stored) return out
  for (const day of DAYS) {
    const v = stored[day]
    if (v == null) continue
    out[day] = v === CLOSED ? { closed: true, hours: '' } : { closed: false, hours: v }
  }
  return out
}

/**
 * The exact row shape the API writes. Both the create and the edit client go
 * through this so the two paths cannot drift, and the crop box is flattened
 * into the four columns the table actually has.
 */
export function spotFormToPayload(form: SpotFormData) {
  return {
    name: form.name.trim(),
    category: form.category,
    subcategory: form.subcategory || null,
    city: form.city,
    neighborhood: form.neighborhood.trim() || null,
    address: form.address.trim() || null,
    lat: form.lat,
    lng: form.lng,
    description: form.description.trim() || null,
    cover_image: form.cover_image || null,
    crop_x: form.crop?.crop_x ?? null,
    crop_y: form.crop?.crop_y ?? null,
    crop_width: form.crop?.crop_width ?? null,
    crop_height: form.crop?.crop_height ?? null,
    gallery: form.gallery,
    price_level: form.price_level || null,
    price_text: form.price_text.trim() || null,
    phone: form.phone.trim() || null,
    website: form.website.trim() || null,
    instagram: form.instagram.trim() || null,
    opening_hours: serializeOpeningHours(form.opening_hours),
  }
}

interface Props {
  initialData?: Partial<SpotFormData>
  onSubmit: (data: SpotFormData) => void
  loading: boolean
  error: string
  /** Editing an existing spot — changes the submit button copy. */
  isEdit?: boolean
}

// ── Sub-components (outside the default export to avoid remount per render) ──

function Err({ stepErrors, k }: { stepErrors: Record<string, string>; k: string }) {
  return stepErrors[k] ? <p style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{stepErrors[k]}</p> : null
}

function StepIndicator({ step, setStep }: { step: number; setStep: (n: number) => void }) {
  const { t } = useLanguage()
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 36 }}>
      {STEPS.map((s, i) => (
        <div key={s.n} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: s.n < step ? 'pointer' : 'default' }}
            onClick={() => { if (s.n < step) setStep(s.n) }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700,
              backgroundColor: step === s.n ? '#E8A020' : s.n < step ? 'rgba(232,160,32,0.2)' : 'rgba(255,255,255,0.06)',
              color: step === s.n ? '#0F0F1A' : s.n < step ? '#E8A020' : 'rgba(255,255,255,0.3)',
              border: s.n < step ? '1px solid rgba(232,160,32,0.4)' : 'none',
              transition: 'all 0.2s',
            }}>
              {s.n < step ? '✓' : s.n}
            </div>
            <span style={{
              fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em',
              color: step === s.n ? '#E8A020' : s.n < step ? 'rgba(232,160,32,0.6)' : 'rgba(255,255,255,0.25)',
              whiteSpace: 'nowrap',
            }}>
              {t(s.titleKey)}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div style={{
              flex: 1, height: 1, margin: '0 8px', marginBottom: 20,
              backgroundColor: s.n < step ? 'rgba(232,160,32,0.3)' : 'rgba(255,255,255,0.08)',
            }} />
          )}
        </div>
      ))}
    </div>
  )
}

function Step1({ form, set, stepErrors }: {
  form: SpotFormData; set: SetField; stepErrors: Record<string, string>
}) {
  const { t, lang } = useLanguage()
  const subs = form.category ? SUBCATEGORIES[form.category] : []
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <label style={lbl}>{t('wizard_category')} *</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
          {SPOT_CATEGORIES.map(c => {
            const on = form.category === c.key
            return (
              <button key={c.key} type="button"
                onClick={() => {
                  set('category', c.key)
                  // The subcategory list is per-category, so a stale pick cannot carry over.
                  if (form.category !== c.key) set('subcategory', '')
                }}
                style={{
                  textAlign: 'left', padding: '14px 14px', borderRadius: 14, cursor: 'pointer',
                  transition: 'all 0.15s', minHeight: 84,
                  backgroundColor: on ? 'rgba(232,160,32,0.14)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${on ? 'rgba(232,160,32,0.45)' : 'rgba(255,255,255,0.1)'}`,
                }}>
                <div style={{ lineHeight: 1, display: 'flex' }}><SpotCategoryIcon category={c.key} size={22} /></div>
                <div style={{ fontSize: 14, fontWeight: 700, marginTop: 8, color: on ? '#E8A020' : 'white' }}>{loc(lang, c.label, c.label_en)}</div>
                <div style={{ fontSize: 10, marginTop: 3, color: 'rgba(255,255,255,0.35)', lineHeight: 1.4 }}>{loc(lang, c.sub, c.sub_en)}</div>
              </button>
            )
          })}
        </div>
        <Err stepErrors={stepErrors} k="category" />
      </div>

      {form.category && (
        <div>
          <label style={lbl}>{t('wizard_subcategory')}</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {subs.map(s => {
              const on = form.subcategory === s.value
              return (
                <button key={s.value} type="button"
                  onClick={() => set('subcategory', on ? '' : s.value)}
                  style={{
                    padding: '6px 14px', borderRadius: 999, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s',
                    backgroundColor: on ? 'rgba(232,160,32,0.18)' : 'rgba(255,255,255,0.05)',
                    color: on ? '#E8A020' : 'rgba(255,255,255,0.4)',
                    border: `1px solid ${on ? 'rgba(232,160,32,0.4)' : 'rgba(255,255,255,0.1)'}`,
                  }}>
                  {loc(lang, s.label, s.label_en)}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div>
        <label style={lbl}>{t('wizard_name')} *</label>
        <input style={inp} value={form.name} onChange={e => set('name', e.target.value)} placeholder={t('spot_wizard_name_ph')} />
        <Err stepErrors={stepErrors} k="name" />
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <span aria-hidden style={{
      display: 'inline-block', width: 12, height: 12, marginRight: 8, verticalAlign: '-1px',
      border: '2px solid rgba(232,160,32,0.3)', borderTopColor: '#E8A020', borderRadius: '50%',
      animation: 'nightup-spin 0.8s linear infinite',
    }} />
  )
}

function Step2({ form, set, stepErrors, mapsChecking, onMapsChange, onMapsBlur, pin, notFound, unreachable, onPinChange, isEdit }: {
  form: SpotFormData; set: SetField; stepErrors: Record<string, string>
  mapsChecking: boolean
  onMapsChange: (value: string) => void
  onMapsBlur: () => void
  pin: PinState
  notFound: boolean
  unreachable: boolean
  onPinChange: (lat: number, lng: number) => void
  isEdit: boolean
}) {
  const { t } = useLanguage()
  const hasPin = form.lat != null && form.lng != null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <label style={lbl}>{t('wizard_city')} *</label>
        <div style={{ position: 'relative' }}>
          <select style={{ ...inp, appearance: 'none', cursor: 'pointer', backgroundColor: '#0F0F1A' }}
            value={form.city} onChange={e => set('city', e.target.value)}>
            <option value="">{t('wizard_pick_city')}</option>
            {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: '#E8A020', pointerEvents: 'none' }}>▾</span>
        </div>
        <Err stepErrors={stepErrors} k="city" />
      </div>

      <div>
        <label style={lbl}>{t('wizard_neighborhood')}</label>
        <input style={inp} value={form.neighborhood} onChange={e => set('neighborhood', e.target.value)} placeholder={t('wizard_neigh_ph')} />
      </div>

      <div>
        <label style={lbl}>{t('wizard_address')} *</label>
        <input style={inp} value={form.address} onChange={e => set('address', e.target.value)} placeholder={t('wizard_address_ph')} />
        <Err stepErrors={stepErrors} k="address" />
      </div>

      <div>
        <label style={lbl}>Google Maps link{isEdit ? '' : ' *'}</label>
        {isEdit && (
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 8 }}>{t('spot_map_link_optional')}</p>
        )}
        <div style={{
          padding: '12px 14px', borderRadius: 12, marginBottom: 10,
          backgroundColor: 'rgba(232,160,32,0.07)', border: '1px solid rgba(232,160,32,0.22)',
        }}>
          <p style={{ fontSize: 12, color: '#E8A020', fontWeight: 700, marginBottom: 6 }}>{t('spot_maps_help_title')}</p>
          <ol style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, paddingLeft: 16, margin: 0 }}>
            <li>{t('spot_maps_help_1')}</li>
            <li>{t('spot_maps_help_2')}</li>
            <li>{t('spot_maps_help_3')}</li>
          </ol>
          <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.45)', marginTop: 8, lineHeight: 1.6 }}>
            {t('spot_maps_note_1')}
          </p>
        </div>
        <input style={inp} value={form.maps_url}
          onChange={e => onMapsChange(e.target.value)}
          onBlur={onMapsBlur}
          placeholder="https://maps.app.goo.gl/... | https://www.google.com/maps/..." />
        <Err stepErrors={stepErrors} k="maps_url" />
        {/* Fixed height whether or not a check runs, so nothing below jumps under a finger. */}
        <p role="status" style={{ fontSize: 12, color: '#E8A020', marginTop: 6, minHeight: 18 }}>
          {mapsChecking && <><Spinner />{t('spot_maps_checking')}</>}
        </p>
      </div>

      <div>
        <label style={lbl}>{t('spot_map_label')} *</label>

        {pin.source === 'nominatim' && pin.info?.placeText && (
          <div data-testid="map-nominatim-card" style={{
            padding: '12px 14px', borderRadius: 12, marginBottom: 10,
            backgroundColor: 'rgba(232,160,32,0.07)', border: '1px solid rgba(232,160,32,0.22)',
          }}>
            <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>
              <span style={{ color: '#E8A020', fontWeight: 700 }}>{t('spot_map_from_link')}</span> {pin.info.placeText}
            </p>
            {pin.info.precision !== 'building' && (
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 6, lineHeight: 1.5 }}>{t('spot_map_street_only')}</p>
            )}
            {pin.info.unverified && (
              <p style={{ fontSize: 12, color: '#E8A020', marginTop: 6, lineHeight: 1.5 }}>⚠ {t('spot_map_unverified')}</p>
            )}
          </div>
        )}

        {notFound && !hasPin && (
          <div role="alert" data-testid="map-not-found" style={{
            padding: '12px 14px', borderRadius: 12, marginBottom: 10,
            backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.35)',
          }}>
            <p style={{ fontSize: 13, color: '#ef4444', fontWeight: 700 }}>{t('spot_map_not_found')}</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>{t('spot_map_tap_to_place')}</p>
            {unreachable && (
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>{t('err_maps_unreachable')}</p>
            )}
          </div>
        )}

        <LocationPicker value={hasPin ? { lat: form.lat as number, lng: form.lng as number } : null}
          onChange={onPinChange} disabled={mapsChecking} />

        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 6 }}>
          {hasPin ? t('spot_map_drag_hint') : notFound ? null : t('spot_map_tap_to_place')}
        </p>
        <Err stepErrors={stepErrors} k="pin" />
        {hasPin && (
          <>
            <p data-testid="map-coords" style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>
              {t('wizard_coords')}: {(form.lat as number).toFixed(6)}, {(form.lng as number).toFixed(6)}
            </p>
            {!isInGreece(form.lat as number, form.lng as number) && (
              <p style={{ fontSize: 12, color: '#E8A020', marginTop: 4 }}>⚠ {t('spot_maps_outside_greece')}</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function Step3({ form, set, stepErrors, onGalleryAdd, onGalleryRemove, showCropper, setShowCropper }: {
  form: SpotFormData; set: SetField; stepErrors: Record<string, string>
  onGalleryAdd: (item: GalleryItem) => void
  onGalleryRemove: (i: number) => void
  showCropper: boolean
  setShowCropper: (v: boolean) => void
}) {
  const { t, lang } = useLanguage()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {/* Cover */}
      <div>
        <label style={lbl}>{t('wizard_cover')} *</label>
        {form.cover_image ? (
          <div>
            <div style={{ position: 'relative', width: '100%', aspectRatio: `${SPOT_CROP_ASPECT}`, borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
              <CroppedImage src={form.cover_image} alt="" crop={form.crop} sizes="(max-width: 980px) 100vw, 620px" />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <button type="button" onClick={() => setShowCropper(true)}
                style={{ padding: '8px 16px', borderRadius: 10, fontSize: 12, cursor: 'pointer', backgroundColor: 'rgba(232,160,32,0.1)', color: '#E8A020', border: '1px solid rgba(232,160,32,0.3)' }}>
                {t('wizard_adjust_crop')}
              </button>
              <button type="button" onClick={() => { set('cover_image', ''); set('crop', null) }}
                style={{ padding: '8px 16px', borderRadius: 10, fontSize: 12, cursor: 'pointer', backgroundColor: 'transparent', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.12)' }}>
                {t('common_remove')}
              </button>
            </div>
          </div>
        ) : (
          <ImageUpload folder="spots" onUpload={url => { set('cover_image', url); set('crop', null) }} />
        )}
        <Err stepErrors={stepErrors} k="cover_image" />

        {showCropper && form.cover_image && (
          <div style={{ marginTop: 12 }}>
            <ImageCropper
              imageUrl={form.cover_image}
              aspect={SPOT_CROP_ASPECT}
              initialCrop={form.crop}
              onConfirm={(box: CropBox) => { set('crop', box); setShowCropper(false) }}
              onCancel={() => setShowCropper(false)}
            />
          </div>
        )}
      </div>

      {/* Gallery */}
      <div>
        <label style={lbl}>
          Gallery{' '}
          <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'rgba(255,255,255,0.40)' }}>
            {t('wizard_gallery_optional_max')} {MAX_GALLERY})
          </span>
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 10 }}>
          {form.gallery.map((item, i) => (
            <div key={`${item.url}-${i}`} className="group"
              style={{ position: 'relative', aspectRatio: '1 / 1', borderRadius: 12, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
              {(item.type === 'video' ? item.poster : item.url)
                ? <img src={item.type === 'video' ? item.poster : item.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                : <div style={{ width: '100%', height: '100%' }} />}
              {item.type === 'video' && <GalleryPlayBadge size={26} />}
              <button type="button" onClick={() => onGalleryRemove(i)} aria-label={t('wizard_remove_file')}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, cursor: 'pointer', backgroundColor: 'rgba(0,0,0,0.7)', color: 'white', border: 'none' }}>
                ×
              </button>
            </div>
          ))}
          {form.gallery.length < MAX_GALLERY && (
            <div style={{ aspectRatio: '1 / 1', borderRadius: 12, overflow: 'hidden', border: '1px dashed rgba(255,255,255,0.15)' }}>
              <GalleryUpload context="spot" onUpload={onGalleryAdd} />
            </div>
          )}
        </div>
      </div>

      {/* Opening hours */}
      <div>
        <label style={lbl}>{t('spots_hours')}</label>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.30)', marginBottom: 10 }}>
          {t('wizard_hours_hint')}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {DAYS.map(day => {
            const v = form.opening_hours[day]
            return (
              <div key={day} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 92, flexShrink: 0, fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{lang === 'en' ? DAY_LABELS_EN[day] : day}</span>
                <button type="button"
                  onClick={() => set('opening_hours', { ...form.opening_hours, [day]: { closed: !v.closed, hours: '' } })}
                  style={{
                    padding: '6px 12px', borderRadius: 999, fontSize: 11, cursor: 'pointer', flexShrink: 0, minWidth: 76,
                    backgroundColor: v.closed ? 'rgba(239,68,68,0.14)' : 'rgba(34,197,94,0.12)',
                    color: v.closed ? '#ef4444' : '#22c55e',
                    border: `1px solid ${v.closed ? 'rgba(239,68,68,0.35)' : 'rgba(34,197,94,0.3)'}`,
                  }}>
                  {v.closed ? t('wizard_closed') : t('wizard_open')}
                </button>
                <input
                  style={{ ...inp, padding: '9px 14px', opacity: v.closed ? 0.35 : 1 }}
                  disabled={v.closed}
                  value={v.hours}
                  onChange={e => set('opening_hours', { ...form.opening_hours, [day]: { closed: false, hours: e.target.value } })}
                  placeholder={t('wizard_hours_ph')} />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Step4({ form, set, stepErrors }: {
  form: SpotFormData; set: SetField; stepErrors: Record<string, string>
}) {
  const { t, lang } = useLanguage()
  const cat = SPOT_CATEGORIES.find(c => c.key === form.category)
  const hours = serializeOpeningHours(form.opening_hours)
  const catLabel = cat ? loc(lang, cat.label, cat.label_en) : undefined
  const subLabelDef = form.category && form.subcategory
    ? SUBCATEGORIES[form.category]?.find(s => s.value === form.subcategory)
    : null
  const subLabel = subLabelDef ? loc(lang, subLabelDef.label, subLabelDef.label_en) : form.subcategory
  const summary: { label: string; value: string }[] = [
    { label: t('wizard_category'), value: [catLabel, subLabel].filter(Boolean).join(' · ') || '—' },
    { label: t('wizard_step_location'), value: [form.address, form.neighborhood, form.city].filter(Boolean).join(', ') || '—' },
    { label: t('wizard_coords'), value: form.lat != null && form.lng != null ? `${form.lat.toFixed(5)}, ${form.lng.toFixed(5)}` : '—' },
    { label: t('dashboard_photos'), value: `${form.cover_image ? 1 : 0} ${t('wizard_photos_cover_count')} · ${form.gallery.length} gallery` },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <label style={lbl}>{t('dashboard_phone')}</label>
        <input style={inp} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder={t('wizard_phone_ph')} />
      </div>

      <div>
        <label style={lbl}>Website</label>
        <input style={inp} value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://..." />
      </div>

      <div>
        <label style={lbl}>Instagram</label>
        <input style={inp} value={form.instagram} onChange={e => set('instagram', e.target.value)} placeholder="https://instagram.com/..." />
      </div>

      <div>
        <label style={lbl}>{t('spot_price_label')}</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* 40 mirrors the spots_price_text_length_check constraint. */}
          <input style={{ ...inp, flex: 1, minWidth: 0 }} maxLength={40}
            value={form.price_text} onChange={e => set('price_text', e.target.value)}
            placeholder={t('spot_price_ph')} />
          <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {t('spots_price_per_person')}
          </span>
        </div>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 6 }}>{t('spot_price_hint')}</p>
      </div>

      <div>
        <label style={lbl}>
          {t('wizard_description')} *{' '}
          <span style={{ color: 'rgba(255,255,255,0.40)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
            {form.description.length}/600
          </span>
        </label>
        <textarea style={{ ...inp, minHeight: 110, resize: 'vertical' }} maxLength={600}
          value={form.description} onChange={e => set('description', e.target.value)}
          placeholder={t('spot_desc_ph')} />
        <Err stepErrors={stepErrors} k="description" />
      </div>

      {/* Review */}
      <div style={{ padding: '16px 18px', borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.4)', marginBottom: 12 }}>
          {t('wizard_review_heading')}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {summary.map(row => (
            <div key={row.label} style={{ display: 'flex', gap: 12, fontSize: 12.5 }}>
              <span style={{ width: 108, flexShrink: 0, color: 'rgba(255,255,255,0.35)' }}>{row.label}</span>
              <span style={{ color: 'rgba(255,255,255,0.8)' }}>{row.value}</span>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 12, fontSize: 12.5 }}>
            <span style={{ width: 108, flexShrink: 0, color: 'rgba(255,255,255,0.35)' }}>{t('spots_hours')}</span>
            <span style={{ color: 'rgba(255,255,255,0.8)' }}>
              {Object.keys(hours).length === 0
                ? '—'
                : Object.entries(hours).map(([d, h]) => {
                    const day = lang === 'en' ? DAY_LABELS_EN[d as Day] ?? d : d
                    const val = lang === 'en' && h === CLOSED ? t('wizard_closed') : h
                    return `${day}: ${val}`
                  }).join(' · ')}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SpotFormSteps({ initialData, onSubmit, loading, error, isEdit = false }: Props) {
  const { t } = useLanguage()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<SpotFormData>({ ...DEFAULTS, ...initialData })
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({})
  const [isMobile, setIsMobile] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [showCropper, setShowCropper] = useState(false)
  const [mapsChecking, setMapsChecking] = useState(false)
  const [pin, setPinState] = useState<PinState>(() => ({
    source: initialData?.lat != null && initialData?.lng != null ? 'saved' : null, touched: false, info: null,
  }))
  const [notFound, setNotFound] = useState(false)
  const [unreachable, setUnreachable] = useState(false)

  // Short-link resolution state. Refs, not state: next() awaits the in-flight
  // call and must see the latest field value after the await.
  const formRef = useRef(form)
  useEffect(() => { formRef.current = form })
  const pinRef = useRef(pin)
  const setPin = (p: PinState) => { pinRef.current = p; setPinState(p) }
  const mapsUrlRef = useRef(form.maps_url)
  const mapsInflight = useRef<{ url: string; promise: Promise<ResolveOutcome | null>; ctrl: AbortController } | null>(null)
  const mapsResolved = useRef<{ url: string; outcome: ResolveOutcome } | null>(null)
  // A link the server said has no place in it. Not asked again on blur or
  // "Continue": a re-check would hide the notice and shift the button mid-tap.
  const mapsNoCoordsUrl = useRef<string | null>(null)
  const mapsFail = useRef<'failed' | 'unreachable' | null>(null)
  const mapsDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const advancing = useRef(false)

  useEffect(() => () => {
    mapsInflight.current?.ctrl.abort()
    if (mapsDebounce.current) clearTimeout(mapsDebounce.current)
  }, [])

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 980)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const set: SetField = (k, v) => {
    setForm(prev => ({ ...prev, [k]: v }))
    setStepErrors(prev => ({ ...prev, [k]: '' }))
  }

  function addGalleryImage(item: GalleryItem) {
    setForm(prev => prev.gallery.length >= MAX_GALLERY ? prev : { ...prev, gallery: [...prev.gallery, item] })
  }

  function removeGalleryImage(index: number) {
    setForm(prev => ({ ...prev, gallery: prev.gallery.filter((_, i) => i !== index) }))
  }

  function onMapsChange(value: string) {
    // Any edit invalidates whatever resolve is running for the old text.
    mapsUrlRef.current = value
    mapsInflight.current?.ctrl.abort()
    mapsInflight.current = null
    mapsResolved.current = null
    mapsNoCoordsUrl.current = null
    mapsFail.current = null
    if (mapsDebounce.current) clearTimeout(mapsDebounce.current)
    setMapsChecking(false)
    setNotFound(false)
    setUnreachable(false)
    setStepErrors(prev => ({ ...prev, maps_url: '', pin: '' }))

    // Clearing the field keeps the pin: the pin, not the link, is what is saved.
    if (!value.trim()) {
      setForm(prev => ({ ...prev, maps_url: value }))
      return
    }
    // A new link means a new place: drop the old pin until this one resolves.
    const parsed = parseLatLng(value)
    setForm(prev => ({ ...prev, maps_url: value, lat: parsed?.lat ?? null, lng: parsed?.lng ?? null }))
    setPin({ source: parsed ? 'url' : null, touched: false, info: null })
    // Pasting is one change; typing is many. Resolve once the text settles.
    if (!parsed) mapsDebounce.current = setTimeout(() => { void ensureMapsCoords() }, 400)
  }

  /** The user tapped the map or dropped the pin. */
  function onPinChange(lat: number, lng: number) {
    setForm(prev => ({ ...prev, lat, lng }))
    const cur = pinRef.current
    setPin({ source: cur.source ?? 'manual', touched: true, info: cur.info })
    setNotFound(false)
    setStepErrors(prev => ({ ...prev, maps_url: '', pin: '' }))
  }

  /**
   * Coordinates for the current maps_url. Full links parse locally and never
   * touch the server; short app links go to /api/maps/resolve. One call per
   * distinct URL: a second caller (debounce, blur, then "Next") shares the
   * in-flight promise. The result is applied only if the field still holds
   * the URL that was sent.
   */
  function ensureMapsCoords(): Promise<ResolveOutcome | null> {
    const url = mapsUrlRef.current
    if (!url.trim()) return Promise.resolve(null)
    const parsed = parseLatLng(url)
    if (parsed) return Promise.resolve({ coords: parsed, source: 'url' })
    if (!isShortMapsLink(url)) {
      setNotFound(true)
      return Promise.resolve(null)
    }
    if (mapsResolved.current?.url === url) return Promise.resolve(mapsResolved.current.outcome)
    if (mapsNoCoordsUrl.current === url) return Promise.resolve(null)
    if (mapsInflight.current?.url === url) return mapsInflight.current.promise

    const ctrl = new AbortController()
    mapsFail.current = null
    setMapsChecking(true)
    const promise: Promise<ResolveOutcome | null> = (async () => {
      try {
        const res = await fetch('/api/maps/resolve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
          signal: ctrl.signal,
        })
        const data = await res.json().catch(() => null)
        if (mapsUrlRef.current !== url) return null
        const ok = res.ok ? validateCoords(data?.lat, data?.lng) : { ok: false as const }
        if (ok.ok) {
          const outcome: ResolveOutcome = data?.source === 'nominatim'
            ? {
                coords: { lat: ok.lat, lng: ok.lng }, source: 'nominatim',
                placeText: typeof data.placeText === 'string' ? data.placeText : undefined,
                precision: data.precision === 'building' ? 'building' : 'street',
                unverified: data.unverified === true,
              }
            : { coords: { lat: ok.lat, lng: ok.lng }, source: 'url' }
          mapsResolved.current = { url, outcome }
          // Skip if the user already placed a pin by hand while this was running.
          if (!pinRef.current.touched) {
            setForm(prev => prev.maps_url === url ? { ...prev, lat: outcome.coords.lat, lng: outcome.coords.lng } : prev)
            setPin({
              source: outcome.source, touched: false,
              info: outcome.source === 'nominatim'
                ? { placeText: outcome.placeText, precision: outcome.precision, unverified: outcome.unverified }
                : null,
            })
          }
          return outcome
        }
        mapsFail.current = res.status === 400 || res.status === 422 ? 'failed' : 'unreachable'
        // Only a definite "no place here" is remembered; network trouble may pass.
        if (mapsFail.current === 'failed') mapsNoCoordsUrl.current = url
        setUnreachable(mapsFail.current === 'unreachable')
        setNotFound(true)
        return null
      } catch {
        if (mapsUrlRef.current === url && !ctrl.signal.aborted) {
          mapsFail.current = 'unreachable'
          setUnreachable(true)
          setNotFound(true)
        }
        return null
      } finally {
        if (mapsInflight.current?.ctrl === ctrl) {
          mapsInflight.current = null
          setMapsChecking(false)
        }
      }
    })()
    mapsInflight.current = { url, promise, ctrl }
    return promise
  }

  /**
   * The pin to validate. Right after a resolve, `form` may not have re-rendered
   * yet, so a fresh outcome stands in for a still-empty pin.
   */
  function effectivePin(f: SpotFormData, resolved: ResolveOutcome | null) {
    if (f.lat != null && f.lng != null) return { lat: f.lat, lng: f.lng, ...pinRef.current }
    if (resolved && !pinRef.current.touched) return { ...resolved.coords, source: resolved.source, touched: false }
    return null
  }

  function validate(n: number, f: SpotFormData = form, resolved: ResolveOutcome | null = null): Record<string, string> {
    const e: Record<string, string> = {}
    const form = f
    if (n === 1) {
      if (!form.category) e.category = t('err_pick_category')
      if (!form.name.trim()) e.name = t('err_name_required')
    }
    if (n === 2) {
      if (!form.city) e.city = t('err_pick_city')
      if (!form.address.trim()) e.address = t('err_address_required')
      // The link is how a new spot finds its place; an edit already has a pin.
      if (!isEdit && !form.maps_url.trim()) e.maps_url = t('err_maps_required')
      const p = effectivePin(form, resolved)
      if (!p || !validateCoords(p.lat, p.lng).ok) {
        e.pin = t('err_map_pin_required')
      } else if (p.source === 'nominatim' && !p.touched) {
        // A street-level guess has to be confirmed on the map.
        e.pin = t('err_map_confirm_pin')
      }
    }
    if (n === 3) {
      if (!form.cover_image) e.cover_image = t('err_cover_required')
    }
    if (n === 4) {
      if (!form.description.trim()) e.description = t('err_desc_required')
    }
    return e
  }

  async function next() {
    if (advancing.current) return
    if (step !== 2) {
      const errs = validate(step)
      if (Object.keys(errs).length) { setStepErrors(errs); return }
      setStep(s => s + 1)
      return
    }
    // Location step: wait for a running short-link lookup (or start one).
    advancing.current = true
    try {
      const url = mapsUrlRef.current
      const coords = await ensureMapsCoords()
      if (mapsUrlRef.current !== url) return // field edited while waiting
      const errs = validate(2, formRef.current, coords)
      if (Object.keys(errs).length) { setStepErrors(errs); return }
      setStep(s => s + 1)
    } finally {
      advancing.current = false
    }
  }

  function back() { setStep(s => s - 1) }

  function handleFinalSubmit() {
    // Re-check every step, not just the last: a user can jump back via the
    // indicator and clear a required field before submitting.
    for (const n of [1, 2, 3, 4]) {
      const errs = validate(n)
      if (Object.keys(errs).length) { setStepErrors(errs); setStep(n); return }
    }
    onSubmit(form)
  }

  // Step 2 "Continue" looks enabled only with a pin that needs no confirmation.
  const locationReady = step !== 2 || (
    !mapsChecking && form.lat != null && form.lng != null && validateCoords(form.lat, form.lng).ok
    && !(pin.source === 'nominatim' && !pin.touched)
  )

  return (
    <div style={{
      maxWidth: isMobile ? 640 : 1060, margin: '0 auto',
      display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 380px',
      gap: 28, alignItems: 'start',
    }}>
      <style>{'@keyframes nightup-spin { to { transform: rotate(360deg) } }'}</style>
      <div>
        {isMobile && (
          <button type="button" onClick={() => setPreviewOpen(true)}
            style={{
              width: '100%', padding: '11px 0', marginBottom: 20, borderRadius: 12,
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              backgroundColor: 'rgba(232,160,32,0.10)', color: '#E8A020',
              border: '1px solid rgba(232,160,32,0.35)',
            }}>
            👁 {t('wizard_preview')}
          </button>
        )}

        <StepIndicator step={step} setStep={setStep} />

        <div style={{ backgroundColor: '#111120', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '32px 28px' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'white', marginBottom: 24 }}>
            {t(STEPS[step - 1].titleKey)}
          </h2>

          {step === 1 && <Step1 form={form} set={set} stepErrors={stepErrors} />}
          {step === 2 && (
            <Step2 form={form} set={set} stepErrors={stepErrors} mapsChecking={mapsChecking}
              onMapsChange={onMapsChange} onMapsBlur={() => { void ensureMapsCoords() }}
              pin={pin} notFound={notFound} unreachable={unreachable} onPinChange={onPinChange} isEdit={isEdit} />
          )}
          {step === 3 && (
            <Step3 form={form} set={set} stepErrors={stepErrors}
              onGalleryAdd={addGalleryImage} onGalleryRemove={removeGalleryImage}
              showCropper={showCropper} setShowCropper={setShowCropper} />
          )}
          {step === 4 && <Step4 form={form} set={set} stepErrors={stepErrors} />}

          {error && (
            <div style={{ marginTop: 20, padding: '12px 16px', borderRadius: 10, backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: 13 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
            {step > 1 && (
              <button type="button" onClick={back}
                style={{ flex: 1, padding: '13px 0', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', backgroundColor: 'transparent', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.12)' }}>
                {t('common_back')}
              </button>
            )}
            {step < 4 ? (
              // Stays clickable while a link resolves (next() waits for it) and
              // when dimmed, so a click explains what is missing.
              <button type="button" onClick={next} aria-busy={mapsChecking} aria-disabled={!locationReady}
                data-testid="wizard-next"
                style={{ flex: 1, padding: '13px 0', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: mapsChecking ? 'wait' : 'pointer', opacity: mapsChecking ? 0.6 : locationReady ? 1 : 0.4, backgroundColor: '#E8A020', color: '#0F0F1A', border: 'none' }}>
                {t('event_form_continue')}
              </button>
            ) : (
              <button type="button" onClick={handleFinalSubmit} disabled={loading} data-testid="wizard-submit"
                style={{ flex: 1, padding: '13px 0', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.6 : 1, backgroundColor: '#E8A020', color: '#0F0F1A', border: 'none' }}>
                {loading ? t('dashboard_saving') : isEdit ? t('wizard_save_changes') : t('wizard_submit_spot')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Desktop: sticky side-by-side preview */}
      {!isMobile && (
        <aside style={{ position: 'sticky', top: 0 }}>
          <p style={{ ...lbl, marginBottom: 12 }}>{t('wizard_preview')}</p>
          <SpotLivePreview form={form} step={step} />
        </aside>
      )}

      {/* Mobile: bottom sheet preview */}
      {isMobile && previewOpen && (
        <div onClick={() => setPreviewOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 60, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'flex-end' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxHeight: '88vh', overflowY: 'auto', backgroundColor: '#111120', borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTop: '0.5px solid rgba(255,255,255,0.10)', padding: '18px 16px 28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <p style={{ ...lbl, marginBottom: 0 }}>{t('wizard_preview')}</p>
              <button type="button" onClick={() => setPreviewOpen(false)}
                style={{ padding: '6px 14px', borderRadius: 999, fontSize: 12, cursor: 'pointer', backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.12)' }}>
                {t('common_close')}
              </button>
            </div>
            <SpotLivePreview form={form} step={step} />
          </div>
        </div>
      )}
    </div>
  )
}
