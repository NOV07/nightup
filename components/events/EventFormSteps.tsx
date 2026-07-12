'use client'
import { useState, useRef } from 'react'
import { useLanguage } from '@/app/components/LanguageContext'
import type { TranslationKey } from '@/app/lib/translations'

const GENRES = ['Techno', 'House', 'Deep House', 'Hip-Hop', 'R&B', 'Laika', 'Entechno', 'Rock', 'Open Air', 'Other']
const EVENT_TYPES = ['Club Night', 'Live Show', 'Festival', 'Open Air', 'Private Party', 'Other']
const CITIES = ['Athens', 'Thessaloniki', 'Mykonos', 'Santorini', 'Heraklion', 'Patras', 'Rhodes', 'Ios', 'Corfu', 'Zakynthos']

const STEPS: { n: number; titleKey: TranslationKey }[] = [
  { n: 1, titleKey: 'event_form_step_basics' },
  { n: 2, titleKey: 'event_form_step_date_venue' },
  { n: 3, titleKey: 'event_form_step_entry_lineup' },
  { n: 4, titleKey: 'dashboard_publish' },
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

export interface EventFormData {
  title: string
  genres: string[]
  type: string
  short_description: string
  full_description: string
  date: string
  start_time: string
  end_time: string
  venue: string
  city: string
  address: string
  maps_url: string
  image_url: string
  ticket_url: string
  price: string
  age_restriction: boolean
  dress_code: string
  lineup: string
  contributors: string
  instagram: string
  facebook: string
  tiktok: string
  contact_email: string
  terms_accepted: boolean
}

type SetField = <K extends keyof EventFormData>(k: K, v: EventFormData[K]) => void

const DEFAULTS: EventFormData = {
  title: '', genres: [], type: '', short_description: '', full_description: '',
  date: '', start_time: '', end_time: '', venue: '', city: '', address: '',
  maps_url: '', image_url: '', ticket_url: '', price: '', age_restriction: false,
  dress_code: '', lineup: '', contributors: '', instagram: '', facebook: '', tiktok: '',
  contact_email: '', terms_accepted: false,
}

interface Props {
  initialData?: Partial<EventFormData>
  onSubmit: (data: EventFormData) => void
  loading: boolean
  error: string
}

// ── Sub-components (defined outside to prevent remount on each render) ────

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
            <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em',
              color: step === s.n ? '#E8A020' : s.n < step ? 'rgba(232,160,32,0.6)' : 'rgba(255,255,255,0.25)',
              whiteSpace: 'nowrap' }}>
              {t(s.titleKey)}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div style={{ flex: 1, height: 1, margin: '0 8px', marginBottom: 20,
              backgroundColor: s.n < step ? 'rgba(232,160,32,0.3)' : 'rgba(255,255,255,0.08)' }} />
          )}
        </div>
      ))}
    </div>
  )
}

