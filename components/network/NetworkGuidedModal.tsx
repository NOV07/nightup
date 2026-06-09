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
  const [step, setStep] = useState<'intent' | 'have' | 'missing' | 'results'>('intent')
  const [intent, setIntent] = useState<'event' | 'artist' | null>(null)
  const [have, setHave] = useState<Set<string>>(new Set())
  const [missing, setMissing] = useState<Item[]>([])
  const [activeItem, setActiveItem] = useState<Item | null>(null)

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
    setStep('results')
  }

  // Filter profiles for the selected item
  const filteredProfiles = activeItem
    ? profiles.filter(p => {
        if (!p.network_tab) return false
        if (p.network_tab !== activeItem.tab) return false
        if (activeItem.category && p.network_category !== activeItem.category) return false
        return true
      })
    : []

  const items = intent === 'event' ? EVENT_ITEMS : ARTIST_ITEMS
  const currentMissing = items.filter(item => !have.has(item.id))

  const tileStyle = (active: boolean) => ({
    backgroundColor: active ? 'rgba(232,160,32,0.08)' : SURFACE,
    border: `1px solid ${active ? GOLD : BORDER}`,
    borderRadius: 6,
    cursor: 'pointer' as const,
    transition: 'all 0.15s',
  })

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className="w-full max-w-md relative flex flex-col"
        style={{ backgroundColor: '#0F0F1A', border: '1px solid rgba(232,160,32,0.25)', borderRadius: 6, padding: '2rem', maxHeight: '90vh' }}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-white/40 hover:text-white transition text-xl">✕</button>

        {/* Step indicator */}
        <div className="flex gap-2 mb-6 flex-shrink-0">
          {['intent','have','missing','results'].map((s, i) => (
            <div key={s} className="h-1 flex-1 rounded-full" style={{
              backgroundColor: ['intent','have','missing','results'].indexOf(step) >= i ? GOLD : 'rgba(255,255,255,0.1)'
            }} />
          ))}
        </div>

        {/* STEP 1 — Intent */}
        {step === 'intent' && (
          <>
            <h2 className="text-xl font-bold text-white mb-1">Τι ετοιμάζεις;</h2>
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
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = GOLD; (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(232,160,32,0.06)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = BORDER; (e.currentTarget as HTMLElement).style.backgroundColor = SURFACE }}
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
            <button onClick={() => { setStep('intent'); setHave(new Set()) }} className="text-white/40 hover:text-white text-sm mb-4 flex items-center gap-1 transition flex-shrink-0">
              ← Πίσω
            </button>
            <h2 className="text-xl font-bold text-white mb-1 flex-shrink-0">Τι έχεις ήδη;</h2>
            <p className="text-white/40 text-sm mb-4 flex-shrink-0">Τσέκαρε αυτά που έχεις — θα βρούμε αυτό που λείπει.</p>
            <div className="space-y-2 mb-5 overflow-y-auto">
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
            <button onClick={handleNext} className="w-full font-bold py-3 transition-opacity flex-shrink-0" style={{ backgroundColor: GOLD, color: '#0F0F1A', borderRadius: 6 }}>
              {currentMissing.length === 0 ? 'Τα έχεις όλα! 🎉' : `Δες τι λείπει (${currentMissing.length}) →`}
            </button>
          </>
        )}

        {/* STEP 3 — Missing as tiles */}
        {step === 'missing' && (
          <>
            <button onClick={() => setStep('have')} className="text-white/40 hover:text-white text-sm mb-4 flex items-center gap-1 transition flex-shrink-0">
              ← Πίσω
            </button>
            <h2 className="text-xl font-bold text-white mb-1 flex-shrink-0">Αυτά σου λείπουν</h2>
            <p className="text-white/40 text-sm mb-4 flex-shrink-0">Πάτα ό,τι θέλεις να βρεις.</p>
            <div className="grid grid-cols-2 gap-3 overflow-y-auto">
              {missing.map(item => (
                <button
                  key={item.id}
                  onClick={() => selectMissingItem(item)}
                  className="flex flex-col items-center text-center gap-2 py-4 px-3 transition-all"
                  style={tileStyle(false)}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = GOLD; (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(232,160,32,0.06)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = BORDER; (e.currentTarget as HTMLElement).style.backgroundColor = SURFACE }}
                >
                  <span className="text-xl">{item.emoji}</span>
                  <span className="text-white text-xs font-semibold leading-snug">{item.label}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* STEP 4 — Results inside modal */}
        {step === 'results' && activeItem && (
          <>
            <button onClick={() => setStep('missing')} className="text-white/40 hover:text-white text-sm mb-4 flex items-center gap-1 transition flex-shrink-0">
              ← Πίσω
            </button>
            <div className="flex items-center gap-2 mb-1 flex-shrink-0">
              <span className="text-lg">{activeItem.emoji}</span>
              <h2 className="text-xl font-bold text-white">{activeItem.label}</h2>
            </div>
            <p className="text-white/40 text-sm mb-4 flex-shrink-0">
              {filteredProfiles.length} {filteredProfiles.length === 1 ? 'αποτέλεσμα' : 'αποτελέσματα'}
            </p>

            {filteredProfiles.length === 0 ? (
              <p className="text-white/30 text-sm text-center py-8">Δεν βρέθηκαν προφίλ ακόμα.</p>
            ) : (
              <div className="space-y-3 overflow-y-auto flex-1">
                {filteredProfiles.map(profile => (
                  <Link
                    key={profile.id}
                    href={`/profile/${profile.username}`}
                    onClick={onClose}
                    className="flex items-start gap-3 p-3 transition-all"
                    style={{ backgroundColor: SURFACE, border: `1px solid ${profile.is_featured ? GOLD : BORDER}`, borderRadius: 6, display: 'flex' }}
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
              className="block w-full text-center mt-4 text-xs font-semibold py-2 transition-opacity hover:opacity-80 flex-shrink-0"
              style={{ color: GOLD, border: `1px solid rgba(232,160,32,0.25)`, borderRadius: 6 }}
            >
              Δες όλους →
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
