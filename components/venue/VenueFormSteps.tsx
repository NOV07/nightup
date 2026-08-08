'use client'
import { useState, useEffect } from 'react'
import ImageUpload from '@/components/ui/ImageUpload'
import ImageCropper from '@/components/ui/ImageCropper'
import CroppedImage from '@/components/ui/CroppedImage'
import CreatorGallery from '@/components/ui/CreatorGallery'
import type { CropBox } from '@/components/ui/CroppedImage'
import { NETWORK } from '@/app/lib/searchData'
import { PRICE_RANGES } from '@/app/lib/networkProfile'
import VenueLivePreview from './VenueLivePreview'

/** Venue types, read off NETWORK.Venues so the wizard cannot drift from
 *  /network/venues, which builds its filter chips from the same keys. */
export const VENUE_TYPES = Object.keys(NETWORK.Venues)

/** Emoji per type, purely decorative — the taxonomy itself stays in NETWORK. */
const TYPE_EMOJI: Record<string, string> = {
  'Club': '🎧',
  'Bar / Lounge': '🍸',
  'Rooftop': '🌆',
  'Live Stage': '🎸',
  'Event Hall': '🏛',
  'Beach Club': '🏖',
  'Restaurant': '🍽',
}

// Same list the event wizard offers.
const CITIES = ['Athens', 'Thessaloniki', 'Mykonos', 'Santorini', 'Heraklion', 'Patras', 'Rhodes', 'Ios', 'Corfu', 'Zakynthos']

export const MAX_GALLERY = 8

const AVATAR_CROP_ASPECT = 1
/** The cover renders as the profile page banner, which the rest of the app
 *  crops at 3:1 — not the 16:9 spots and events use for their card art. */
const COVER_CROP_ASPECT = 3

