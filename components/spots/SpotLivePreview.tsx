'use client'
import { useState } from 'react'
import SpotCard from '@/app/components/SpotCard'
import CroppedImage from '@/components/ui/CroppedImage'
import { SPOT_CATEGORIES, SPOT_CROP_ASPECT, type Spot } from '@/app/spots/types'
import { serializeOpeningHours, type SpotFormData } from './SpotFormSteps'

const GOLD = '#E8A020'

// Which step each field is filled in at — drives the "pending" placeholders.
const FIELD_STEP = {
  name: 1, category: 1, subcategory: 1,
  city: 2, address: 2,
  cover_image: 3, gallery: 3, opening_hours: 3,
  phone: 4, website: 4, price_level: 4, description: 4,
} as const

const ghostStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.2)',
  fontStyle: 'italic',
  fontSize: 12,
}

function Ghost({ label, atStep }: { label: string; atStep: number }) {
  return <span style={ghostStyle}>{label} — βήμα {atStep}</span>
}

/** The form state as the domain object the public components consume. */
export function formToSpot(form: SpotFormData): Spot & { gallery: string[]; openingHours: Record<string, string> } {
  return {
    id: 'preview',
    name: form.name || 'Το spot σου',
    slug: 'preview',
    category: (form.category || 'drink') as Spot['category'],
    subcategory: form.subcategory || null,
    city: form.city,
    neighborhood: form.neighborhood || null,
    address: form.address || null,
    lat: form.lat,
    lng: form.lng,
    description: form.description || null,
    coverImage: form.cover_image || null,
    crop: form.crop,
    priceLevel: form.price_level || null,
    rating: null,
    phone: form.phone || null,
    website: form.website || null,
    instagram: form.instagram || null,
    isSponsored: false,
    claimedByProfileId: null,
    gallery: form.gallery,
    openingHours: serializeOpeningHours(form.opening_hours),
  }
}

function CardTab({ form }: { form: SpotFormData }) {
  const spot = formToSpot(form)
  return (
    <div>
      {/* The card is a Link and carries its own save button; neither should do
          anything from inside a preview. */}
      <div style={{ pointerEvents: 'none' }}>
        <SpotCard spot={spot} />
      </div>
      <div style={{ marginTop: 14 }}>
        <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.35)', marginBottom: 8 }}>
          Συμπαγής μορφή
        </p>
        <div style={{ pointerEvents: 'none' }}>
          <SpotCard spot={spot} compact />
        </div>
      </div>
    </div>
  )
}

