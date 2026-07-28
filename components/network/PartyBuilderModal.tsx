'use client'
import { useState, type ComponentType } from 'react'
import Link from 'next/link'
import {
  BirthdayIcon, WeddingIcon, CorporateIcon, PrivatePartyIcon, LiveEventIcon, OtherIcon,
  GuestsIcon, LightingIcon, CateringIcon, PhotoIcon, DecorIcon,
  VenuesIcon, ArtistsIcon, type GlyphProps,
} from '@/components/network/icons'
import { useLanguage } from '@/app/components/LanguageContext'
import type { TranslationKey } from '@/app/lib/translations'

type Glyph = ComponentType<GlyphProps>

const GOLD = '#E8A020'

type Step = 'type' | 'size' | 'needs' | 'city' | 'result'
const STEPS: Step[] = ['type', 'size', 'needs', 'city', 'result']

interface Profile {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  bio: string | null
  location: string | null
  network_tab: string | null
  network_category: string | null
  network_subcategory: string | null
  is_verified: boolean | null
  is_featured: boolean | null
}

const EVENT_TYPES: { id: string; labelKey: TranslationKey; Icon: Glyph }[] = [
  { id: 'birthday',  labelKey: 'party_type_birthday',  Icon: BirthdayIcon },
  { id: 'wedding',   labelKey: 'party_type_wedding',   Icon: WeddingIcon },
  { id: 'corporate', labelKey: 'party_type_corporate', Icon: CorporateIcon },
  { id: 'private',   labelKey: 'party_type_private',   Icon: PrivatePartyIcon },
  { id: 'live',      labelKey: 'party_type_live',      Icon: LiveEventIcon },
  { id: 'other',     labelKey: 'party_type_other',     Icon: OtherIcon },
]

const SIZES: { id: string; labelKey: TranslationKey }[] = [
  { id: 'to20',    labelKey: 'party_size_20' },
  { id: '20to50',  labelKey: 'party_size_50' },
  { id: '50to100', labelKey: 'party_size_100' },
  { id: '100plus', labelKey: 'party_size_100plus' },
]

// Each need maps onto the network taxonomy the profiles are tagged with.
interface Need {
  id: string
  labelKey: TranslationKey
  Icon: Glyph
  tab: string
  category: string
  preselected: boolean
}

// Venue and DJ borrow the gate glyphs, so the same category reads the same way
// here as it does on the network landing page.
const NEEDS: Need[] = [
  { id: 'venue',    labelKey: 'party_need_venue',    Icon: VenuesIcon,   tab: 'Venues',        category: '',                          preselected: true },
  { id: 'dj',       labelKey: 'party_need_dj',       Icon: ArtistsIcon,  tab: 'Artists',       category: 'DJ',                        preselected: true },
  { id: 'lights',   labelKey: 'party_need_lights',   Icon: LightingIcon, tab: 'Professionals', category: 'Sound & Lighting',          preselected: true },
  { id: 'catering', labelKey: 'party_need_catering', Icon: CateringIcon, tab: 'Professionals', category: 'Catering',                  preselected: true },
  { id: 'photo',    labelKey: 'party_need_photo',    Icon: PhotoIcon,    tab: 'Professionals', category: 'Φωτογράφος / Videographer', preselected: false },
  { id: 'deco',     labelKey: 'party_need_deco',     Icon: DecorIcon,    tab: 'Professionals', category: 'Decoration',                preselected: false },
]

interface Props {
  onClose: () => void
  profiles: Profile[]
}

