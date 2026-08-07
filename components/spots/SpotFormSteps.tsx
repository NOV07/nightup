'use client'
import { useState, useEffect } from 'react'
import ImageUpload from '@/components/ui/ImageUpload'
import ImageCropper, { type CropBox } from '@/components/ui/ImageCropper'
import CroppedImage from '@/components/ui/CroppedImage'
import {
  SPOT_CATEGORIES, SUBCATEGORIES, SPOT_CROP_ASPECT, type SpotCategory,
} from '@/app/spots/types'
import SpotLivePreview from './SpotLivePreview'

// Same list the event wizard offers — spots had no city constant of its own.
const CITIES = ['Athens', 'Thessaloniki', 'Mykonos', 'Santorini', 'Heraklion', 'Patras', 'Rhodes', 'Ios', 'Corfu', 'Zakynthos']

export const MAX_GALLERY = 8

/** Written into opening_hours for a day the spot is shut. The public page
 *  prints the value verbatim, so this is the copy users actually see. */
export const CLOSED = 'Κλειστά'

export const DAYS = ['Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο', 'Κυριακή'] as const
export type Day = (typeof DAYS)[number]

const STEPS = [
  { n: 1, title: 'Τα βασικά' },
  { n: 2, title: 'Τοποθεσία' },
  { n: 3, title: 'Φωτογραφίες & Ώρες' },
  { n: 4, title: 'Επικοινωνία' },
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
  gallery: string[]
  opening_hours: Record<Day, DayHours>
  phone: string
  website: string
  instagram: string
  price_level: number
  description: string
}

type SetField = <K extends keyof SpotFormData>(k: K, v: SpotFormData[K]) => void

const EMPTY_HOURS = DAYS.reduce((acc, d) => {
  acc[d] = { closed: false, hours: '' }
  return acc
}, {} as Record<Day, DayHours>)

const DEFAULTS: SpotFormData = {
  name: '', category: '', subcategory: '', city: '', neighborhood: '', address: '',
  maps_url: '', lat: null, lng: null, cover_image: '', crop: null, gallery: [],
  opening_hours: EMPTY_HOURS,
  phone: '', website: '', instagram: '', price_level: 0, description: '',
}

