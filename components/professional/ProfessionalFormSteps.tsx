'use client'
import { useState, useEffect } from 'react'
import ImageUpload from '@/components/ui/ImageUpload'
import ImageCropper from '@/components/ui/ImageCropper'
import CroppedImage from '@/components/ui/CroppedImage'
import CreatorGallery from '@/components/ui/CreatorGallery'
import type { CropBox } from '@/components/ui/CroppedImage'
import { NETWORK, networkCategoryLabel } from '@/app/lib/searchData'
import { PRICE_RANGES } from '@/app/lib/networkProfile'
import ProfessionalLivePreview from './ProfessionalLivePreview'
import { useLanguage } from '@/app/components/LanguageContext'
import type { TranslationKey } from '@/app/lib/translations'

/** The two taxonomy groups, read straight off NETWORK.Professionals so the
 *  wizard cannot drift from /network/professionals. */
export const PRO_GROUPS = ['For Events', 'For Artists'] as const
export type ProGroup = (typeof PRO_GROUPS)[number]

export const GROUP_META: Record<ProGroup, { emoji: string; label: string; subKey: TranslationKey; accent: string }> = {
  'For Events':  { emoji: '🎉', label: 'For Events',  subKey: 'pro_group_events_sub', accent: '#E8A020' },
  'For Artists': { emoji: '🎤', label: 'For Artists', subKey: 'pro_group_artists_sub', accent: '#60A5FA' },
}

export const ROLES_BY_GROUP: Record<ProGroup, string[]> = {
  'For Events':  Object.keys(NETWORK.Professionals['For Events']),
  'For Artists': Object.keys(NETWORK.Professionals['For Artists']),
}

/** Which group a stored network_category belongs to, so an edit opens on the
 *  right card. Returns '' for a category outside both groups. */
export function groupOfRole(role: string): ProGroup | '' {
  for (const g of PRO_GROUPS) if (ROLES_BY_GROUP[g].includes(role)) return g
  return ''
}

export const MAX_TAGS = 8

const AVATAR_CROP_ASPECT = 1
const COVER_CROP_ASPECT = 3

const SOCIAL_FIELDS = [
  { key: 'instagram',      label: 'Instagram',  placeholder: '@handle' },
  { key: 'facebook',       label: 'Facebook',   placeholder: 'https://facebook.com/...' },
  { key: 'tiktok',         label: 'TikTok',     placeholder: '@handle' },
  { key: 'youtube_url',    label: 'YouTube',    placeholder: 'https://youtube.com/...' },
  { key: 'soundcloud_url', label: 'SoundCloud', placeholder: 'https://soundcloud.com/...' },
  { key: 'spotify_url',    label: 'Spotify',    placeholder: 'https://open.spotify.com/...' },
] as const