function Step1({ form, set, toggleGenre, stepErrors }: {
  form: EventFormData
  set: SetField
  toggleGenre: (g: string) => void
  stepErrors: Record<string, string>
}) {
  const { t } = useLanguage()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <label style={lbl}>{t('event_form_title_label')} *</label>
        <input style={inp} value={form.title} onChange={e => set('title', e.target.value)} placeholder={t('event_form_title_placeholder')} />
        <Err stepErrors={stepErrors} k="title" />
      </div>

      <div>
        <label style={lbl}>{t('event_form_type_label')}</label>
        <div style={{ position: 'relative' }}>
          <select style={{ ...inp, appearance: 'none', cursor: 'pointer', backgroundColor: '#0F0F1A' }}
            value={form.type} onChange={e => set('type', e.target.value)}>
            <option value="">{t('event_form_select_type')}</option>
            {EVENT_TYPES.map(et => <option key={et} value={et}>{et}</option>)}
          </select>
          <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: '#E8A020', pointerEvents: 'none' }}>▾</span>
        </div>
      </div>

      <div>
        <label style={lbl}>{t('dashboard_genres')}</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {GENRES.map(g => (
            <button key={g} type="button" onClick={() => toggleGenre(g)}
              style={{
                padding: '6px 14px', borderRadius: 999, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s',
                backgroundColor: form.genres.includes(g) ? 'rgba(232,160,32,0.18)' : 'rgba(255,255,255,0.05)',
                color: form.genres.includes(g) ? '#E8A020' : 'rgba(255,255,255,0.4)',
                border: `1px solid ${form.genres.includes(g) ? 'rgba(232,160,32,0.4)' : 'rgba(255,255,255,0.1)'}`,
              }}>
              {g}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label style={lbl}>{t('event_form_short_desc_label')} * <span style={{ color: 'rgba(255,255,255,0.40)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>{form.short_description.length}/160</span></label>
        <input style={inp} value={form.short_description} maxLength={160}
          onChange={e => set('short_description', e.target.value)}
          placeholder={t('event_form_short_desc_placeholder')} />
        <Err stepErrors={stepErrors} k="short_description" />
      </div>

      <div>
        <label style={lbl}>{t('event_form_full_desc_label')}</label>
        <textarea style={{ ...inp, resize: 'vertical', minHeight: 100 }} value={form.full_description}
          onChange={e => set('full_description', e.target.value)}
          placeholder={t('event_form_full_desc_placeholder')} />
      </div>
    </div>
  )
}

function Step2({ form, set, stepErrors, uploading, uploadError, fileInputRef, handleImageChange }: {
  form: EventFormData
  set: SetField
  stepErrors: Record<string, string>
  uploading: boolean
  uploadError: string
  fileInputRef: React.RefObject<HTMLInputElement | null>
  handleImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}) {
  const { t } = useLanguage()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <label style={lbl}>{t('event_form_date_label')} *</label>
          <input style={inp} type="date" value={form.date} onChange={e => set('date', e.target.value)} />
          <Err stepErrors={stepErrors} k="date" />
        </div>
        <div>
          <label style={lbl}>{t('event_form_start_time_label')} *</label>
          <input style={inp} type="time" value={form.start_time} onChange={e => set('start_time', e.target.value)} />
          <Err stepErrors={stepErrors} k="start_time" />
        </div>
        <div>
          <label style={lbl}>{t('event_form_end_time_label')}</label>
          <input style={inp} type="time" value={form.end_time} onChange={e => set('end_time', e.target.value)} />
        </div>
        <div>
          <label style={lbl}>{t('listings_city')} *</label>
          <div style={{ position: 'relative' }}>
            <select style={{ ...inp, appearance: 'none', cursor: 'pointer', backgroundColor: '#0F0F1A' }}
              value={form.city} onChange={e => set('city', e.target.value)}>
              <option value="">{t('event_form_select_city')}</option>
              {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: '#E8A020', pointerEvents: 'none' }}>▾</span>
          </div>
          <Err stepErrors={stepErrors} k="city" />
        </div>
      </div>

      <div>
        <label style={lbl}>{t('event_form_venue_label')} *</label>
        <input style={inp} value={form.venue} onChange={e => set('venue', e.target.value)} placeholder={t('event_form_venue_placeholder')} />
        <Err stepErrors={stepErrors} k="venue" />
      </div>

      <div>
        <label style={lbl}>{t('event_form_address_label')}</label>
        <input style={inp} value={form.address} onChange={e => set('address', e.target.value)} placeholder={t('event_form_address_placeholder')} />
      </div>

      <div>
        <label style={lbl}>{t('event_form_maps_url_label')}</label>
        <input style={inp} value={form.maps_url} onChange={e => set('maps_url', e.target.value)} placeholder="https://maps.google.com/..." />
      </div>

      <div>
        <label style={lbl}>{t('event_form_image_label')} *</label>
        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageChange} />

        {form.image_url ? (
          <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(232,160,32,0.3)' }}>
            <img src={form.image_url} alt="Preview" style={{ width: '100%', maxHeight: 220, objectFit: 'cover', display: 'block' }} />
            <button type="button" onClick={() => fileInputRef.current?.click()}
              style={{ position: 'absolute', bottom: 10, right: 10, padding: '6px 14px', borderRadius: 8, fontSize: 12,
                backgroundColor: 'rgba(0,0,0,0.7)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer' }}>
              {t('event_form_change_image')}
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
            style={{ ...inp, cursor: uploading ? 'wait' : 'pointer', textAlign: 'center', padding: '32px 16px',
              borderStyle: 'dashed', color: uploading ? '#E8A020' : 'rgba(255,255,255,0.4)',
              borderColor: uploading ? 'rgba(232,160,32,0.4)' : 'rgba(255,255,255,0.12)' }}>
            {uploading ? t('event_form_uploading') : `+ ${t('event_form_upload_flyer')}`}
          </button>
        )}

        {uploadError && <p style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{uploadError}</p>}
        <Err stepErrors={stepErrors} k="image_url" />
      </div>
    </div>
  )
}

