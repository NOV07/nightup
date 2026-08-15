'use client'
import { useState } from 'react'
import ProfileCard from '@/components/network/ProfileCard'
import CroppedImage from '@/components/ui/CroppedImage'
import type { Profile } from '@/app/lib/networkProfile'
import type { VenueFormData } from './VenueFormSteps'
import { useLanguage } from '@/app/components/LanguageContext'
import type { TranslationKey } from '@/app/lib/translations'

const GOLD = '#E8A020'

// Which step each field is filled in at — drives the "pending" placeholders.
const FIELD_STEP = {
  display_name: 1, network_category: 1, capacity: 1, bio: 1,
  city: 2, neighborhood: 2, address: 2,
  cover_url: 3, avatar_url: 3,
  phone: 4, booking_email: 4, website: 4, instagram: 4, price_range: 4,
} as const

const ghostStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.2)',
  fontStyle: 'italic',
  fontSize: 12,
}

function Ghost({ labelKey, atStep }: { labelKey: TranslationKey; atStep: number }) {
  const { t } = useLanguage()
  return <span style={ghostStyle}>{t(labelKey)} — {t('wizard_ghost_step')} {atStep}</span>
}

/** The form state as the row shape the network components consume. */
export function formToProfile(form: VenueFormData, id: string, username: string, isVerified: boolean, nameFallback = 'Ο χώρος σου'): Profile {
  return {
    id,
    username,
    display_name: form.display_name || nameFallback,
    avatar_url: form.avatar_url || null,
    avatar_crop_x: form.avatar_crop?.crop_x ?? null,
    avatar_crop_y: form.avatar_crop?.crop_y ?? null,
    avatar_crop_width: form.avatar_crop?.crop_width ?? null,
    avatar_crop_height: form.avatar_crop?.crop_height ?? null,
    bio: form.bio || null,
    // The card's location line is the city, matching what /network/venues reads
    // off profiles.location.
    location: form.city || null,
    network_tab: 'Venues',
    network_category: form.network_category || null,
    network_subcategory: null,
    is_featured: false,
    is_verified: isVerified,
  }
}

function CardTab({ form, id, username, isVerified }: {
  form: VenueFormData; id: string; username: string; isVerified: boolean
}) {
  const { lang } = useLanguage()
  // The card is a Link and carries its own follow button; neither should do
  // anything from inside a preview.
  return (
    <div style={{ pointerEvents: 'none' }}>
      <ProfileCard profile={formToProfile(form, id, username, isVerified, lang === 'en' ? 'Your venue' : 'Ο χώρος σου')} accent={GOLD} />
    </div>
  )
}

