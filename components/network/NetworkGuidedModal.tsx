'use client'
import { useState } from 'react'
import Link from 'next/link'

const GOLD = '#E8A020'
const SURFACE = '#1A1A2E'
const BORDER = 'rgba(232,160,32,0.15)'

const EVENT_ITEMS = [
  { id: 'artist',   emoji: '🎵', label: 'Artist',                   tab: 'Artists',       category: '' },
  { id: 'venue',    emoji: '🏛', label: 'Venue / Χώρος',            tab: 'Venues',        category: '' },
  { id: 'photo',    emoji: '📸', label: 'Φωτογράφος / Videographer', tab: 'Professionals', category: 'Φωτογράφος / Videographer' },
  { id: 'sound',    emoji: '🔊', label: 'Sound & Lighting',          tab: 'Professionals', category: 'Sound & Lighting' },
  { id: 'catering', emoji: '🍽', label: 'Catering',                  tab: 'Professionals', category: 'Catering' },
  { id: 'deco',     emoji: '🎨', label: 'Decoration',                tab: 'Professionals', category: 'Decoration' },
]

const ARTIST_ITEMS = [
  { id: 'studio',   emoji: '🎙', label: 'Studio / Rehearsal',        tab: 'Professionals', category: 'Studio / Rehearsal' },
  { id: 'producer', emoji: '🎛', label: 'Producer / Beatmaker',      tab: 'Professionals', category: 'Producer / Beatmaker' },
  { id: 'mix',      emoji: '🎚', label: 'Mix & Master Engineer',     tab: 'Professionals', category: 'Mix & Master Engineer' },
  { id: 'photo2',   emoji: '📸', label: 'Φωτογράφος / Videographer', tab: 'Professionals', category: 'Φωτογράφος / Videographer' },
  { id: 'video',    emoji: '🎬', label: 'Video Director',            tab: 'Professionals', category: 'Video Director' },
  { id: 'booking',  emoji: '📋', label: 'Booking Agent / Manager',   tab: 'Professionals', category: 'Booking Agent / Manager' },
]

interface Item { id: string; emoji: string; label: string; tab: string; category: string }

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

interface Props {
  onClose: () => void
  profiles: Profile[]
}