/**
 * Pulls coordinates out of a pasted Google Maps URL. Prefers the `@lat,lng`
 * the browser puts in the address bar; falls back to the `q=` / `ll=` params
 * some share links carry. Returns null when neither is present — the mobile
 * app's short share links have no coordinates in them at all.
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
              {s.title}
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
  const subs = form.category ? SUBCATEGORIES[form.category] : []
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <label style={lbl}>Κατηγορία *</label>
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
                <div style={{ fontSize: 22, lineHeight: 1 }}>{c.emoji}</div>
                <div style={{ fontSize: 14, fontWeight: 700, marginTop: 8, color: on ? '#E8A020' : 'white' }}>{c.label}</div>
                <div style={{ fontSize: 10, marginTop: 3, color: 'rgba(255,255,255,0.35)', lineHeight: 1.4 }}>{c.sub}</div>
              </button>
            )
          })}
        </div>
        <Err stepErrors={stepErrors} k="category" />
      </div>

      {form.category && (
        <div>
          <label style={lbl}>Υποκατηγορία</label>
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
                  {s.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div>
        <label style={lbl}>Όνομα *</label>
        <input style={inp} value={form.name} onChange={e => set('name', e.target.value)} placeholder="π.χ. Κήπος Rooftop" />
        <Err stepErrors={stepErrors} k="name" />
      </div>
    </div>
  )
}

function Step2({ form, set, stepErrors }: {
  form: SpotFormData; set: SetField; stepErrors: Record<string, string>
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <label style={lbl}>Πόλη *</label>
        <div style={{ position: 'relative' }}>
          <select style={{ ...inp, appearance: 'none', cursor: 'pointer', backgroundColor: '#0F0F1A' }}
            value={form.city} onChange={e => set('city', e.target.value)}>
            <option value="">Διάλεξε πόλη...</option>
            {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: '#E8A020', pointerEvents: 'none' }}>▾</span>
        </div>
        <Err stepErrors={stepErrors} k="city" />
      </div>

      <div>
        <label style={lbl}>Γειτονιά</label>
        <input style={inp} value={form.neighborhood} onChange={e => set('neighborhood', e.target.value)} placeholder="π.χ. Κουκάκι" />
      </div>

      <div>
        <label style={lbl}>Διεύθυνση *</label>
        <input style={inp} value={form.address} onChange={e => set('address', e.target.value)} placeholder="π.χ. Φαλήρου 22, Αθήνα 117 42" />
        <Err stepErrors={stepErrors} k="address" />
      </div>

      <div>
        <label style={lbl}>Google Maps link *</label>
        <div style={{
          padding: '12px 14px', borderRadius: 12, marginBottom: 10,
          backgroundColor: 'rgba(232,160,32,0.07)', border: '1px solid rgba(232,160,32,0.22)',
        }}>
          <p style={{ fontSize: 12, color: '#E8A020', fontWeight: 700, marginBottom: 6 }}>Πώς βρίσκεις το σωστό link</p>
          <ol style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, paddingLeft: 16, margin: 0 }}>
            <li>Άνοιξε το Google Maps σε <strong style={{ color: 'rgba(255,255,255,0.85)' }}>browser</strong>, όχι στην εφαρμογή.</li>
            <li>Βρες το σημείο σου στον χάρτη.</li>
            <li>Αντίγραψε το URL από τη <strong style={{ color: 'rgba(255,255,255,0.85)' }}>μπάρα διευθύνσεων</strong>.</li>
          </ol>
          <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.45)', marginTop: 8, lineHeight: 1.6 }}>
            Πρέπει να περιέχει συντεταγμένες, κάτι σαν <code style={{ color: '#E8A020' }}>@37.97,23.72</code>.
            Το link από το κουμπί «Κοινοποίηση» της εφαρμογής στο κινητό <strong style={{ color: 'rgba(255,255,255,0.7)' }}>δεν δουλεύει</strong> εδώ.
          </p>
        </div>
        <input style={inp} value={form.maps_url}
          onChange={e => {
            set('maps_url', e.target.value)
            const parsed = parseLatLng(e.target.value)
            set('lat', parsed?.lat ?? null)
            set('lng', parsed?.lng ?? null)
          }}
          placeholder="https://www.google.com/maps/place/.../@37.9755,23.7348,17z/..." />
        <Err stepErrors={stepErrors} k="maps_url" />
        {form.lat != null && form.lng != null && (
          <p style={{ fontSize: 12, color: '#22c55e', marginTop: 6 }}>
            ✓ Συντεταγμένες: {form.lat.toFixed(5)}, {form.lng.toFixed(5)}
          </p>
        )}
      </div>
    </div>
  )
}

function Step3({ form, set, stepErrors, onGalleryAdd, onGalleryRemove, showCropper, setShowCropper }: {
  form: SpotFormData; set: SetField; stepErrors: Record<string, string>
  onGalleryAdd: (url: string) => void
  onGalleryRemove: (i: number) => void
  showCropper: boolean
  setShowCropper: (v: boolean) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {/* Cover */}
      <div>
        <label style={lbl}>Εξώφυλλο *</label>
        {form.cover_image ? (
          <div>
            <div style={{ position: 'relative', width: '100%', aspectRatio: `${SPOT_CROP_ASPECT}`, borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
              <CroppedImage src={form.cover_image} alt="" crop={form.crop} sizes="(max-width: 980px) 100vw, 620px" />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <button type="button" onClick={() => setShowCropper(true)}
                style={{ padding: '8px 16px', borderRadius: 10, fontSize: 12, cursor: 'pointer', backgroundColor: 'rgba(232,160,32,0.1)', color: '#E8A020', border: '1px solid rgba(232,160,32,0.3)' }}>
                Προσαρμογή κάδρου
              </button>
              <button type="button" onClick={() => { set('cover_image', ''); set('crop', null) }}
                style={{ padding: '8px 16px', borderRadius: 10, fontSize: 12, cursor: 'pointer', backgroundColor: 'transparent', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.12)' }}>
                Αφαίρεση
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
            (προαιρετικό, έως {MAX_GALLERY})
          </span>
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 10 }}>
          {form.gallery.map((url, i) => (
            <div key={`${url}-${i}`} className="group"
              style={{ position: 'relative', aspectRatio: '1 / 1', borderRadius: 12, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              <button type="button" onClick={() => onGalleryRemove(i)} aria-label="Αφαίρεση φωτογραφίας"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, cursor: 'pointer', backgroundColor: 'rgba(0,0,0,0.7)', color: 'white', border: 'none' }}>
                ×
              </button>
            </div>
          ))}
          {form.gallery.length < MAX_GALLERY && (
            <div style={{ aspectRatio: '1 / 1', borderRadius: 12, overflow: 'hidden', border: '1px dashed rgba(255,255,255,0.15)' }}>
              <ImageUpload folder="spots" onUpload={onGalleryAdd} />
            </div>
          )}
        </div>
      </div>

      {/* Opening hours */}
      <div>
        <label style={lbl}>Ωράριο</label>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.30)', marginBottom: 10 }}>
          Άφησε κενή όποια μέρα δεν θέλεις να εμφανίζεται.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {DAYS.map(day => {
            const v = form.opening_hours[day]
            return (
              <div key={day} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 92, flexShrink: 0, fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{day}</span>
                <button type="button"
                  onClick={() => set('opening_hours', { ...form.opening_hours, [day]: { closed: !v.closed, hours: '' } })}
                  style={{
                    padding: '6px 12px', borderRadius: 999, fontSize: 11, cursor: 'pointer', flexShrink: 0, minWidth: 76,
                    backgroundColor: v.closed ? 'rgba(239,68,68,0.14)' : 'rgba(34,197,94,0.12)',
                    color: v.closed ? '#ef4444' : '#22c55e',
                    border: `1px solid ${v.closed ? 'rgba(239,68,68,0.35)' : 'rgba(34,197,94,0.3)'}`,
                  }}>
                  {v.closed ? CLOSED : 'Ανοιχτά'}
                </button>
                <input
                  style={{ ...inp, padding: '9px 14px', opacity: v.closed ? 0.35 : 1 }}
                  disabled={v.closed}
                  value={v.hours}
                  onChange={e => set('opening_hours', { ...form.opening_hours, [day]: { closed: false, hours: e.target.value } })}
                  placeholder="π.χ. 18:00-02:00" />
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
  const cat = SPOT_CATEGORIES.find(c => c.key === form.category)
  const hours = serializeOpeningHours(form.opening_hours)
  const summary: { label: string; value: string }[] = [
    { label: 'Κατηγορία', value: [cat?.label, form.subcategory].filter(Boolean).join(' · ') || '—' },
    { label: 'Τοποθεσία', value: [form.address, form.neighborhood, form.city].filter(Boolean).join(', ') || '—' },
    { label: 'Συντεταγμένες', value: form.lat != null && form.lng != null ? `${form.lat.toFixed(5)}, ${form.lng.toFixed(5)}` : '—' },
    { label: 'Φωτογραφίες', value: `${form.cover_image ? 1 : 0} εξώφυλλο · ${form.gallery.length} gallery` },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <label style={lbl}>Τηλέφωνο</label>
        <input style={inp} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="π.χ. 210 1234567" />
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
        <label style={lbl}>Εύρος τιμών</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {[1, 2, 3, 4].map(level => {
            const on = form.price_level === level
            return (
              <button key={level} type="button" onClick={() => set('price_level', on ? 0 : level)}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                  backgroundColor: on ? 'rgba(232,160,32,0.18)' : 'rgba(255,255,255,0.05)',
                  color: on ? '#E8A020' : 'rgba(255,255,255,0.4)',
                  border: `1px solid ${on ? 'rgba(232,160,32,0.4)' : 'rgba(255,255,255,0.1)'}`,
                }}>
                {'€'.repeat(level)}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <label style={lbl}>
          Περιγραφή *{' '}
          <span style={{ color: 'rgba(255,255,255,0.40)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
            {form.description.length}/600
          </span>
        </label>
        <textarea style={{ ...inp, minHeight: 110, resize: 'vertical' }} maxLength={600}
          value={form.description} onChange={e => set('description', e.target.value)}
          placeholder="Τι κάνει το σημείο σου ξεχωριστό;" />
        <Err stepErrors={stepErrors} k="description" />
      </div>

      {/* Review */}
      <div style={{ padding: '16px 18px', borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.4)', marginBottom: 12 }}>
          Έλεγχος πριν την υποβολή
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {summary.map(row => (
            <div key={row.label} style={{ display: 'flex', gap: 12, fontSize: 12.5 }}>
              <span style={{ width: 108, flexShrink: 0, color: 'rgba(255,255,255,0.35)' }}>{row.label}</span>
              <span style={{ color: 'rgba(255,255,255,0.8)' }}>{row.value}</span>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 12, fontSize: 12.5 }}>
            <span style={{ width: 108, flexShrink: 0, color: 'rgba(255,255,255,0.35)' }}>Ωράριο</span>
            <span style={{ color: 'rgba(255,255,255,0.8)' }}>
              {Object.keys(hours).length === 0
                ? '—'
                : Object.entries(hours).map(([d, h]) => `${d}: ${h}`).join(' · ')}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SpotFormSteps({ initialData, onSubmit, loading, error, isEdit = false }: Props) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<SpotFormData>({ ...DEFAULTS, ...initialData })
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({})
  const [isMobile, setIsMobile] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [showCropper, setShowCropper] = useState(false)

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

  function addGalleryImage(url: string) {
    setForm(prev => prev.gallery.length >= MAX_GALLERY ? prev : { ...prev, gallery: [...prev.gallery, url] })
  }

  function removeGalleryImage(index: number) {
    setForm(prev => ({ ...prev, gallery: prev.gallery.filter((_, i) => i !== index) }))
  }

  function validate(n: number): Record<string, string> {
    const e: Record<string, string> = {}
    if (n === 1) {
      if (!form.category) e.category = 'Διάλεξε κατηγορία'
      if (!form.name.trim()) e.name = 'Το όνομα είναι υποχρεωτικό'
    }
    if (n === 2) {
      if (!form.city) e.city = 'Διάλεξε πόλη'
      if (!form.address.trim()) e.address = 'Η διεύθυνση είναι υποχρεωτική'
      if (!form.maps_url.trim()) {
        e.maps_url = 'Το Google Maps link είναι υποχρεωτικό'
      } else if (form.lat == null || form.lng == null) {
        // Never let a required-coordinate spot through with nulls.
        e.maps_url = 'Δεν βρήκαμε συντεταγμένες σε αυτό το link. Άνοιξε το Google Maps σε browser και αντίγραψε το URL από τη μπάρα διευθύνσεων — πρέπει να περιέχει κάτι σαν @37.97,23.72'
      }
    }
    if (n === 3) {
      if (!form.cover_image) e.cover_image = 'Χρειάζεται μια φωτογραφία εξωφύλλου'
    }
    if (n === 4) {
      if (!form.description.trim()) e.description = 'Η περιγραφή είναι υποχρεωτική'
    }
    return e
  }

  function next() {
    const errs = validate(step)
    if (Object.keys(errs).length) { setStepErrors(errs); return }
    setStep(s => s + 1)
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

  return (
    <div style={{
      maxWidth: isMobile ? 640 : 1060, margin: '0 auto',
      display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 380px',
      gap: 28, alignItems: 'start',
    }}>
      <div>
        {isMobile && (
          <button type="button" onClick={() => setPreviewOpen(true)}
            style={{
              width: '100%', padding: '11px 0', marginBottom: 20, borderRadius: 12,
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              backgroundColor: 'rgba(232,160,32,0.10)', color: '#E8A020',
              border: '1px solid rgba(232,160,32,0.35)',
            }}>
            👁 Προεπισκόπηση
          </button>
        )}

        <StepIndicator step={step} setStep={setStep} />

        <div style={{ backgroundColor: '#111120', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '32px 28px' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'white', marginBottom: 24 }}>
            {STEPS[step - 1].title}
          </h2>

          {step === 1 && <Step1 form={form} set={set} stepErrors={stepErrors} />}
          {step === 2 && <Step2 form={form} set={set} stepErrors={stepErrors} />}
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
                Πίσω
              </button>
            )}
            {step < 4 ? (
              <button type="button" onClick={next}
                style={{ flex: 1, padding: '13px 0', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', backgroundColor: '#E8A020', color: '#0F0F1A', border: 'none' }}>
                Συνέχεια
              </button>
            ) : (
              <button type="button" onClick={handleFinalSubmit} disabled={loading}
                style={{ flex: 1, padding: '13px 0', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.6 : 1, backgroundColor: '#E8A020', color: '#0F0F1A', border: 'none' }}>
                {loading ? 'Αποθήκευση...' : isEdit ? 'Αποθήκευση αλλαγών' : 'Υποβολή spot'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Desktop: sticky side-by-side preview */}
      {!isMobile && (
        <aside style={{ position: 'sticky', top: 0 }}>
          <p style={{ ...lbl, marginBottom: 12 }}>Προεπισκόπηση</p>
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
              <p style={{ ...lbl, marginBottom: 0 }}>Προεπισκόπηση</p>
              <button type="button" onClick={() => setPreviewOpen(false)}
                style={{ padding: '6px 14px', borderRadius: 999, fontSize: 12, cursor: 'pointer', backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.12)' }}>
                Κλείσιμο
              </button>
            </div>
            <SpotLivePreview form={form} step={step} />
          </div>
        </div>
      )}
    </div>
  )
}