export default function PartyBuilderModal({ onClose, profiles }: Props) {
  const { t } = useLanguage()
  const [step, setStep] = useState<Step>('type')
  const [eventType, setEventType] = useState<string | null>(null)
  const [size, setSize] = useState<string | null>(null)
  const [needs, setNeeds] = useState<Set<string>>(
    () => new Set(NEEDS.filter(n => n.preselected).map(n => n.id))
  )
  const [selectedCity, setSelectedCity] = useState<string>('all')

  function toggleNeed(id: string) {
    setNeeds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Profiles for one need, city matches and featured first — same ordering the
  // guided modal uses for its results.
  function matchesFor(need: Need) {
    return profiles
      .filter(p => {
        if (p.network_tab !== need.tab) return false
        if (need.category && p.network_category !== need.category) return false
        return true
      })
      .sort((a, b) => {
        const cityMatch = (p: Profile) =>
          selectedCity === 'all' ? 0 :
          p.location?.toLowerCase().includes(selectedCity.toLowerCase()) ? -1 : 1
        const aScore = (a.is_featured ? -10 : 0) + cityMatch(a)
        const bScore = (b.is_featured ? -10 : 0) + cityMatch(b)
        return aScore - bScore
      })
  }

  const selectedNeeds = NEEDS.filter(n => needs.has(n.id))

  const tileStyle = (active: boolean) => ({
    background: active ? 'rgba(232,160,32,0.08)' : '#1A1A28',
    border: `1px solid ${active ? GOLD : 'rgba(255,255,255,0.055)'}`,
    borderRadius: 6,
    cursor: 'pointer' as const,
    transition: 'all .3s cubic-bezier(.22,.61,.36,1)',
  })

  const headingStyle: React.CSSProperties = {
    fontFamily: 'var(--font-spectral),Georgia,serif',
    fontWeight: 700,
    fontSize: 28,
    letterSpacing: '-0.8px',
    color: '#F4F4F5',
  }

  const lift = {
    onMouseEnter: (e: React.MouseEvent) => {
      const el = e.currentTarget as HTMLElement
      el.style.transform = 'translateY(-4px)'
      el.style.borderColor = 'rgba(232,160,32,0.15)'
    },
    onMouseLeave: (e: React.MouseEvent) => {
      const el = e.currentTarget as HTMLElement
      el.style.transform = 'none'
      el.style.borderColor = 'rgba(255,255,255,0.055)'
    },
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className="w-full max-w-md relative flex flex-col"
        style={{
          background: 'linear-gradient(180deg,#0c0c0e,#0A0A12)',
          borderRadius: 24,
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 60px 160px rgba(0,0,0,0.78)',
          maxHeight: '90vh',
          overflow: 'clip',
        }}
      >
        {/* atmosphere */}
        <div style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', background: GOLD, opacity: 0.1, filter: 'blur(70px)', top: -200, left: -120, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', width: 240, height: 240, borderRadius: '50%', background: '#16213E', opacity: 0.5, filter: 'blur(70px)', bottom: -130, right: 0, pointerEvents: 'none' }} />

        {/* Top bar */}
        <div style={{ position: 'relative', zIndex: 5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 4px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
            <span style={{ fontWeight: 100, letterSpacing: '0.2em', fontSize: 19, textTransform: 'uppercase', color: '#fff' }}>Night</span>
            <span style={{ fontWeight: 100, letterSpacing: '0.2em', fontSize: 19, textTransform: 'uppercase', color: GOLD }}>up</span>
          </div>
          <button
            onClick={onClose}
            style={{ width: 40, height: 40, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.055)', background: 'rgba(255,255,255,0.03)', color: '#A1A1AA', fontSize: 17, cursor: 'pointer' }}
            aria-label="Close"
          >✕</button>
        </div>

        {/* Scrollable content */}
        <div style={{ position: 'relative', zIndex: 5, overflowY: 'auto', padding: '0 24px 26px' }}>

          {/* Step indicator */}
          <div className="flex gap-2 mt-4 mb-6">
            {STEPS.map((s, i) => (
              <div key={s} className="h-1 flex-1 rounded-full" style={{
                backgroundColor: STEPS.indexOf(step) >= i ? GOLD : 'rgba(255,255,255,0.1)'
              }} />
            ))}
          </div>

          {/* STEP 1 — Event type */}
          {step === 'type' && (
            <>
              <h2 className="mb-1" style={headingStyle}>{t('party_step_type_title')}</h2>
              <p className="text-white/40 text-sm mb-5">{t('party_step_type_sub')}</p>
              <div className="grid grid-cols-2 gap-3">
                {EVENT_TYPES.map(({ id, labelKey, Icon }) => (
                  <button
                    key={id}
                    onClick={() => { setEventType(id); setStep('size') }}
                    className="flex flex-col items-center text-center gap-2 py-5 px-3"
                    style={tileStyle(eventType === id)}
                    {...lift}
                  >
                    <Icon size={22} />
                    <span className="text-white text-sm font-semibold">{t(labelKey)}</span>
                  </button>
                ))}
              </div>
              <button onClick={onClose} className="w-full mt-4 text-white/30 hover:text-white/50 text-xs transition text-center">
                {t('guided_browse')}
              </button>
            </>
          )}

          {/* STEP 2 — Guest count */}
          {step === 'size' && (
            <>
              <button onClick={() => setStep('type')} className="text-white/40 hover:text-white text-sm mb-4 flex items-center gap-1 transition">
                {t('guided_back')}
              </button>
              <h2 className="mb-1" style={headingStyle}>{t('party_step_size_title')}</h2>
              <p className="text-white/40 text-sm mb-5">{t('party_step_size_sub')}</p>
              <div className="grid grid-cols-2 gap-3">
                {SIZES.map(({ id, labelKey }) => (
                  <button
                    key={id}
                    onClick={() => { setSize(id); setStep('needs') }}
                    className="flex flex-col items-center text-center gap-2 py-5 px-3"
                    style={tileStyle(size === id)}
                    {...lift}
                  >
                    <GuestsIcon size={22} />
                    <span className="text-white text-sm font-semibold">{t(labelKey)}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* STEP 3 — Needs checklist */}
          {step === 'needs' && (
            <>
              <button onClick={() => setStep('size')} className="text-white/40 hover:text-white text-sm mb-4 flex items-center gap-1 transition">
                {t('guided_back')}
              </button>
              <h2 className="mb-1" style={headingStyle}>{t('party_step_needs_title')}</h2>
              <p className="text-white/40 text-sm mb-4">{t('party_step_needs_sub')}</p>
              <div className="space-y-2 mb-5">
                {NEEDS.map(({ id, labelKey, Icon }) => {
                  const checked = needs.has(id)
                  return (
                    <button
                      key={id}
                      onClick={() => toggleNeed(id)}
                      className="w-full flex items-center gap-3 px-3 py-3 text-left transition-all"
                      style={tileStyle(checked)}
                    >
                      <div
                        className="w-4 h-4 rounded flex items-center justify-center text-xs flex-shrink-0"
                        style={{ border: checked ? 'none' : '1.5px solid rgba(255,255,255,0.2)', backgroundColor: checked ? GOLD : 'transparent', color: '#0F0F1A' }}
                      >
                        {checked && '✓'}
                      </div>
                      <Icon size={22} className="flex-shrink-0" />
                      <span className="text-sm font-medium" style={{ color: checked ? 'white' : 'rgba(255,255,255,0.55)' }}>
                        {t(labelKey)}
                      </span>
                    </button>
                  )
                })}
              </div>
              <button
                onClick={() => setStep('city')}
                disabled={needs.size === 0}
                className="w-full"
                style={{
                  background: needs.size === 0 ? 'rgba(255,255,255,0.06)' : 'linear-gradient(100deg,#E8A020,#F5B335)',
                  color: needs.size === 0 ? 'rgba(255,255,255,0.35)' : '#1a1407',
                  borderRadius: 12,
                  padding: 15,
                  fontFamily: 'var(--font-spectral),Georgia,serif',
                  fontWeight: 700,
                  fontSize: 14.5,
                  cursor: needs.size === 0 ? 'default' : 'pointer',
                  border: 'none',
                  boxShadow: needs.size === 0 ? 'none' : '0 14px 34px rgba(232,160,32,0.3)',
                }}
              >
                {t('party_continue')} ({needs.size}) →
              </button>
            </>
          )}

          {/* STEP 4 — City */}
          {step === 'city' && (
            <>
              <button onClick={() => setStep('needs')} className="text-white/40 hover:text-white text-sm mb-4 flex items-center gap-1 transition">
                {t('guided_back')}
              </button>
              <h2 className="mb-1" style={headingStyle}>{t('party_step_city_title')}</h2>
              <p className="text-white/40 text-sm mb-4">{t('party_step_city_sub')}</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: t('guided_city_athens'), value: 'Athens' },
                  { label: t('guided_city_thess'), value: 'Thessaloniki' },
                  { label: t('guided_city_all'), value: 'all' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { setSelectedCity(opt.value); setStep('result') }}
                    className="flex flex-col items-center text-center gap-2 py-5 px-3 transition-all"
                    style={tileStyle(false)}
                    {...lift}
                  >
                    <span className="text-white text-sm font-semibold">{opt.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* STEP 5 — The package */}
          {step === 'result' && (
            <>
              <button onClick={() => setStep('city')} className="text-white/40 hover:text-white text-sm mb-4 flex items-center gap-1 transition">
                {t('guided_back')}
              </button>
              <h2 className="mb-1" style={headingStyle}>{t('party_step_result_title')}</h2>
              <p className="text-white/40 text-sm mb-5">{t('party_step_result_sub')}</p>

              {selectedNeeds.map(need => {
                const all = matchesFor(need)
                const shown = all.slice(0, 3)
                return (
                  <div key={need.id} style={{ marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
                      <need.Icon size={16} />
                      <span style={{ color: '#F4F4F5', fontSize: 13, fontWeight: 600 }}>{t(need.labelKey)}</span>
                      <span style={{ marginLeft: 'auto', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                        {all.length} {t('party_available')}
                      </span>
                    </div>

                    {shown.length === 0 ? (
                      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', padding: '4px 2px' }}>
                        {t('party_none_found')}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {shown.map(profile => (
                          <Link
                            key={profile.id}
                            href={`/profile/${profile.username}`}
                            onClick={onClose}
                            className="flex items-start gap-3 p-3 transition-all"
                            style={{
                              backgroundColor: profile.is_featured ? 'rgba(232,160,32,0.04)' : '#1A1A28',
                              border: `1px solid ${profile.is_featured ? GOLD : 'rgba(255,255,255,0.055)'}`,
                              borderRadius: 6,
                              display: 'flex',
                            }}
                          >
                            <div
                              className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                              style={{ backgroundColor: 'rgba(232,160,32,0.12)', color: GOLD, border: '1px solid rgba(232,160,32,0.15)' }}
                            >
                              {profile.display_name?.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <p className="text-white text-sm font-semibold truncate">{profile.display_name}</p>
                                {profile.is_verified && <span style={{ color: GOLD }} className="text-xs flex-shrink-0">✓</span>}
                                {profile.is_featured && (
                                  <span style={{ marginLeft: 'auto', fontSize: 8.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: GOLD, flexShrink: 0 }}>
                                    Sponsored
                                  </span>
                                )}
                              </div>
                              {profile.location && (
                                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>📍 {profile.location}</p>
                              )}
                              {profile.bio && (
                                <p className="text-xs mt-1 line-clamp-2" style={{ color: 'rgba(255,255,255,0.45)' }}>{profile.bio}</p>
                              )}
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}

              <p style={{ marginTop: 4, fontSize: 11.5, lineHeight: 1.6, color: 'rgba(255,255,255,0.35)', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 14 }}>
                {t('party_price_note')}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