export default function NetworkGuidedModal({ onClose, profiles }: Props) {
  const [step, setStep] = useState<'intent' | 'have' | 'missing' | 'location' | 'results'>('intent')
  const [intent, setIntent] = useState<'event' | 'artist' | null>(null)
  const [have, setHave] = useState<Set<string>>(new Set())
  const [missing, setMissing] = useState<Item[]>([])
  const [activeItem, setActiveItem] = useState<Item | null>(null)
  const [selectedCity, setSelectedCity] = useState<string>('all')

  function selectIntent(i: 'event' | 'artist') {
    setIntent(i)
    setStep('have')
  }

  function toggleHave(id: string) {
    setHave(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleNext() {
    const items = intent === 'event' ? EVENT_ITEMS : ARTIST_ITEMS
    const m = items.filter(item => !have.has(item.id))
    if (m.length === 0) { onClose(); return }
    setMissing(m)
    setStep('missing')
  }

  function selectMissingItem(item: Item) {
    setActiveItem(item)
    setStep('location')
  }

  function selectCity(value: string) {
    setSelectedCity(value)
    setStep('results')
  }

  // Filter profiles for the selected item, then sort by city match + featured
  const filteredProfiles = activeItem
    ? profiles
        .filter(p => {
          if (!p.network_tab) return false
          if (p.network_tab !== activeItem.tab) return false
          if (activeItem.category && p.network_category !== activeItem.category) return false
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
    : []

  const items = intent === 'event' ? EVENT_ITEMS : ARTIST_ITEMS
  const currentMissing = items.filter(item => !have.has(item.id))

  const tileStyle = (active: boolean) => ({
    background: active ? 'rgba(232,160,32,0.08)' : '#1A1A28',
    border: `1px solid ${active ? GOLD : 'rgba(255,255,255,0.055)'}`,
    borderRadius: 6,
    cursor: 'pointer' as const,
    transition: 'all .3s cubic-bezier(.22,.61,.36,1)',
  })

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
            <span style={{ fontWeight: 100, letterSpacing: '0.2em', fontSize: 19, textTransform: 'uppercase' as const, color: '#fff' }}>Night</span>
            <span style={{ fontWeight: 100, letterSpacing: '0.2em', fontSize: 19, textTransform: 'uppercase' as const, color: GOLD }}>up</span>
          </div>
          <button
            onClick={onClose}
            style={{ width: 34, height: 34, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.055)', background: 'rgba(255,255,255,0.03)', color: '#A1A1AA', fontSize: 17, cursor: 'pointer' }}
            aria-label="Close"
          >✕</button>
        </div>

        {/* Scrollable content */}
        <div style={{ position: 'relative', zIndex: 5, overflowY: 'auto', padding: '0 24px 26px' }}>

          {/* Step indicator */}
          <div className="flex gap-2 mt-4 mb-6">
            {['intent', 'have', 'missing', 'location', 'results'].map((s, i) => (
              <div key={s} className="h-1 flex-1 rounded-full" style={{
                backgroundColor: ['intent', 'have', 'missing', 'location', 'results'].indexOf(step) >= i ? GOLD : 'rgba(255,255,255,0.1)'
              }} />
            ))}
          </div>

          {/* STEP 1 — Intent */}
          {step === 'intent' && (
            <>
              <h2 className="mb-1" style={{ fontFamily: 'var(--font-spectral),Georgia,serif', fontWeight: 700, fontSize: 28, letterSpacing: '-0.8px', color: '#F4F4F5' }}>Τι ετοιμάζεις;</h2>
              <p className="text-white/40 text-sm mb-5">Πες μας και βρίσκουμε αυτό που σου λείπει.</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'event' as const,  emoji: '🎪', label: 'Φτιάχνω event',      desc: 'Βρες artists, venue, επαγγελματίες' },
                  { id: 'artist' as const, emoji: '🎵', label: 'Είμαι καλλιτέχνης', desc: 'Βρες studio, producer, booking agent' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => selectIntent(opt.id)}
                    className="flex flex-col items-center text-center gap-2 py-5 px-3"
                    style={tileStyle(false)}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(232,160,32,0.15)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.055)' }}
                  >
                    <span className="text-2xl">{opt.emoji}</span>
                    <span className="text-white text-sm font-semibold">{opt.label}</span>
                    <span className="text-white/40 text-xs leading-relaxed">{opt.desc}</span>
                  </button>
                ))}
              </div>
              <button onClick={onClose} className="w-full mt-4 text-white/30 hover:text-white/50 text-xs transition text-center">
                Θέλω να κάνω browse μόνος μου →
              </button>
            </>
          )}

          {/* STEP 2 — What do you have */}
          {step === 'have' && (
            <>
              <button onClick={() => { setStep('intent'); setHave(new Set()) }} className="text-white/40 hover:text-white text-sm mb-4 flex items-center gap-1 transition">
                ← Πίσω
              </button>
              <h2 className="mb-1" style={{ fontFamily: 'var(--font-spectral),Georgia,serif', fontWeight: 700, fontSize: 28, letterSpacing: '-0.8px', color: '#F4F4F5' }}>Τι έχεις ήδη;</h2>
              <p className="text-white/40 text-sm mb-4">Τσέκαρε αυτά που έχεις — θα βρούμε αυτό που λείπει.</p>
              <div className="space-y-2 mb-5">
                {items.map(item => {
                  const checked = have.has(item.id)
                  return (
                    <button
                      key={item.id}
                      onClick={() => toggleHave(item.id)}
                      className="w-full flex items-center gap-3 px-3 py-3 text-left transition-all"
                      style={tileStyle(checked)}
                    >
                      <div className="w-4 h-4 rounded flex items-center justify-center text-xs flex-shrink-0" style={{ border: checked ? 'none' : '1.5px solid rgba(255,255,255,0.2)', backgroundColor: checked ? GOLD : 'transparent', color: '#0F0F1A' }}>
                        {checked && '✓'}
                      </div>
                      <span className="text-sm">{item.emoji}</span>
                      <span className="text-sm font-medium" style={{ color: checked ? 'rgba(255,255,255,0.35)' : 'white', textDecoration: checked ? 'line-through' : 'none' }}>
                        {item.label}
                      </span>
                    </button>
                  )
                })}
              </div>
              <button
                onClick={handleNext}
                className="w-full"
                style={{ background: 'linear-gradient(100deg,#E8A020,#F5B335)', color: '#1a1407', borderRadius: 12, padding: 15, fontFamily: 'var(--font-spectral),Georgia,serif', fontWeight: 700, fontSize: 14.5, cursor: 'pointer', border: 'none', boxShadow: '0 14px 34px rgba(232,160,32,0.3)' }}
              >
                {currentMissing.length === 0 ? 'Τα έχεις όλα! 🎉' : `Δες τι λείπει (${currentMissing.length}) →`}
              </button>
            </>
          )}

          {/* STEP 3 — Missing as tiles */}
          {step === 'missing' && (
            <>
              <button onClick={() => setStep('have')} className="text-white/40 hover:text-white text-sm mb-4 flex items-center gap-1 transition">
                ← Πίσω
              </button>
              <h2 className="mb-1" style={{ fontFamily: 'var(--font-spectral),Georgia,serif', fontWeight: 700, fontSize: 28, letterSpacing: '-0.8px', color: '#F4F4F5' }}>Αυτά σου λείπουν</h2>
              <p className="text-white/40 text-sm mb-4">Πάτα ό,τι θέλεις να βρεις.</p>
              <div className="grid grid-cols-2 gap-3">
                {missing.map(item => (
                  <button
                    key={item.id}
                    onClick={() => selectMissingItem(item)}
                    className="flex flex-col items-center text-center gap-2 py-4 px-3 transition-all"
                    style={tileStyle(false)}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(232,160,32,0.15)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.055)' }}
                  >
                    <span className="text-xl">{item.emoji}</span>
                    <span className="text-white text-xs font-semibold leading-snug">{item.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* STEP 4 — Location */}
          {step === 'location' && (
            <>
              <button onClick={() => setStep('missing')} className="text-white/40 hover:text-white text-sm mb-4 flex items-center gap-1 transition">
                ← Πίσω
              </button>
              <h2 className="mb-1" style={{ fontFamily: 'var(--font-spectral),Georgia,serif', fontWeight: 700, fontSize: 28, letterSpacing: '-0.8px', color: '#F4F4F5' }}>Πού ψάχνεις;</h2>
              <p className="text-white/40 text-sm mb-4">Θα δώσουμε προτεραιότητα σε προφίλ κοντά σου.</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Αθήνα', value: 'Athens' },
                  { label: 'Θεσσαλονίκη', value: 'Thessaloniki' },
                  { label: 'Όλη η Ελλάδα', value: 'all' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => selectCity(opt.value)}
                    className="flex flex-col items-center text-center gap-2 py-5 px-3 transition-all"
                    style={tileStyle(false)}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(232,160,32,0.15)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.055)' }}
                  >
                    <span className="text-white text-sm font-semibold">{opt.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* STEP 5 — Results inside modal */}
          {step === 'results' && activeItem && (
            <>
              <button onClick={() => { setStep('location'); setSelectedCity('all') }} className="text-white/40 hover:text-white text-sm mb-4 flex items-center gap-1 transition">
                ← Πίσω
              </button>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{activeItem.emoji}</span>
                <h2 style={{ fontFamily: 'var(--font-spectral),Georgia,serif', fontWeight: 700, fontSize: 28, letterSpacing: '-0.8px', color: '#F4F4F5' }}>{activeItem.label}</h2>
              </div>
              <p className="text-white/40 text-sm mb-4">
                {filteredProfiles.length} {filteredProfiles.length === 1 ? 'αποτέλεσμα' : 'αποτελέσματα'}
              </p>

              {filteredProfiles.length === 0 ? (
                <p className="text-white/30 text-sm text-center py-8">Δεν βρέθηκαν προφίλ ακόμα.</p>
              ) : (
                <div className="space-y-3 flex-1">
                  {filteredProfiles.map(profile => (
                    <Link
                      key={profile.id}
                      href={`/profile/${profile.username}`}
                      onClick={onClose}
                      className="flex items-start gap-3 p-3 transition-all"
                      style={{ backgroundColor: '#1A1A28', border: `1px solid ${profile.is_featured ? GOLD : 'rgba(255,255,255,0.055)'}`, borderRadius: 6, display: 'flex' }}
                    >
                      {/* Avatar */}
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ backgroundColor: 'rgba(232,160,32,0.12)', color: GOLD, border: `1px solid ${BORDER}` }}
                      >
                        {profile.display_name?.slice(0,2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <p className="text-white text-sm font-semibold truncate">{profile.display_name}</p>
                          {profile.is_verified && <span style={{ color: GOLD }} className="text-xs flex-shrink-0">✓</span>}
                        </div>
                        {profile.location && <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>📍 {profile.location}</p>}
                        {profile.bio && <p className="text-xs mt-1 line-clamp-2" style={{ color: 'rgba(255,255,255,0.45)' }}>{profile.bio}</p>}
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              <Link
                href={`/network?tab=${activeItem.tab.toLowerCase()}${activeItem.category ? `&category=${encodeURIComponent(activeItem.category)}` : ''}`}
                onClick={onClose}
                className="block w-full text-center mt-4 text-xs font-semibold py-2 transition-opacity hover:opacity-80"
                style={{ color: GOLD, border: `1px solid rgba(232,160,32,0.25)`, borderRadius: 6 }}
              >
                Δες όλους →
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