function PageTab({ form, step }: { form: SpotFormData; step: number }) {
  const cat = SPOT_CATEGORIES.find(c => c.key === form.category)
  const hours = serializeOpeningHours(form.opening_hours)
  const contact = [form.phone, form.website, form.instagram].filter(Boolean)

  return (
    <div style={{
      backgroundColor: '#0F0F1A',
      border: '1px solid rgba(255,255,255,0.10)',
      borderRadius: 28,
      overflow: 'hidden',
      boxShadow: '0 18px 50px rgba(0,0,0,0.45)',
    }}>
      {/* Hero */}
      <div style={{ position: 'relative', width: '100%', aspectRatio: `${SPOT_CROP_ASPECT}`, backgroundColor: '#111120' }}>
        {form.cover_image ? (
          <CroppedImage src={form.cover_image} alt="" crop={form.crop} sizes="380px" />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Ghost label="Εξώφυλλο" atStep={FIELD_STEP.cover_image} />
          </div>
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(15,15,26,0.95) 0%, rgba(15,15,26,0) 55%)', pointerEvents: 'none' }} />
        {cat && (
          <div style={{ position: 'absolute', top: 12, left: 12 }}>
            <span style={{
              padding: '4px 10px', borderRadius: 999, fontSize: 10, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.06em',
              backgroundColor: 'rgba(232,160,32,0.18)', color: GOLD,
              border: '1px solid rgba(232,160,32,0.4)', backdropFilter: 'blur(6px)',
            }}>
              {cat.emoji} {cat.label}
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: '18px 18px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h3 style={{ fontFamily: 'var(--font-spectral), Georgia, serif', fontSize: 22, lineHeight: 1.2, color: 'white', fontWeight: 600 }}>
          {form.name || <Ghost label="Όνομα" atStep={FIELD_STEP.name} />}
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>
            {form.subcategory || <span style={ghostStyle}>Υποκατηγορία</span>}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>
            {form.address || form.city
              ? `📍 ${[form.address, form.neighborhood, form.city].filter(Boolean).join(', ')}`
              : <Ghost label="Τοποθεσία" atStep={FIELD_STEP.address} />}
          </div>
          {form.price_level > 0 && (
            <div style={{ fontSize: 12, fontWeight: 700, color: GOLD }}>{'€'.repeat(form.price_level)}</div>
          )}
        </div>

        {/* Description */}
        {form.description ? (
          <p style={{ fontSize: 12, lineHeight: 1.6, color: 'rgba(255,255,255,0.55)', whiteSpace: 'pre-wrap' }}>
            {form.description}
          </p>
        ) : step < FIELD_STEP.description && (
          <Ghost label="Περιγραφή" atStep={FIELD_STEP.description} />
        )}

        {/* Opening hours */}
        {Object.keys(hours).length > 0 ? (
          <div>
            <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.35)', marginBottom: 7 }}>
              Ωράριο
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {Object.entries(hours).map(([day, hrs]) => (
                <div key={day} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5 }}>
                  <span style={{ color: 'rgba(255,255,255,0.5)' }}>{day}</span>
                  <span style={{ color: 'rgba(255,255,255,0.8)' }}>{hrs}</span>
                </div>
              ))}
            </div>
          </div>
        ) : step < FIELD_STEP.opening_hours && (
          <Ghost label="Ωράριο" atStep={FIELD_STEP.opening_hours} />
        )}

        {/* Gallery strip */}
        {form.gallery.length > 0 && (
          <div>
            <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.35)', marginBottom: 7 }}>
              Gallery
            </p>
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
              {form.gallery.map((url, i) => (
                <img key={i} src={url} alt="" style={{ width: 58, height: 58, flexShrink: 0, objectFit: 'cover', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)' }} />
              ))}
            </div>
          </div>
        )}

        {/* Contact */}
        {contact.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {contact.map(c => (
              <span key={c} style={{
                padding: '5px 11px', borderRadius: 999, fontSize: 11,
                backgroundColor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)',
                border: '1px solid rgba(255,255,255,0.1)', maxWidth: '100%',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {c}
              </span>
            ))}
          </div>
        ) : step < FIELD_STEP.phone && (
          <Ghost label="Επικοινωνία" atStep={FIELD_STEP.phone} />
        )}
      </div>
    </div>
  )
}

export default function SpotLivePreview({ form, step }: { form: SpotFormData; step: number }) {
  const [tab, setTab] = useState<'card' | 'page'>('card')

  const tabStyle = (on: boolean): React.CSSProperties => ({
    flex: 1, padding: '7px 0', borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: 'pointer',
    backgroundColor: on ? 'rgba(232,160,32,0.16)' : 'transparent',
    color: on ? GOLD : 'rgba(255,255,255,0.4)',
    border: `1px solid ${on ? 'rgba(232,160,32,0.35)' : 'transparent'}`,
    transition: 'all 0.15s',
  })

  return (
    <div>
      <div style={{
        display: 'flex', gap: 6, marginBottom: 14, padding: 4, borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
      }}>
        <button type="button" onClick={() => setTab('card')} style={tabStyle(tab === 'card')}>Κάρτα</button>
        <button type="button" onClick={() => setTab('page')} style={tabStyle(tab === 'page')}>Σελίδα</button>
      </div>

      {tab === 'card' ? <CardTab form={form} /> : <PageTab form={form} step={step} />}
    </div>
  )
}