const STEPS: { n: number; titleKey: TranslationKey }[] = [
  { n: 1, titleKey: 'wizard_step_basics' },
  { n: 2, titleKey: 'wizard_step_contact' },
  { n: 3, titleKey: 'dashboard_section_portfolio' },
  { n: 4, titleKey: 'wizard_step_review' },
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

export interface ProfessionalFormData {
  display_name: string
  group: ProGroup | ''
  network_category: string
  bio: string
  tags: string[]
  phone: string
  booking_email: string
  website: string
  location: string
  is_available: boolean
  price_range: string
  avatar_url: string
  avatar_crop: CropBox | null
  cover_url: string
  cover_crop: CropBox | null
  instagram: string
  facebook: string
  tiktok: string
  youtube_url: string
  soundcloud_url: string
  spotify_url: string
}

type SetField = <K extends keyof ProfessionalFormData>(k: K, v: ProfessionalFormData[K]) => void

const DEFAULTS: ProfessionalFormData = {
  display_name: '', group: '', network_category: '', bio: '', tags: [],
  phone: '', booking_email: '', website: '', location: '',
  is_available: true, price_range: '',
  avatar_url: '', avatar_crop: null, cover_url: '', cover_crop: null,
  instagram: '', facebook: '', tiktok: '', youtube_url: '', soundcloud_url: '', spotify_url: '',
}

/** A stored profile row, into the wizard's state shape. */
export function profileToProForm(profile: any): Partial<ProfessionalFormData> {
  const category = profile.network_category ?? ''
  const hasAvatarCrop = profile.avatar_crop_x != null && profile.avatar_crop_y != null
    && profile.avatar_crop_width != null && profile.avatar_crop_height != null
  const hasCoverCrop = profile.cover_crop_x != null && profile.cover_crop_y != null
    && profile.cover_crop_width != null && profile.cover_crop_height != null

  return {
    display_name: profile.display_name ?? '',
    group: groupOfRole(category),
    network_category: category,
    bio: profile.bio ?? '',
    tags: Array.isArray(profile.tags) ? profile.tags : [],
    phone: profile.phone ?? '',
    booking_email: profile.booking_email ?? '',
    website: profile.website ?? '',
    location: profile.location ?? '',
    // A profile that has never been through the wizard has is_available null —
    // available is the sensible default for a listing that wants bookings.
    is_available: profile.is_available ?? true,
    price_range: profile.price_range ?? '',
    avatar_url: profile.avatar_url ?? '',
    avatar_crop: hasAvatarCrop
      ? { crop_x: profile.avatar_crop_x, crop_y: profile.avatar_crop_y, crop_width: profile.avatar_crop_width, crop_height: profile.avatar_crop_height }
      : null,
    cover_url: profile.cover_url ?? '',
    cover_crop: hasCoverCrop
      ? { crop_x: profile.cover_crop_x, crop_y: profile.cover_crop_y, crop_width: profile.cover_crop_width, crop_height: profile.cover_crop_height }
      : null,
    instagram: profile.instagram ?? '',
    facebook: profile.facebook ?? '',
    tiktok: profile.tiktok ?? '',
    youtube_url: profile.youtube_url ?? '',
    soundcloud_url: profile.soundcloud_url ?? '',
    spotify_url: profile.spotify_url ?? '',
  }
}

/**
 * The exact `profiles` row shape the wizard writes. `network_tab` is pinned to
 * 'Professionals' — /network/professionals filters on it, and the old pro save
 * path used to write 'Artists' here, which dropped the profile off that page.
 * `network_subcategory` is deliberately absent: professionals have no second
 * taxonomy level, so leaving it out preserves whatever a row already holds.
 */
export function proFormToPayload(form: ProfessionalFormData) {
  return {
    display_name: form.display_name.trim(),
    bio: form.bio.trim() || null,
    location: form.location.trim() || null,
    network_tab: 'Professionals',
    network_category: form.network_category || null,
    tags: form.tags,
    phone: form.phone.trim() || null,
    booking_email: form.booking_email.trim() || null,
    website: form.website.trim() || null,
    is_available: form.is_available,
    price_range: form.price_range || null,
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
    instagram: form.instagram.trim() || null,
    facebook: form.facebook.trim() || null,
    tiktok: form.tiktok.trim() || null,
    youtube_url: form.youtube_url.trim() || null,
    soundcloud_url: form.soundcloud_url.trim() || null,
    spotify_url: form.spotify_url.trim() || null,
  }
}

interface Props {
  /** The profile being edited — the gallery writes straight to creator_gallery,
   *  so it needs the id, and the preview renders the real @username. */
  profileId: string
  username: string
  isVerified?: boolean
  initialData?: Partial<ProfessionalFormData>
  onSubmit: (data: ProfessionalFormData) => void
  loading: boolean
  error: string
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

function TagInput({ tags, set }: { tags: string[]; set: SetField }) {
  const { t } = useLanguage()
  const [draft, setDraft] = useState('')

  function commit(raw: string) {
    // Comma-separated paste and one-at-a-time typing land in the same place.
    const incoming = raw.split(',').map(t => t.trim()).filter(Boolean)
    if (!incoming.length) return
    const next = [...tags]
    for (const tag of incoming) {
      if (next.length >= MAX_TAGS) break
      if (!next.some(t => t.toLowerCase() === tag.toLowerCase())) next.push(tag)
    }
    set('tags', next)
    setDraft('')
  }

  return (
    <div>
      {tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
          {tags.map(tag => (
            <span key={tag} style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '6px 10px 6px 14px', borderRadius: 999, fontSize: 13,
              backgroundColor: 'rgba(232,160,32,0.14)', color: '#E8A020',
              border: '1px solid rgba(232,160,32,0.35)',
            }}>
              {tag}
              <button type="button" aria-label={`${t('common_remove')} ${tag}`}
                onClick={() => set('tags', tags.filter(t => t !== tag))}
                style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 15, lineHeight: 1, padding: 0 }}>
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          style={{ ...inp, opacity: tags.length >= MAX_TAGS ? 0.4 : 1 }}
          disabled={tags.length >= MAX_TAGS}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commit(draft) }
            else if (e.key === 'Backspace' && !draft && tags.length) set('tags', tags.slice(0, -1))
          }}
          onBlur={() => commit(draft)}
          placeholder={t('pro_tags_ph')} />
        <button type="button" onClick={() => commit(draft)} disabled={!draft.trim() || tags.length >= MAX_TAGS}
          style={{
            flexShrink: 0, padding: '0 18px', borderRadius: 12, fontSize: 13, fontWeight: 700,
            cursor: !draft.trim() || tags.length >= MAX_TAGS ? 'default' : 'pointer',
            opacity: !draft.trim() || tags.length >= MAX_TAGS ? 0.4 : 1,
            backgroundColor: 'rgba(232,160,32,0.14)', color: '#E8A020', border: '1px solid rgba(232,160,32,0.35)',
          }}>
          {t('release_add')}
        </button>
      </div>
      <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.30)', marginTop: 6 }}>
        {t('pro_tags_hint')} · {tags.length}/{MAX_TAGS}
      </p>
    </div>
  )
}

