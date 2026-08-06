'use client'
import { useState } from 'react'
import { Spectral } from 'next/font/google'
import { useLanguage } from '@/app/components/LanguageContext'
import type { EventFormData } from './EventFormSteps'

const spectral = Spectral({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  display: 'swap',
})

const GOLD = '#E8A020'

// Which step each field is filled in at — drives the "pending" placeholders.
const FIELD_STEP = {
  title: 1, genres: 1, short_description: 1, full_description: 1,
  date: 2, venue: 2, image_url: 2, gallery: 2,
  price: 3, age_restriction_level: 3, dress_code: 3, lineup: 3,
} as const

const ghostStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.2)',
  fontStyle: 'italic',
  fontSize: 12,
}

function Ghost({ label, atStep }: { label: string; atStep: number }) {
  const { t } = useLanguage()
  return <span style={ghostStyle}>{label} — {t('event_preview_pending_step')} {atStep}</span>
}

function formatDate(date: string, start: string, end: string) {
  if (!date) return ''
  const d = new Date(`${date}T${start || '00:00'}`)
  const day = Number.isNaN(d.getTime())
    ? date
    : d.toLocaleDateString('el-GR', { weekday: 'short', day: 'numeric', month: 'short' })
  if (!start) return day
  return end ? `${day} · ${start}–${end}` : `${day} · ${start}`
}

export default function EventLivePreview({ form, step }: { form: EventFormData; step: number }) {
  const { t } = useLanguage()
  const [heroIndex, setHeroIndex] = useState(0)

  const images = [form.image_url, ...form.gallery].filter(Boolean)
  const hero = images[Math.min(heroIndex, images.length - 1)] ?? ''
  const lineup = form.lineup.split(',').map(s => s.trim()).filter(Boolean)
  const description = form.full_description || form.short_description

  const infoCards: { label: string; value: string }[] = []
  if (form.age_restriction_level !== 'none') {
    infoCards.push({ label: t('event_age_restriction_heading'), value: form.age_restriction_level })
  }
  if (form.dress_code) {
    infoCards.push({ label: t('event_form_dress_code_label'), value: form.dress_code })
  }

  return (
    <div style={{
      backgroundColor: '#0F0F1A',
      border: '1px solid rgba(255,255,255,0.10)',
      borderRadius: 28,
      overflow: 'hidden',
      boxShadow: '0 18px 50px rgba(0,0,0,0.45)',
    }}>
      {/* Hero */}
      <div style={{ position: 'relative', height: 220, backgroundColor: '#111120' }}>
        {hero ? (
          <img src={hero} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Ghost label={t('event_form_image_label')} atStep={FIELD_STEP.image_url} />
          </div>
        )}

        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(15,15,26,0.95) 0%, rgba(15,15,26,0) 55%)',
          pointerEvents: 'none',
        }} />

        {form.genres.length > 0 && (
          <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {form.genres.slice(0, 2).map(g => (
              <span key={g} style={{
                padding: '4px 10px', borderRadius: 999, fontSize: 10, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.06em',
                backgroundColor: 'rgba(232,160,32,0.18)', color: GOLD,
                border: '1px solid rgba(232,160,32,0.4)', backdropFilter: 'blur(6px)',
              }}>
                {g}
              </span>
            ))}
          </div>
        )}

        {images.length > 1 && (
          <div style={{ position: 'absolute', bottom: 10, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 6 }}>
            {images.map((_, i) => (
              <button key={i} type="button" onClick={() => setHeroIndex(i)}
                aria-label={`${t('event_gallery_heading')} ${i + 1}`}
                style={{
                  width: 6, height: 6, borderRadius: '50%', padding: 0, cursor: 'pointer', border: 'none',
                  backgroundColor: i === heroIndex ? GOLD : 'rgba(255,255,255,0.3)',
                  transition: 'background 0.2s',
                }} />
            ))}
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: '18px 18px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h3 className={spectral.className} style={{ fontSize: 22, lineHeight: 1.2, color: 'white', fontWeight: 600 }}>
          {form.title || <Ghost label={t('event_form_review_title_label')} atStep={FIELD_STEP.title} />}
        </h3>

        {/* Meta */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>
            {form.date
              ? formatDate(form.date, form.start_time, form.end_time)
              : <Ghost label={t('event_form_date_label')} atStep={FIELD_STEP.date} />}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>
            {form.venue
              ? [form.venue, form.city].filter(Boolean).join(', ')
              : <Ghost label={t('event_form_venue_label')} atStep={FIELD_STEP.venue} />}
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: GOLD }}>
            {step < FIELD_STEP.price && !form.price
              ? <Ghost label={t('event_form_review_price_label')} atStep={FIELD_STEP.price} />
              : (form.price ? `€${form.price}` : t('event_form_free'))}
          </div>
        </div>

        {/* Info cards */}
        {infoCards.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: infoCards.length > 1 ? '1fr 1fr' : '1fr', gap: 8 }}>
            {infoCards.map(card => (
              <div key={card.label} style={{
                padding: '9px 11px', borderRadius: 12,
                backgroundColor: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}>
                <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.35)' }}>
                  {card.label}
                </p>
                <p style={{ fontSize: 12, color: 'white', marginTop: 3 }}>{card.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Lineup */}
        {lineup.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {lineup.map(name => (
              <span key={name} style={{
                padding: '5px 11px', borderRadius: 999, fontSize: 11,
                backgroundColor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}>
                {name}
              </span>
            ))}
          </div>
        ) : step < FIELD_STEP.lineup && (
          <Ghost label={t('event_form_lineup_label')} atStep={FIELD_STEP.lineup} />
        )}

        {/* Description */}
        {description ? (
          <p style={{ fontSize: 12, lineHeight: 1.6, color: 'rgba(255,255,255,0.55)', whiteSpace: 'pre-wrap' }}>
            {description}
          </p>
        ) : (
          <Ghost label={t('event_form_short_desc_label')} atStep={FIELD_STEP.short_description} />
        )}

        {/* Gallery strip */}
        {form.gallery.length > 0 && (
          <div>
            <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.35)', marginBottom: 7 }}>
              {t('event_gallery_heading')}
            </p>
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
              {form.gallery.map((url, i) => (
                <img key={i} src={url} alt="" style={{
                  width: 58, height: 58, flexShrink: 0, objectFit: 'cover',
                  borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)',
                }} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