function PageTab({ form, step, username, isVerified }: {
  form: VenueFormData; step: number; username: string; isVerified: boolean
}) {
  const { t } = useLanguage()
  const capacity = parseInt(form.capacity, 10)
  const hasCapacity = Number.isFinite(capacity) && capacity > 0
  const contactPills = [form.website && 'Website', form.instagram && 'Instagram'].filter(Boolean) as string[]
  const contact = [form.booking_email, form.phone].filter(c => c.trim())
  const fullAddress = [form.address, form.neighborhood, form.city].filter(Boolean).join(', ')

  return (
    <div style={{
      backgroundColor: '#0F0F1A',
      border: '1px solid rgba(255,255,255,0.10)',
      borderRadius: 28,
      overflow: 'hidden',
      boxShadow: '0 18px 50px rgba(0,0,0,0.45)',
    }}>
      {/* Banner */}
      <div style={{ position: 'relative', width: '100%', height: 92, backgroundColor: '#111120' }}>
        {form.cover_url ? (
          <CroppedImage src={form.cover_url} alt="" crop={form.cover_crop} sizes="380px" />
        ) : (
          <div style={{
            width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #0e0e1c 0%, #1a1a2e 50%, #0e0e1c 100%)',
          }}>
            <Ghost labelKey="wizard_cover" atStep={FIELD_STEP.cover_url} />
          </div>
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, rgba(15,15,26,0.8) 100%)', pointerEvents: 'none' }} />
      </div>

      <div style={{ padding: '0 18px 22px' }}>
        {/* Avatar + name */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginTop: -26, marginBottom: 14 }}>
          <div style={{
            position: 'relative', width: 66, height: 66, flexShrink: 0,
            borderRadius: 14, overflow: 'hidden', border: '2px solid #E8A020', backgroundColor: '#1A1A2E',
          }}>
            {form.avatar_url ? (
              <CroppedImage src={form.avatar_url} alt="" crop={form.avatar_crop} sizes="66px" />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: GOLD }}>
                {form.display_name.trim() ? form.display_name.trim()[0].toUpperCase() : '?'}
              </div>
            )}
          </div>
          <div style={{ minWidth: 0, paddingBottom: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: 'white', lineHeight: 1.2 }}>
                {form.display_name || <Ghost labelKey="wizard_name" atStep={FIELD_STEP.display_name} />}
              </h3>
              {isVerified && (
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 999,
                  backgroundColor: 'rgba(232,160,32,0.15)', color: GOLD, border: '1px solid rgba(232,160,32,0.3)',
                }}>✓ Verified</span>
              )}
            </div>
            <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>@{username}</p>
          </div>
        </div>

        {/* Type + capacity pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          <span style={{ fontSize: 10.5, padding: '3px 9px', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.45)' }}>
            Venue
          </span>
          {form.network_category ? (
            <span style={{
              fontSize: 10.5, padding: '3px 9px', borderRadius: 999,
              backgroundColor: 'rgba(232,160,32,0.08)', color: GOLD, border: '0.5px solid rgba(232,160,32,0.2)',
            }}>
              {form.network_category}
            </span>
          ) : (
            <Ghost labelKey="wizard_type" atStep={FIELD_STEP.network_category} />
          )}
          {hasCapacity && (
            <span style={{
              fontSize: 10.5, padding: '3px 9px', borderRadius: 999,
              backgroundColor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.55)', border: '0.5px solid rgba(255,255,255,0.1)',
            }}>
              👥 {capacity} {t('profile_capacity_people')}
            </span>
          )}
        </div>

        {/* Bio */}
        {form.bio ? (
          <p style={{ fontSize: 12, lineHeight: 1.6, color: 'rgba(255,255,255,0.55)', marginBottom: 12, whiteSpace: 'pre-wrap' }}>
            {form.bio}
          </p>
        ) : step < FIELD_STEP.bio ? null : (
          <div style={{ marginBottom: 12 }}><Ghost labelKey="wizard_description" atStep={FIELD_STEP.bio} /></div>
        )}

        {/* Contact pills */}
        {contactPills.length > 0 || contact.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {contactPills.map(c => (
              <span key={c} style={{
                fontSize: 10.5, padding: '4px 10px', borderRadius: 999,
                backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.55)',
                border: '0.5px solid rgba(255,255,255,0.12)',
              }}>{c}</span>
            ))}
            {contact.map(c => (
              <span key={c} style={{
                fontSize: 10.5, padding: '4px 10px', borderRadius: 999, maxWidth: '100%',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                backgroundColor: 'rgba(232,160,32,0.08)', color: GOLD, border: '0.5px solid rgba(232,160,32,0.2)',
              }}>{c}</span>
            ))}
          </div>
        ) : step < FIELD_STEP.phone && (
          <div style={{ marginBottom: 12 }}><Ghost labelKey="wizard_step_contact" atStep={FIELD_STEP.phone} /></div>
        )}

        {/* Quick info strip */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
          {fullAddress ? (
            <span style={{
              fontSize: 10.5, padding: '4px 11px', borderRadius: 999,
              backgroundColor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.45)', border: '0.5px solid rgba(255,255,255,0.1)',
            }}>📍 {fullAddress}</span>
          ) : step < FIELD_STEP.address && <Ghost labelKey="wizard_step_location" atStep={FIELD_STEP.address} />}
          {form.price_range ? (
            <span style={{
              fontSize: 10.5, padding: '4px 11px', borderRadius: 999,
              backgroundColor: 'rgba(232,160,32,0.06)', color: GOLD, border: '0.5px solid rgba(232,160,32,0.18)',
            }}>{form.price_range}</span>
          ) : step < FIELD_STEP.price_range && <Ghost labelKey="wizard_price_range" atStep={FIELD_STEP.price_range} />}
        </div>

        {/* Upcoming events — the venue profile page leads with this section once
            the account starts hosting. */}
        <div>
          <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.35)', marginBottom: 8 }}>
            Upcoming Events
          </p>
          <div style={{
            padding: '14px 14px', borderRadius: 14, textAlign: 'center',
            backgroundColor: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.10)',
          }}>
            <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>
              {t('venue_preview_events_here')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function VenueLivePreview({ form, step, username, profileId, isVerified = false }: {
  form: VenueFormData
  step: number
  username: string
  profileId: string
  isVerified?: boolean
}) {
  const { t } = useLanguage()
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
        <button type="button" onClick={() => setTab('card')} style={tabStyle(tab === 'card')}>{t('wizard_card_tab')}</button>
        <button type="button" onClick={() => setTab('page')} style={tabStyle(tab === 'page')}>{t('wizard_page_tab')}</button>
      </div>

      {tab === 'card'
        ? <CardTab form={form} id={profileId} username={username} isVerified={isVerified} />
        : <PageTab form={form} step={step} username={username} isVerified={isVerified} />}
    </div>
  )
}