function Step1({ form, set, stepErrors }: {
  form: ProfessionalFormData; set: SetField; stepErrors: Record<string, string>
}) {
  const { t, lang } = useLanguage()
  const roles = form.group ? ROLES_BY_GROUP[form.group] : []
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <label style={lbl}>{t('wizard_name')} *</label>
        <input style={inp} value={form.display_name} onChange={e => set('display_name', e.target.value)}
          placeholder={t('pro_name_ph')} />
        <Err stepErrors={stepErrors} k="display_name" />
      </div>

      <div>
        <label style={lbl}>{t('pro_audience_label')} *</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
          {PRO_GROUPS.map(g => {
            const meta = GROUP_META[g]
            const on = form.group === g
            return (
              <button key={g} type="button"
                onClick={() => {
                  set('group', g)
                  // The role list is per-group, so a stale pick cannot carry over.
                  if (form.group !== g) set('network_category', '')
                }}
                style={{
                  textAlign: 'left', padding: '16px 16px', borderRadius: 14, cursor: 'pointer',
                  transition: 'all 0.15s', minHeight: 92,
                  backgroundColor: on ? `${meta.accent}22` : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${on ? `${meta.accent}73` : 'rgba(255,255,255,0.1)'}`,
                }}>
                <div style={{ fontSize: 24, lineHeight: 1 }}>{meta.emoji}</div>
                <div style={{ fontSize: 15, fontWeight: 700, marginTop: 9, color: on ? meta.accent : 'white' }}>{meta.label}</div>
                <div style={{ fontSize: 11, marginTop: 4, color: 'rgba(255,255,255,0.35)', lineHeight: 1.4 }}>{t(meta.subKey)}</div>
              </button>
            )
          })}
        </div>
        <Err stepErrors={stepErrors} k="group" />
      </div>

      {form.group && (
        <div>
          <label style={lbl}>{t('dashboard_pro_check_category')} *</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {roles.map(role => {
              const on = form.network_category === role
              const accent = GROUP_META[form.group as ProGroup].accent
              return (
                <button key={role} type="button"
                  onClick={() => set('network_category', on ? '' : role)}
                  style={{
                    padding: '8px 16px', borderRadius: 999, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s',
                    backgroundColor: on ? `${accent}2E` : 'rgba(255,255,255,0.05)',
                    color: on ? accent : 'rgba(255,255,255,0.4)',
                    border: `1px solid ${on ? `${accent}66` : 'rgba(255,255,255,0.1)'}`,
                  }}>
                  {networkCategoryLabel(role, lang)}
                </button>
              )
            })}
          </div>
          <Err stepErrors={stepErrors} k="network_category" />
        </div>
      )}

      <div>
        <label style={lbl}>
          {t('wizard_description')} *{' '}
          <span style={{ color: 'rgba(255,255,255,0.40)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
            {form.bio.length}/600
          </span>
        </label>
        <textarea style={{ ...inp, minHeight: 110, resize: 'vertical' }} maxLength={600}
          value={form.bio} onChange={e => set('bio', e.target.value)}
          placeholder={t('pro_desc_ph')} />
        <Err stepErrors={stepErrors} k="bio" />
      </div>

      <div>
        <label style={lbl}>
          Tags{' '}
          <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'rgba(255,255,255,0.40)' }}>
            {t('wizard_optional')}
          </span>
        </label>
        <TagInput tags={form.tags} set={set} />
      </div>
    </div>
  )
}

function Step2({ form, set, stepErrors }: {
  form: ProfessionalFormData; set: SetField; stepErrors: Record<string, string>
}) {
  const { t } = useLanguage()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <label style={lbl}>{t('dashboard_phone')}</label>
        <input style={inp} type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+30 69..." />
        <Err stepErrors={stepErrors} k="phone" />
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
        <label style={lbl}>{t('wizard_city')} *</label>
        <input style={inp} value={form.location} onChange={e => set('location', e.target.value)} placeholder={t('dashboard_city_placeholder')} />
        <Err stepErrors={stepErrors} k="location" />
      </div>

      {/* Same toggle the dashboard availability indicator uses. */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
        padding: '16px 18px', borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
      }}>
        <div>
          <p style={{ fontSize: 14, color: 'white', fontWeight: 600 }}>{t('pro_available_bookings')}</p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 3 }}>
            {t('pro_available_hint')}
          </p>
        </div>
        <button type="button" onClick={() => set('is_available', !form.is_available)}
          aria-pressed={form.is_available}
          style={{
            position: 'relative', width: 44, height: 24, borderRadius: 999, flexShrink: 0,
            cursor: 'pointer', border: 'none', transition: 'background-color 0.15s',
            backgroundColor: form.is_available ? '#E8A020' : 'rgba(255,255,255,0.15)',
          }}>
          <span style={{
            position: 'absolute', top: 4, left: form.is_available ? 24 : 4,
            width: 16, height: 16, borderRadius: '50%', backgroundColor: 'white', transition: 'left 0.15s',
          }} />
        </button>
      </div>

      <div>
        <label style={lbl}>{t('wizard_price_range')}</label>
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
    </div>
  )
}

function Step3({ form, set, stepErrors, profileId, showAvatarCropper, setShowAvatarCropper, showCoverCropper, setShowCoverCropper }: {
  form: ProfessionalFormData; set: SetField; stepErrors: Record<string, string>
  profileId: string
  showAvatarCropper: boolean
  setShowAvatarCropper: (v: boolean) => void
  showCoverCropper: boolean
  setShowCoverCropper: (v: boolean) => void
}) {
  const { t } = useLanguage()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {/* Cover */}
      <div>
        <label style={lbl}>{t('wizard_cover')}</label>
        {form.cover_url ? (
          <div>
            <div style={{ position: 'relative', width: '100%', aspectRatio: `${COVER_CROP_ASPECT}`, borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
              <CroppedImage src={form.cover_url} alt="" crop={form.cover_crop} sizes="(max-width: 980px) 100vw, 620px" />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <button type="button" onClick={() => setShowCoverCropper(true)}
                style={{ padding: '8px 16px', borderRadius: 10, fontSize: 12, cursor: 'pointer', backgroundColor: 'rgba(232,160,32,0.1)', color: '#E8A020', border: '1px solid rgba(232,160,32,0.3)' }}>
                {t('wizard_adjust_crop')}
              </button>
              <button type="button" onClick={() => { set('cover_url', ''); set('cover_crop', null) }}
                style={{ padding: '8px 16px', borderRadius: 10, fontSize: 12, cursor: 'pointer', backgroundColor: 'transparent', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.12)' }}>
                {t('common_remove')}
              </button>
            </div>
          </div>
        ) : (
          <ImageUpload folder="banners" onUpload={url => { set('cover_url', url); set('cover_crop', null) }} />
        )}

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

      {/* Avatar */}
      <div>
        <label style={lbl}>{t('dashboard_pro_check_avatar')} *</label>
        {form.avatar_url ? (
          <div>
            <div style={{ position: 'relative', width: 140, height: 140, borderRadius: 18, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
              <CroppedImage src={form.avatar_url} alt="" crop={form.avatar_crop} sizes="140px" />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <button type="button" onClick={() => setShowAvatarCropper(true)}
                style={{ padding: '8px 16px', borderRadius: 10, fontSize: 12, cursor: 'pointer', backgroundColor: 'rgba(232,160,32,0.1)', color: '#E8A020', border: '1px solid rgba(232,160,32,0.3)' }}>
                {t('wizard_adjust_crop')}
              </button>
              <button type="button" onClick={() => { set('avatar_url', ''); set('avatar_crop', null) }}
                style={{ padding: '8px 16px', borderRadius: 10, fontSize: 12, cursor: 'pointer', backgroundColor: 'transparent', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.12)' }}>
                {t('common_remove')}
              </button>
            </div>
          </div>
        ) : (
          <ImageUpload folder="avatars" onUpload={url => { set('avatar_url', url); set('avatar_crop', null) }} />
        )}
        <Err stepErrors={stepErrors} k="avatar_url" />

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

      {/* Gallery — the same creator_gallery store artists use. It writes on
          upload rather than on submit, so it is live from the moment it opens. */}
      <div>
        <label style={lbl}>Gallery</label>
        <CreatorGallery profileId={profileId} />
      </div>

      {/* Socials */}
      <div>
        <label style={lbl}>Social links</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {SOCIAL_FIELDS.map(f => (
            <div key={f.key}>
              <label style={{ ...lbl, fontSize: 10, color: 'rgba(255,255,255,0.30)' }}>{f.label}</label>
              <input style={inp} value={form[f.key]} onChange={e => set(f.key, e.target.value)} placeholder={f.placeholder} />
            </div>
          ))}
          <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.30)' }}>
            {t('pro_website_note')}
          </p>
        </div>
      </div>
    </div>
  )
}

function Step4({ form }: { form: ProfessionalFormData }) {
  const { t, lang } = useLanguage()
  const socials = SOCIAL_FIELDS.filter(f => form[f.key].trim()).map(f => f.label)
  const contact = [form.phone, form.booking_email, form.website].filter(c => c.trim())
  const coverLbl = t('wizard_cover').toLowerCase()

  const summary: { label: string; value: string }[] = [
    { label: t('wizard_name'), value: form.display_name.trim() || '—' },
    { label: t('dashboard_pro_check_category'), value: [form.group, networkCategoryLabel(form.network_category, lang)].filter(Boolean).join(' · ') || '—' },
    { label: t('wizard_description'), value: form.bio.trim() ? `${form.bio.trim().length} ${t('pro_chars')}` : '—' },
    { label: 'Tags', value: form.tags.length ? form.tags.join(' · ') : '—' },
    { label: t('wizard_step_contact'), value: contact.length ? contact.join(' · ') : '—' },
    { label: t('wizard_city'), value: form.location.trim() || '—' },
    { label: t('pro_availability'), value: form.is_available ? t('pro_available_bookings') : t('pro_not_available') },
    { label: t('wizard_price_range'), value: form.price_range || '—' },
    { label: t('dashboard_photos'), value: `${form.avatar_url ? 'avatar ✓' : 'avatar —'} · ${form.cover_url ? `${coverLbl} ✓` : `${coverLbl} —`}` },
    { label: 'Socials', value: socials.length ? socials.join(' · ') : '—' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
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
        </div>
      </div>

      <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.40)', lineHeight: 1.6 }}>
        {t('pro_save_note')} «{form.group || 'Professionals'}».
      </p>
    </div>
  )
}

export default function ProfessionalFormSteps({
  profileId, username, isVerified = false, initialData, onSubmit, loading, error,
}: Props) {
  const { t } = useLanguage()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<ProfessionalFormData>({ ...DEFAULTS, ...initialData })
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
      if (!form.display_name.trim()) e.display_name = t('err_name_required')
      if (!form.group) e.group = t('err_pick_group')
      else if (!form.network_category) e.network_category = t('err_pick_specialty')
      if (!form.bio.trim()) e.bio = t('err_desc_required')
    }
    if (n === 2) {
      if (!form.location.trim()) e.location = t('err_city_required')
      // The profile's Book Now CTA and contact pill both need something to point
      // at — one of the two is enough, but not neither.
      if (!form.phone.trim() && !form.booking_email.trim()) {
        e.booking_email = t('err_contact_required')
      } else if (form.booking_email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.booking_email.trim())) {
        e.booking_email = t('err_email_invalid')
      }
    }
    if (n === 3) {
      if (!form.avatar_url) e.avatar_url = t('err_avatar_required')
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
            👁 {t('wizard_preview')}
          </button>
        )}

        <StepIndicator step={step} setStep={setStep} />

        <div style={{ backgroundColor: '#111120', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '32px 28px' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'white', marginBottom: 24 }}>
            {t(STEPS[step - 1].titleKey)}
          </h2>

          {step === 1 && <Step1 form={form} set={set} stepErrors={stepErrors} />}
          {step === 2 && <Step2 form={form} set={set} stepErrors={stepErrors} />}
          {step === 3 && (
            <Step3 form={form} set={set} stepErrors={stepErrors} profileId={profileId}
              showAvatarCropper={showAvatarCropper} setShowAvatarCropper={setShowAvatarCropper}
              showCoverCropper={showCoverCropper} setShowCoverCropper={setShowCoverCropper} />
          )}
          {step === 4 && <Step4 form={form} />}

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
              <button type="button" onClick={next}
                style={{ flex: 1, padding: '13px 0', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', backgroundColor: '#E8A020', color: '#0F0F1A', border: 'none' }}>
                {t('event_form_continue')}
              </button>
            ) : (
              <button type="button" onClick={handleFinalSubmit} disabled={loading}
                style={{ flex: 1, padding: '13px 0', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.6 : 1, backgroundColor: '#E8A020', color: '#0F0F1A', border: 'none' }}>
                {loading ? t('dashboard_saving') : t('wizard_save_pro')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Desktop: sticky side-by-side preview */}
      {!isMobile && (
        <aside style={{ position: 'sticky', top: 0 }}>
          <p style={{ ...lbl, marginBottom: 12 }}>{t('wizard_preview')}</p>
          <ProfessionalLivePreview form={form} step={step} username={username} profileId={profileId} isVerified={isVerified} />
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
            <ProfessionalLivePreview form={form} step={step} username={username} profileId={profileId} isVerified={isVerified} />
          </div>
        </div>
      )}
    </div>
  )
}