const STEPS = [
  { n: 1, title: 'Τα βασικά' },
  { n: 2, title: 'Τοποθεσία' },
  { n: 3, title: 'Φωτογραφίες' },
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

export interface VenueFormData {
  display_name: string
  network_category: string
  capacity: string
  bio: string
  city: string
  neighborhood: string
  address: string
  avatar_url: string
  avatar_crop: CropBox | null
  cover_url: string
  cover_crop: CropBox | null
  phone: string
  website: string
  instagram: string
  booking_email: string
  price_range: string
}

type SetField = <K extends keyof VenueFormData>(k: K, v: VenueFormData[K]) => void

const DEFAULTS: VenueFormData = {
  display_name: '', network_category: '', capacity: '', bio: '',
  city: '', neighborhood: '', address: '',
  avatar_url: '', avatar_crop: null, cover_url: '', cover_crop: null,
  phone: '', website: '', instagram: '', booking_email: '', price_range: '',
}

/** A stored profile row, into the wizard's state shape. */
export function profileToVenueForm(profile: any): Partial<VenueFormData> {
  const hasAvatarCrop = profile.avatar_crop_x != null && profile.avatar_crop_y != null
    && profile.avatar_crop_width != null && profile.avatar_crop_height != null
  const hasCoverCrop = profile.cover_crop_x != null && profile.cover_crop_y != null
    && profile.cover_crop_width != null && profile.cover_crop_height != null

  return {
    display_name: profile.display_name ?? '',
    network_category: profile.network_category ?? '',
    // venue_capacity reads back as a string while the column is still text, and
    // as a number once the optional ALTER has run. Either way the input wants a
    // string.
    capacity: profile.venue_capacity == null ? '' : String(profile.venue_capacity),
    bio: profile.bio ?? '',
    city: profile.location ?? '',
    neighborhood: profile.venue_neighborhood ?? '',
    address: profile.venue_address ?? '',
    avatar_url: profile.avatar_url ?? '',
    avatar_crop: hasAvatarCrop
      ? { crop_x: profile.avatar_crop_x, crop_y: profile.avatar_crop_y, crop_width: profile.avatar_crop_width, crop_height: profile.avatar_crop_height }
      : null,
    cover_url: profile.cover_url ?? '',
    cover_crop: hasCoverCrop
      ? { crop_x: profile.cover_crop_x, crop_y: profile.cover_crop_y, crop_width: profile.cover_crop_width, crop_height: profile.cover_crop_height }
      : null,
    phone: profile.phone ?? '',
    website: profile.website ?? '',
    instagram: profile.instagram ?? '',
    booking_email: profile.booking_email ?? '',
    price_range: profile.price_range ?? '',
  }
}

/**
 * The exact `profiles` row shape the wizard writes. `network_tab` is pinned to
 * 'Venues' — /network/venues filters on it. `network_subcategory` is left out:
 * venues have one taxonomy level, so omitting it preserves whatever a row holds.
 */
export function venueFormToPayload(form: VenueFormData) {
  const capacity = parseInt(form.capacity, 10)
  return {
    display_name: form.display_name.trim(),
    bio: form.bio.trim() || null,
    network_tab: 'Venues',
    network_category: form.network_category || null,
    venue_capacity: Number.isFinite(capacity) && capacity > 0 ? capacity : null,
    location: form.city || null,
    venue_neighborhood: form.neighborhood.trim() || null,
    venue_address: form.address.trim() || null,
    avatar_url: form.avatar_url || null,
    avatar_crop_x: form.avatar_crop?.crop_x ?? null,
    avatar_crop_y: form.avatar_crop?.crop_y ?? null,
    avatar_crop_width: form.avatar_crop?.crop_width ?? null,
    avatar_crop_height: form.avatar_crop?.crop_height ?? null,
    cover_url: form.cover_url || null,
    cover_crop_x: form.cover_crop?.crop_x ?? null,
    cover_crop_y: form.cover_crop?.crop_y ?? null,
    cover_crop_width: form.cover_crop?.crop_width ?? null,
    cover_crop_height: form.cover_crop?.crop_height ?? null,
    phone: form.phone.trim() || null,
    website: form.website.trim() || null,
    instagram: form.instagram.trim() || null,
    booking_email: form.booking_email.trim() || null,
    price_range: form.price_range || null,
  }
}

interface Props {
  /** The profile being edited — the gallery writes straight to creator_gallery,
   *  so it needs the id, and the preview renders the real @username. */
  profileId: string
  username: string
  isVerified?: boolean
  initialData?: Partial<VenueFormData>
  onSubmit: (data: VenueFormData) => void
  loading: boolean
  error: string
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
  form: VenueFormData; set: SetField; stepErrors: Record<string, string>
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <label style={lbl}>Τύπος χώρου *</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
          {VENUE_TYPES.map(type => {
            const on = form.network_category === type
            return (
              <button key={type} type="button"
                onClick={() => set('network_category', on ? '' : type)}
                style={{
                  textAlign: 'left', padding: '14px 14px', borderRadius: 14, cursor: 'pointer',
                  transition: 'all 0.15s', minHeight: 70,
                  backgroundColor: on ? 'rgba(232,160,32,0.14)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${on ? 'rgba(232,160,32,0.45)' : 'rgba(255,255,255,0.1)'}`,
                }}>
                <div style={{ fontSize: 22, lineHeight: 1 }}>{TYPE_EMOJI[type] ?? '📍'}</div>
                <div style={{ fontSize: 14, fontWeight: 700, marginTop: 8, color: on ? '#E8A020' : 'white' }}>{type}</div>
              </button>
            )
          })}
        </div>
        <Err stepErrors={stepErrors} k="network_category" />
      </div>

      <div>
        <label style={lbl}>Όνομα *</label>
        <input style={inp} value={form.display_name} onChange={e => set('display_name', e.target.value)}
          placeholder="π.χ. Kipos Rooftop" />
        <Err stepErrors={stepErrors} k="display_name" />
      </div>

      <div>
        <label style={lbl}>
          Χωρητικότητα{' '}
          <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'rgba(255,255,255,0.40)' }}>
            (άτομα)
          </span>
        </label>
        <input style={inp} type="number" min={1} inputMode="numeric"
          value={form.capacity}
          onChange={e => set('capacity', e.target.value)}
          placeholder="π.χ. 350" />
        <Err stepErrors={stepErrors} k="capacity" />
      </div>

      <div>
        <label style={lbl}>
          Περιγραφή *{' '}
          <span style={{ color: 'rgba(255,255,255,0.40)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
            {form.bio.length}/600
          </span>
        </label>
        <textarea style={{ ...inp, minHeight: 110, resize: 'vertical' }} maxLength={600}
          value={form.bio} onChange={e => set('bio', e.target.value)}
          placeholder="Τι κάνει τον χώρο σου ξεχωριστό;" />
        <Err stepErrors={stepErrors} k="bio" />
      </div>
    </div>
  )
}

