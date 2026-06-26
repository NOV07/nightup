'use client'
import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { NETWORK, CITIES, CITY_LABELS } from '../lib/searchData'
import FollowButton from '@/components/ui/FollowButton'
import ListingsBar, { type Listing } from '@/components/network/ListingsBar'

type NetworkTab = 'Artists' | 'Venues' | 'Professionals'

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
  is_featured: boolean | null
  is_verified: boolean | null
}

const GOLD = '#E8A020'
const SURFACE = '#111120'
const BORDER = 'rgba(232,160,32,0.12)'

const TAB_META: Record<NetworkTab, { emoji: string; label: string }> = {
  Artists:       { emoji: '🎵', label: 'Artists' },
  Venues:        { emoji: '🏛', label: 'Venues' },
  Professionals: { emoji: '🤝', label: 'Professionals' },
}

function ProfileCard({ profile }: { profile: Profile }) {
  const initials = profile.display_name?.slice(0, 2).toUpperCase() || '?'
  return (
    <Link
      href={`/profile/${profile.username}`}
      className="flex flex-col gap-3 p-4 transition-all hover:opacity-90"
      style={{
        backgroundColor: SURFACE,
        border: `1px solid ${profile.is_featured ? GOLD : BORDER}`,
        borderRadius: 6,
      }}
    >
      <div className="flex items-center gap-3">
        {profile.avatar_url ? (
          <Image
            src={profile.avatar_url}
            alt={profile.display_name}
            width={48}
            height={48}
            className="rounded-full object-cover flex-shrink-0"
            style={{ border: `1px solid ${BORDER}` }}
          />
        ) : (
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
            style={{ backgroundColor: 'rgba(232,160,32,0.12)', color: GOLD }}
          >
            {initials}
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-semibold text-white text-sm truncate">{profile.display_name}</p>
            {profile.is_verified && <span style={{ color: GOLD }} className="text-xs">✓</span>}
            {profile.is_featured && <span style={{ color: GOLD }} className="text-xs">★</span>}
          </div>
          {profile.network_subcategory && (
            <p className="text-xs mt-0.5" style={{ color: GOLD }}>{profile.network_subcategory}</p>
          )}
          <div className="mt-2">
            <FollowButton profileId={profile.id} />
          </div>
        </div>
      </div>
      {profile.location && (
        <p className="text-xs text-white/40">📍 {profile.location}</p>
      )}
      {profile.bio && (
        <p className="text-xs text-white/50 line-clamp-2">{profile.bio}</p>
      )}
      <p className="text-xs font-medium mt-auto" style={{ color: GOLD }}>Δες προφίλ →</p>
    </Link>
  )
}

export default function NetworkClient({ profiles, listings = [] }: { profiles: Profile[]; allProfiles?: Profile[]; listings?: Listing[] }) {
  const router = useRouter()
  const params = useSearchParams()

  const slugToTab: Record<string, NetworkTab> = {
    artists: 'Artists',
    venues: 'Venues',
    professionals: 'Professionals',
  }
  const activeTab: NetworkTab = slugToTab[params.get('tab') ?? 'artists'] ?? 'Artists'
  const activeCategory = params.get('category') || ''
  const activeCity = params.get('city') || ''

  function push(overrides: Record<string, string>) {
    const p = new URLSearchParams()
    const next = { tab: activeTab, category: activeCategory, city: activeCity, ...overrides }
    if (next.tab) p.set('tab', next.tab.toLowerCase())
    if (next.category) p.set('category', next.category)
    if (next.city) p.set('city', next.city)
    router.push(`/network?${p.toString()}`)
  }

  const tabData = NETWORK[activeTab] as Record<string, unknown>

  // For Professionals, flatten "For Events" and "For Artists" sub-groups into one list
  const subcategories = activeTab === 'Professionals'
    ? Object.values(tabData).flatMap(group => Object.keys(group as Record<string, unknown>))
    : tabData ? Object.keys(tabData) : []

  const hasSubcategories = subcategories.length > 0

  const pillStyle = (active: boolean) => ({
    padding: '7px 14px',
    borderRadius: 6,
    fontSize: 12.5,
    fontWeight: 600,
    whiteSpace: 'nowrap' as const,
    cursor: 'pointer',
    transition: 'all .2s',
    backgroundColor: active ? 'rgba(232,160,32,0.12)' : '#1A1A28',
    color: active ? '#F5B335' : '#A1A1AA',
    border: active ? '1px solid rgba(232,160,32,0.15)' : '1px solid rgba(255,255,255,0.06)',
  })

  useEffect(() => {
    const segments: [string, boolean][] = [
      ['The people behind the ', false],
      ['night.', true],
    ]
    const fullText = segments.map(s => s[0]).join('')
    const goldStart = segments[0][0].length
    const typed = document.getElementById('hero-typed')
    const cursor = document.getElementById('hero-cursor')
    const eyebrow = document.getElementById('hero-eyebrow')
    if (!typed || !cursor || !eyebrow) return
    let i = 0
    const interval = setInterval(() => {
      if (i >= fullText.length) {
        clearInterval(interval)
        setTimeout(() => { eyebrow.style.animation = 'cn-eyebrow 0.8s ease-out forwards' }, 200)
        setTimeout(() => { if (cursor) cursor.style.display = 'none' }, 1700)
        return
      }
      typed.innerHTML = ''
      const before = fullText.slice(0, Math.min(i + 1, goldStart))
      const after = i >= goldStart ? fullText.slice(goldStart, i + 1) : ''
      before.split('\n').forEach((line, idx) => {
        if (idx > 0) typed.appendChild(document.createElement('br'))
        typed.appendChild(document.createTextNode(line))
      })
      if (after) {
        const span = document.createElement('span')
        span.style.cssText = 'color:#E8A020;font-style:italic'
        span.textContent = after
        typed.appendChild(span)
      }
      i++
    }, 38)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0F0F1A' }}>

      {/* ── Cinematic Hero ──────────────────────────────── */}
      <div style={{ position: 'relative', background: '#080808', overflow: 'hidden', minHeight: '280px', display: 'flex', alignItems: 'flex-end', padding: '32px 0 48px' }}>
        <style>{`
          @keyframes cn-flash { 0%{opacity:1} 100%{opacity:0} }
          @keyframes cn-float { from{transform:translateY(0) translateX(0);opacity:var(--op)} to{transform:translateY(-40px) translateX(var(--dx));opacity:calc(var(--op)*0.2)} }
          @keyframes cn-trail { 0%{transform:translateY(0);opacity:0} 10%{opacity:1} 90%{opacity:0.5} 100%{transform:translateY(-100px);opacity:0} }
          @keyframes cn-flare { 0%,100%{opacity:0.03;transform:scale(1)} 50%{opacity:0.08;transform:scale(1.12)} }
          @keyframes cn-blink { 0%,100%{opacity:1} 50%{opacity:0} }
          @keyframes cn-eyebrow { from{opacity:0;letter-spacing:0.6em} to{opacity:1;letter-spacing:0.35em} }
          @keyframes cn-particles-in { from{opacity:0} to{opacity:1} }
        `}</style>

        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'radial-gradient(ellipse 60% 80% at 20% 60%, rgba(232,160,32,0.35), transparent 60%)', animation: 'cn-flash 0.15s ease-out forwards', pointerEvents: 'none', zIndex: 20 }} />

        {([[20,20,200],[45,50,280],[70,15,160],[85,60,220]] as [number,number,number][]).map(([l,t,s],i) => (
          <div key={`f${i}`} style={{ position: 'absolute', width: s, height: s, left: `${l}%`, top: `${t}%`, transform: 'translate(-50%,-50%)', borderRadius: '50%', background: 'radial-gradient(circle, rgba(232,160,32,0.06) 0%, transparent 70%)', animation: `cn-flare ${6+i*2}s ease-in-out infinite`, animationDelay: `${i*1.5}s`, pointerEvents: 'none', zIndex: 1 }} />
        ))}

        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, animation: 'cn-particles-in 2s ease-out forwards', animationDelay: '0.15s', opacity: 0, pointerEvents: 'none', zIndex: 1 }}>
          {[...Array(50)].map((_, i) => {
            const size = i%5===0 ? 2.5 : i%3===0 ? 1.5 : 1
            const op = 0.15+(i%6)*0.08
            const dx = ((i*7)%60)-30
            const dur = 8+(i%5)*3
            const blur = i%4===0
            return (
              <div key={`p${i}`} style={{ position: 'absolute', width: size, height: size, borderRadius: '50%', background: i%7===0 ? '#E8A020' : '#ffffff', opacity: op, left: `${(i*13+7)%96}%`, top: `${(i*19+5)%90}%`, filter: blur ? 'blur(1px)' : 'none', ['--op' as any]: op, ['--dx' as any]: `${dx}px`, animation: `cn-float ${dur}s ease-in-out infinite alternate`, animationDelay: `${(i*0.3)%4}s` }} />
            )
          })}
          {[...Array(14)].map((_,i) => (
            <div key={`t${i}`} style={{ position: 'absolute', width: '1px', height: `${10+(i%4)*8}px`, left: `${(i*17+3)%95}%`, top: `${60+(i%4)*8}%`, background: `linear-gradient(to top, transparent, rgba(255,255,255,${0.1+(i%3)*0.08}), transparent)`, animation: `cn-trail ${4+(i%4)*1.5}s ease-in infinite`, animationDelay: `${(i*0.6)%5}s` }} />
          ))}
        </div>

        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '100px', background: 'linear-gradient(transparent, #0F0F1A)', pointerEvents: 'none', zIndex: 5 }} />
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '160px', background: 'linear-gradient(to right, #0F0F1A, transparent)', pointerEvents: 'none', zIndex: 5 }} />

        <div style={{ position: 'relative', zIndex: 10, maxWidth: '72rem', margin: '0 auto', padding: '0 24px', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div id="hero-eyebrow" style={{ fontSize: '9px', letterSpacing: '0.35em', textTransform: 'uppercase', color: '#E8A020', marginBottom: '10px', opacity: 0, fontFamily: 'var(--font-sans)' }}>Network</div>
              <h1 style={{ fontFamily: 'var(--font-spectral)', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 300, color: '#fff', lineHeight: 1.15, margin: 0, minHeight: '4rem' }}>
                <span id="hero-typed"></span>
                <span id="hero-cursor" style={{ display: 'inline-block', width: '2px', height: '0.85em', background: '#E8A020', verticalAlign: 'middle', marginLeft: '3px', animation: 'cn-blink 0.7s step-end infinite' }} />
              </h1>
            </div>
            <Link href="/network/listings" style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5 }}>
              Αγγελίες →
            </Link>
          </div>
          <p style={{ marginTop: '12px', color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>
            Artists, venues και professionals — όλοι εδώ.
          </p>
        </div>
      </div>

      {/* Listings Bar */}
      {listings.length > 0 && (
        <div className="max-w-6xl mx-auto px-4 pb-6">
          <ListingsBar listings={listings} />
        </div>
      )}

      {/* Sticky filter bar */}
      <div
        className="sticky z-10 border-b"
        style={{ top: 56, backgroundColor: 'rgba(15,15,26,0.95)', backdropFilter: 'blur(8px)', borderColor: BORDER }}
      >
        <div className="max-w-6xl mx-auto px-4 py-3 space-y-3">

          {/* Row 1: tabs + city */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none min-w-0 flex-1">
              {(Object.keys(TAB_META) as NetworkTab[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => push({ tab, category: '', city: activeCity })}
                  style={pillStyle(activeTab === tab)}
                >
                  {TAB_META[tab].emoji} {TAB_META[tab].label}
                </button>
              ))}
            </div>
            <select
              value={activeCity}
              onChange={e => push({ city: e.target.value })}
              className="outline-none flex-shrink-0"
              style={{
                backgroundColor: '#1A1A28',
                color: activeCity ? 'white' : 'rgba(255,255,255,0.4)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 6,
                fontSize: '0.8rem',
                padding: '0.4rem 0.75rem',
              }}
            >
              <option value="">Όλες οι πόλεις</option>
              {CITIES.slice(1).map(c => <option key={c} value={c}>{CITY_LABELS[c] ?? c}</option>)}
            </select>
          </div>

          {/* Row 2: subcategories */}
          {hasSubcategories && (
            <div className="relative">
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                <button
                  onClick={() => push({ category: '' })}
                  style={pillStyle(!activeCategory)}
                >
                  Όλοι
                </button>
                {subcategories.map(sub => (
                  <button
                    key={sub}
                    onClick={() => push({ category: sub })}
                    style={pillStyle(activeCategory === sub)}
                    className="whitespace-nowrap"
                  >
                    {sub}
                  </button>
                ))}
              </div>
              {/* Fade-out gradient indicating more content to scroll */}
              <div
                className="sm:hidden"
                style={{
                  position: 'absolute', top: 0, right: 0,
                  width: 32, height: 'calc(100% - 4px)',
                  background: 'linear-gradient(to right, transparent, rgba(15,15,26,0.95))',
                  pointerEvents: 'none',
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="max-w-6xl mx-auto px-4 py-6">

        {/* Count */}
        <div className="mb-5">
          <p className="text-xs text-white/30">
            {profiles.length} {profiles.length === 1 ? 'αποτέλεσμα' : 'αποτελέσματα'}
            {activeCategory && <span> · {activeCategory}</span>}
            {activeCity && <span> · {activeCity}</span>}
          </p>
        </div>

        {profiles.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {profiles.map(p => <ProfileCard key={p.id} profile={p} />)}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-white/30 text-sm mb-2">Δεν βρέθηκαν αποτελέσματα</p>
            {(activeCategory || activeCity) && (
              <button
                onClick={() => push({ category: '', city: '' })}
                className="text-xs hover:underline mt-2"
                style={{ color: GOLD }}
              >
                Καθαρισμός φίλτρων
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
