'use client'
import { useState } from 'react'
import Link from 'next/link'
import { LuMic, LuDisc3, LuSlidersHorizontal, LuVideo, LuBriefcase } from 'react-icons/lu'
import type { IconType } from 'react-icons'
import { useLanguage } from '@/app/components/LanguageContext'
import type { TranslationKey } from '@/app/lib/translations'
import { NETWORK } from '@/app/lib/searchData'

// Blue accent, matching the "Για Artists" section — the party flow is the gold one.
const BLUE = '#60A5FA'
const BLUE_LIGHT = '#93C5FD'

type Step = 'needs' | 'city' | 'result'
const STEPS: Step[] = ['needs', 'city', 'result']

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

// The artist already knows what they want, so the flow opens straight on the
// checklist — nothing is preselected here, unlike the party builder.
interface Need {
  id: string
  labelKey: TranslationKey
  Icon: IconType
  category: keyof (typeof NETWORK)['Professionals']['For Artists']
}

const NEEDS: Need[] = [
  { id: 'studio',   labelKey: 'career_need_studio',   Icon: LuMic,               category: 'Studio / Rehearsal' },
  { id: 'producer', labelKey: 'career_need_producer', Icon: LuDisc3,             category: 'Producer / Beatmaker' },
  { id: 'mix',      labelKey: 'career_need_mix',      Icon: LuSlidersHorizontal, category: 'Mix & Master Engineer' },
  { id: 'video',    labelKey: 'career_need_video',    Icon: LuVideo,             category: 'Video Director' },
  { id: 'booking',  labelKey: 'career_need_booking',  Icon: LuBriefcase,         category: 'Booking Agent / Manager' },
]

interface Props {
  onClose: () => void
  profiles: Profile[]
}

export default function CareerBuilderModal({ onClose, profiles }: Props) {
  const { t } = useLanguage()
  const [step, setStep] = useState<Step>('needs')
  const [needs, setNeeds] = useState<Set<string>>(() => new Set())
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
  // party builder uses for its results.
  function matchesFor(need: Need) {
    return profiles
      .filter(p => p.network_tab === 'Professionals' && p.network_category === need.category)
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
    background: active ? 'rgba(96,165,250,0.08)' : '#1A1A28',
    border: `1px solid ${active ? BLUE : 'rgba(255,255,255,0.055)'}`,
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
      el.style.borderColor = 'rgba(96,165,250,0.25)'
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
        <div style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', background: BLUE, opacity: 0.1, filter: 'blur(70px)', top: -200, left: -120, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', width: 240, height: 240, borderRadius: '50%', background: '#16213E', opacity: 0.5, filter: 'blur(70px)', bottom: -130, right: 0, pointerEvents: 'none' }} />

        {/* Top bar */}
        <div style={{ position: 'relative', zIndex: 5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 4px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
            <span style={{ fontWeight: 100, letterSpacing: '0.2em', fontSize: 19, textTransform: 'uppercase', color: '#fff' }}>Night</span>
            <span style={{ fontWeight: 100, letterSpacing: '0.2em', fontSize: 19, textTransform: 'uppercase', color: BLUE }}>up</span>
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
                backgroundColor: STEPS.indexOf(step) >= i ? BLUE : 'rgba(255,255,255,0.1)'
              }} />
            ))}
          </div>

          {/* STEP 1 — Needs checklist */}
          {step === 'needs' && (
            <>
              <h2 className="mb-1" style={headingStyle}>{t('career_step_needs_title')}</h2>
              <p className="text-white/40 text-sm mb-4">{t('career_step_needs_sub')}</p>
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
                        style={{ border: checked ? 'none' : '1.5px solid rgba(255,255,255,0.2)', backgroundColor: checked ? BLUE : 'transparent', color: '#0F0F1A' }}
                      >
                        {checked && '✓'}
                      </div>
                      <Icon size={22} color={BLUE} strokeWidth={1.5} className="flex-shrink-0" />
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
                  background: needs.size === 0 ? 'rgba(255,255,255,0.06)' : `linear-gradient(100deg,${BLUE},${BLUE_LIGHT})`,
                  color: needs.size === 0 ? 'rgba(255,255,255,0.35)' : '#07121f',
                  borderRadius: 12,
                  padding: 15,
                  fontFamily: 'var(--font-spectral),Georgia,serif',
                  fontWeight: 700,
                  fontSize: 14.5,
                  cursor: needs.size === 0 ? 'default' : 'pointer',
                  border: 'none',
                  boxShadow: needs.size === 0 ? 'none' : '0 14px 34px rgba(96,165,250,0.3)',
                }}
              >
                {t('party_continue')} ({needs.size}) →
              </button>
              <button onClick={onClose} className="w-full mt-4 text-white/30 hover:text-white/50 text-xs transition text-center">
                {t('guided_browse')}
              </button>
            </>
          )}

          {/* STEP 2 — City */}
          {step === 'city' && (
            <>
              <button onClick={() => setStep('needs')} className="text-white/40 hover:text-white text-sm mb-4 flex items-center gap-1 transition">
                {t('guided_back')}
              </button>
              <h2 className="mb-1" style={headingStyle}>{t('career_step_city_title')}</h2>
              <p className="text-white/40 text-sm mb-4">{t('career_step_city_sub')}</p>
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

          {/* STEP 3 — Results, one section per need */}
          {step === 'result' && (
            <>
              <button onClick={() => setStep('city')} className="text-white/40 hover:text-white text-sm mb-4 flex items-center gap-1 transition">
                {t('guided_back')}
              </button>
              <h2 className="mb-1" style={headingStyle}>{t('career_step_result_title')}</h2>
              <p className="text-white/40 text-sm mb-5">{t('career_step_result_sub')}</p>

              {selectedNeeds.map(need => {
                const all = matchesFor(need)
                const shown = all.slice(0, 3)
                return (
                  <div key={need.id} style={{ marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
                      <need.Icon size={16} color={BLUE} strokeWidth={1.5} />
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
                              backgroundColor: profile.is_featured ? 'rgba(96,165,250,0.04)' : '#1A1A28',
                              border: `1px solid ${profile.is_featured ? BLUE : 'rgba(255,255,255,0.055)'}`,
                              borderRadius: 6,
                              display: 'flex',
                            }}
                          >
                            <div
                              className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                              style={{ backgroundColor: 'rgba(96,165,250,0.12)', color: BLUE, border: '1px solid rgba(96,165,250,0.2)' }}
                            >
                              {profile.display_name?.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <p className="text-white text-sm font-semibold truncate">{profile.display_name}</p>
                                {profile.is_verified && <span style={{ color: BLUE }} className="text-xs flex-shrink-0">✓</span>}
                                {profile.is_featured && (
                                  <span style={{ marginLeft: 'auto', fontSize: 8.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: BLUE, flexShrink: 0 }}>
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

              <p style={{ marginTop: 4, fontSize: 11.5, lineHeight: 1.6, color: 'rgba(255,255,255,0.35)', borderLeft: `2px solid ${BLUE}`, paddingLeft: 12 }}>
                {t('career_price_note')}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