function Step3({ form, set, stepErrors }: {
  form: EventFormData
  set: SetField
  stepErrors: Record<string, string>
}) {
  const { t } = useLanguage()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <label style={lbl}>{t('event_form_ticket_url_label')}</label>
        <input style={inp} value={form.ticket_url} onChange={e => set('ticket_url', e.target.value)} placeholder="https://..." />
      </div>

      <div>
        <label style={lbl}>{t('event_form_price_label')}</label>
        <input style={inp} type="number" min={0} value={form.price} onChange={e => set('price', e.target.value)} placeholder={t('event_form_price_placeholder')} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px', borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)' }}>
        <div>
          <p style={{ fontSize: 14, color: 'white', fontWeight: 500 }}>{t('event_form_age_restriction_label')}</p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.50)', marginTop: 2 }}>{t('event_form_age_restriction_desc')}</p>
        </div>
        <button type="button" onClick={() => set('age_restriction', !form.age_restriction)}
          style={{ position: 'relative', width: 44, height: 24, borderRadius: 999, cursor: 'pointer',
            backgroundColor: form.age_restriction ? '#E8A020' : 'rgba(255,255,255,0.15)',
            border: 'none', transition: 'background 0.2s', flexShrink: 0 }}>
          <div style={{ position: 'absolute', top: 3, width: 18, height: 18, borderRadius: '50%',
            backgroundColor: 'white', transition: 'left 0.2s',
            left: form.age_restriction ? 22 : 3 }} />
        </button>
      </div>

      <div>
        <label style={lbl}>{t('event_form_dress_code_label')} <span style={{ color: 'rgba(255,255,255,0.40)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>{form.dress_code.length}/80</span></label>
        <input style={inp} value={form.dress_code} maxLength={80} onChange={e => set('dress_code', e.target.value)} placeholder={t('event_form_dress_code_placeholder')} />
      </div>

      <div>
        <label style={lbl}>{t('event_form_lineup_label')} <span style={{ color: 'rgba(255,255,255,0.40)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>{t('event_form_comma_separated')}</span></label>
        <input style={inp} value={form.lineup} onChange={e => set('lineup', e.target.value)} placeholder={t('event_form_lineup_placeholder')} />
      </div>

      <div>
        <label style={lbl}>{t('event_form_contributors_label')} <span style={{ color: 'rgba(255,255,255,0.40)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>{t('event_form_comma_separated')}</span></label>
        <input style={inp} value={form.contributors} onChange={e => set('contributors', e.target.value)} placeholder={t('event_form_contributors_placeholder')} />
      </div>
    </div>
  )
}

function Step4({ form, set, stepErrors }: {
  form: EventFormData
  set: SetField
  stepErrors: Record<string, string>
}) {
  const { t } = useLanguage()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <label style={lbl}>Instagram</label>
        <input style={inp} value={form.instagram} onChange={e => set('instagram', e.target.value)} placeholder={t('event_form_instagram_placeholder')} />
      </div>
      <div>
        <label style={lbl}>Facebook</label>
        <input style={inp} value={form.facebook} onChange={e => set('facebook', e.target.value)} placeholder="https://facebook.com/..." />
      </div>
      <div>
        <label style={lbl}>TikTok</label>
        <input style={inp} value={form.tiktok} onChange={e => set('tiktok', e.target.value)} placeholder="@handle" />
      </div>
      <div>
        <label style={lbl}>{t('event_form_contact_email_label')} *</label>
        <input style={inp} type="email" value={form.contact_email} onChange={e => set('contact_email', e.target.value)} placeholder="hello@yourvenue.com" />
        <Err stepErrors={stepErrors} k="contact_email" />
      </div>

      {/* Summary */}
      <div style={{ padding: '16px', borderRadius: 12, backgroundColor: 'rgba(232,160,32,0.06)', border: '1px solid rgba(232,160,32,0.2)' }}>
        <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.4)', marginBottom: 12 }}>{t('event_form_review_label')}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            [t('event_form_review_title_label'), form.title],
            [t('event_form_date_label'), form.date ? `${form.date} ${form.start_time}` : '—'],
            [t('event_form_venue_label'), form.venue ? `${form.venue}, ${form.city}` : '—'],
            [t('dashboard_genres'), form.genres.join(', ') || '—'],
            [t('event_form_review_price_label'), form.price ? `€${form.price}` : t('event_form_free')],
          ].map(([label, value]) => (
            <div key={label} style={{ display: 'flex', gap: 8, fontSize: 13 }}>
              <span style={{ color: 'rgba(255,255,255,0.50)', minWidth: 60 }}>{label}</span>
              <span style={{ color: 'rgba(255,255,255,0.8)' }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
        <input type="checkbox" checked={form.terms_accepted} onChange={e => set('terms_accepted', e.target.checked)}
          style={{ marginTop: 2, accentColor: '#E8A020', width: 16, height: 16 }} />
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>
          {t('event_form_terms_text')}
        </span>
      </label>
      <Err stepErrors={stepErrors} k="terms_accepted" />
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────

export default function EventFormSteps({ initialData, onSubmit, loading, error }: Props) {
  const { t } = useLanguage()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<EventFormData>({ ...DEFAULTS, ...initialData })
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({})
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const set: SetField = (k, v) => {
    setForm(prev => ({ ...prev, [k]: v }))
    setStepErrors(prev => ({ ...prev, [k]: '' }))
  }

  function toggleGenre(g: string) {
    setForm(prev => ({
      ...prev,
      genres: prev.genres.includes(g) ? prev.genres.filter(x => x !== g) : [...prev.genres, g],
    }))
  }

  function validate(n: number): Record<string, string> {
    const e: Record<string, string> = {}
    if (n === 1) {
      if (!form.title.trim()) e.title = t('event_form_err_title_required')
      if (!form.short_description.trim()) e.short_description = t('event_form_err_short_desc_required')
      else if (form.short_description.length > 160) e.short_description = t('event_form_err_max_160')
    }
    if (n === 2) {
      if (!form.date) e.date = t('event_form_err_date_required')
      if (!form.start_time) e.start_time = t('event_form_err_start_time_required')
      if (!form.venue.trim()) e.venue = t('event_form_err_venue_required')
      if (!form.city) e.city = t('event_form_err_city_required')
      if (!form.image_url) e.image_url = t('event_form_err_image_required')
    }
    if (n === 4) {
      if (!form.contact_email.trim()) e.contact_email = t('event_form_err_email_required')
      if (!form.terms_accepted) e.terms_accepted = t('event_form_err_terms_required')
    }
    return e
  }

  function next() {
    const errs = validate(step)
    if (Object.keys(errs).length) { setStepErrors(errs); return }
    setStep(s => s + 1)
  }

  function back() { setStep(s => s - 1) }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError('')
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/events/upload', { method: 'POST', body: fd })
    const json = await res.json()
    if (!res.ok) { setUploadError(json.error ?? t('event_form_upload_failed')); setUploading(false); return }
    set('image_url', json.url)
    setUploading(false)
  }

  function handleFinalSubmit() {
    const errs = validate(4)
    if (Object.keys(errs).length) { setStepErrors(errs); return }
    const rawPrice = form.price.replace(/[^0-9.]/g, '')
    onSubmit({ ...form, price: rawPrice })
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <StepIndicator step={step} setStep={setStep} />

      <div style={{ backgroundColor: '#111120', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '32px 28px' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'white', marginBottom: 24 }}>
          {t(STEPS[step - 1].titleKey)}
        </h2>

        {step === 1 && <Step1 form={form} set={set} toggleGenre={toggleGenre} stepErrors={stepErrors} />}
        {step === 2 && <Step2 form={form} set={set} stepErrors={stepErrors} uploading={uploading} uploadError={uploadError} fileInputRef={fileInputRef} handleImageChange={handleImageChange} />}
        {step === 3 && <Step3 form={form} set={set} stepErrors={stepErrors} />}
        {step === 4 && <Step4 form={form} set={set} stepErrors={stepErrors} />}

        {error && (
          <div style={{ marginTop: 20, padding: '12px 16px', borderRadius: 10, backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
          {step > 1 && (
            <button type="button" onClick={back}
              style={{ flex: 1, padding: '13px 0', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer',
                backgroundColor: 'transparent', color: 'rgba(255,255,255,0.5)',
                border: '1px solid rgba(255,255,255,0.12)' }}>
              {t('event_form_back')}
            </button>
          )}
          {step < 4 ? (
            <button type="button" onClick={next}
              style={{ flex: 1, padding: '13px 0', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer',
                backgroundColor: '#E8A020', color: '#0F0F1A', border: 'none' }}>
              {t('event_form_continue')}
            </button>
          ) : (
            <button type="button" onClick={handleFinalSubmit} disabled={loading}
              style={{ flex: 1, padding: '13px 0', borderRadius: 12, fontSize: 14, fontWeight: 700,
                cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.6 : 1,
                backgroundColor: '#E8A020', color: '#0F0F1A', border: 'none' }}>
              {loading ? t('event_form_submitting') : t('event_form_submit_event')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