function Step2({ form, set, stepErrors }: {
  form: VenueFormData; set: SetField; stepErrors: Record<string, string>
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
        <label style={lbl}>
          Γειτονιά{' '}
          <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'rgba(255,255,255,0.40)' }}>
            (προαιρετικό)
          </span>
        </label>
        <input style={inp} value={form.neighborhood} onChange={e => set('neighborhood', e.target.value)} placeholder="π.χ. Κουκάκι" />
      </div>

      <div>
        <label style={lbl}>Διεύθυνση *</label>
        <input style={inp} value={form.address} onChange={e => set('address', e.target.value)} placeholder="π.χ. Φαλήρου 22, Αθήνα 117 42" />
        <Err stepErrors={stepErrors} k="address" />
        <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.30)', marginTop: 6 }}>
          Απλό κείμενο — δεν χρειάζεται link χάρτη.
        </p>
      </div>
    </div>
  )
}

function Step3({ form, set, stepErrors, profileId, showAvatarCropper, setShowAvatarCropper, showCoverCropper, setShowCoverCropper }: {
  form: VenueFormData; set: SetField; stepErrors: Record<string, string>
  profileId: string
  showAvatarCropper: boolean
  setShowAvatarCropper: (v: boolean) => void
  showCoverCropper: boolean
  setShowCoverCropper: (v: boolean) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {/* Cover */}
      <div>
        <label style={lbl}>Εξώφυλλο *</label>
        {form.cover_url ? (
          <div>
            <div style={{ position: 'relative', width: '100%', aspectRatio: `${COVER_CROP_ASPECT}`, borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
              <CroppedImage src={form.cover_url} alt="" crop={form.cover_crop} sizes="(max-width: 980px) 100vw, 620px" />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <button type="button" onClick={() => setShowCoverCropper(true)}
                style={{ padding: '8px 16px', borderRadius: 10, fontSize: 12, cursor: 'pointer', backgroundColor: 'rgba(232,160,32,0.1)', color: '#E8A020', border: '1px solid rgba(232,160,32,0.3)' }}>
                Προσαρμογή κάδρου
              </button>
              <button type="button" onClick={() => { set('cover_url', ''); set('cover_crop', null) }}
                style={{ padding: '8px 16px', borderRadius: 10, fontSize: 12, cursor: 'pointer', backgroundColor: 'transparent', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.12)' }}>
                Αφαίρεση
              </button>
            </div>
          </div>
        ) : (
          <ImageUpload folder="banners" onUpload={url => { set('cover_url', url); set('cover_crop', null) }} />
        )}
        <Err stepErrors={stepErrors} k="cover_url" />

        {showCoverCropper && form.cover_url && (
          <div style={{ marginTop: 12 }}>
            <ImageCropper
              imageUrl={form.cover_url}
              aspect={COVER_CROP_ASPECT}
              initialCrop={form.cover_crop}
              onConfirm={(box: CropBox) => { set('cover_crop', box); setShowCoverCropper(false) }}
              onCancel={() => setShowCoverCropper(false)}
            />
          </div>
        )}
      </div>

      {/* Avatar — the network card leads with it, so a venue without one shows
          as a two-letter initial box on /network/venues. */}
      <div>
        <label style={lbl}>Λογότυπο</label>
        {form.avatar_url ? (
          <div>
            <div style={{ position: 'relative', width: 140, height: 140, borderRadius: 18, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
              <CroppedImage src={form.avatar_url} alt="" crop={form.avatar_crop} sizes="140px" />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <button type="button" onClick={() => setShowAvatarCropper(true)}
                style={{ padding: '8px 16px', borderRadius: 10, fontSize: 12, cursor: 'pointer', backgroundColor: 'rgba(232,160,32,0.1)', color: '#E8A020', border: '1px solid rgba(232,160,32,0.3)' }}>
                Προσαρμογή κάδρου
              </button>
              <button type="button" onClick={() => { set('avatar_url', ''); set('avatar_crop', null) }}
                style={{ padding: '8px 16px', borderRadius: 10, fontSize: 12, cursor: 'pointer', backgroundColor: 'transparent', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.12)' }}>
                Αφαίρεση
              </button>
            </div>
          </div>
        ) : (
          <ImageUpload folder="avatars" onUpload={url => { set('avatar_url', url); set('avatar_crop', null) }} />
        )}

        {showAvatarCropper && form.avatar_url && (
          <div style={{ marginTop: 12 }}>
            <ImageCropper
              imageUrl={form.avatar_url}
              aspect={AVATAR_CROP_ASPECT}
              initialCrop={form.avatar_crop}
              onConfirm={(box: CropBox) => { set('avatar_crop', box); setShowAvatarCropper(false) }}
              onCancel={() => setShowAvatarCropper(false)}
            />
          </div>
        )}
      </div>

      {/* Gallery — the same creator_gallery store the other profile types use.
          It writes on upload rather than on submit, so it is live immediately. */}
      <div>
        <label style={lbl}>Gallery (έως {MAX_GALLERY})</label>
        <CreatorGallery profileId={profileId} maxPhotos={MAX_GALLERY} />
      </div>
    </div>
  )
}

function Step4({ form, set, stepErrors }: {
  form: VenueFormData; set: SetField; stepErrors: Record<string, string>
}) {
  const capacity = parseInt(form.capacity, 10)
  const summary: { label: string; value: string }[] = [
    { label: 'Όνομα', value: form.display_name.trim() || '—' },
    { label: 'Τύπος', value: form.network_category || '—' },
    { label: 'Χωρητικότητα', value: Number.isFinite(capacity) && capacity > 0 ? `${capacity} άτομα` : '—' },
    { label: 'Τοποθεσία', value: [form.address, form.neighborhood, form.city].filter(Boolean).join(', ') || '—' },
    { label: 'Φωτογραφίες', value: `${form.cover_url ? 'εξώφυλλο ✓' : 'εξώφυλλο —'} · ${form.avatar_url ? 'λογότυπο ✓' : 'λογότυπο —'}` },
    { label: 'Επικοινωνία', value: [form.phone, form.booking_email, form.website, form.instagram].filter(c => c.trim()).join(' · ') || '—' },
    { label: 'Εύρος τιμών', value: form.price_range || '—' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <label style={lbl}>Τηλέφωνο</label>
        <input style={inp} type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="π.χ. 210 1234567" />
      </div>

      <div>
        <label style={lbl}>Booking email</label>
        <input style={inp} type="email" value={form.booking_email} onChange={e => set('booking_email', e.target.value)} placeholder="booking@..." />
        <Err stepErrors={stepErrors} k="booking_email" />
      </div>

      <div>
        <label style={lbl}>Website</label>
        <input style={inp} type="url" value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://..." />
      </div>

      <div>
        <label style={lbl}>Instagram</label>
        <input style={inp} value={form.instagram} onChange={e => set('instagram', e.target.value)} placeholder="https://instagram.com/..." />
      </div>

      <div>
        <label style={lbl}>Εύρος τιμών</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {PRICE_RANGES.map(range => {
            const on = form.price_range === range
            return (
              <button key={range} type="button" onClick={() => set('price_range', on ? '' : range)}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                  backgroundColor: on ? 'rgba(232,160,32,0.18)' : 'rgba(255,255,255,0.05)',
                  color: on ? '#E8A020' : 'rgba(255,255,255,0.4)',
                  border: `1px solid ${on ? 'rgba(232,160,32,0.4)' : 'rgba(255,255,255,0.1)'}`,
                }}>
                {range}
              </button>
            )
          })}
        </div>
      </div>

      {/* Review */}
      <div style={{ padding: '16px 18px', borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.4)', marginBottom: 12 }}>
          Έλεγχος πριν την υποβολή
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {summary.map(row => (
            <div key={row.label} style={{ display: 'flex', gap: 12, fontSize: 12.5 }}>
              <span style={{ width: 116, flexShrink: 0, color: 'rgba(255,255,255,0.35)' }}>{row.label}</span>
              <span style={{ color: 'rgba(255,255,255,0.8)' }}>{row.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function VenueFormSteps({
  profileId, username, isVerified = false, initialData, onSubmit, loading, error,
}: Props) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<VenueFormData>({ ...DEFAULTS, ...initialData })
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({})
  const [isMobile, setIsMobile] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [showAvatarCropper, setShowAvatarCropper] = useState(false)
  const [showCoverCropper, setShowCoverCropper] = useState(false)

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

  function validate(n: number): Record<string, string> {
    const e: Record<string, string> = {}
    if (n === 1) {
      if (!form.network_category) e.network_category = 'Διάλεξε τύπο χώρου'
      if (!form.display_name.trim()) e.display_name = 'Το όνομα είναι υποχρεωτικό'
      if (form.capacity.trim()) {
        const c = parseInt(form.capacity, 10)
        if (!Number.isFinite(c) || c <= 0) e.capacity = 'Η χωρητικότητα πρέπει να είναι θετικός αριθμός'
      }
      if (!form.bio.trim()) e.bio = 'Η περιγραφή είναι υποχρεωτική'
    }
    if (n === 2) {
      if (!form.city) e.city = 'Διάλεξε πόλη'
      if (!form.address.trim()) e.address = 'Η διεύθυνση είναι υποχρεωτική'
    }
    if (n === 3) {
      if (!form.cover_url) e.cover_url = 'Χρειάζεται μια φωτογραφία εξωφύλλου'
    }
    if (n === 4) {
      if (form.booking_email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.booking_email.trim())) {
        e.booking_email = 'Το email δεν μοιάζει σωστό'
      }
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
            <Step3 form={form} set={set} stepErrors={stepErrors} profileId={profileId}
              showAvatarCropper={showAvatarCropper} setShowAvatarCropper={setShowAvatarCropper}
              showCoverCropper={showCoverCropper} setShowCoverCropper={setShowCoverCropper} />
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
                {loading ? 'Αποθήκευση...' : 'Αποθήκευση χώρου'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Desktop: sticky side-by-side preview */}
      {!isMobile && (
        <aside style={{ position: 'sticky', top: 0 }}>
          <p style={{ ...lbl, marginBottom: 12 }}>Προεπισκόπηση</p>
          <VenueLivePreview form={form} step={step} username={username} profileId={profileId} isVerified={isVerified} />
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
            <VenueLivePreview form={form} step={step} username={username} profileId={profileId} isVerified={isVerified} />
          </div>
        </div>
      )}
    </div>
  )
}
