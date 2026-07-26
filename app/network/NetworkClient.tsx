'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { type Listing } from '@/components/network/ListingsBar'
import InterestButton from '@/components/ui/InterestButton'
import NetworkGuidedModal from '@/components/network/NetworkGuidedModal'
import { TAB_META, type NetworkTab } from '@/components/network/CategoryPageLayout'
import type { Profile } from '@/app/lib/networkProfile'
import { useNetworkProfiles } from '../components/NetworkProfilesContext'
import { useLanguage } from '../components/LanguageContext'
import { getAvatarCrop } from '../lib/profileCrop'
import CroppedImage from '../../components/ui/CroppedImage'

type GateKey = NetworkTab | 'Listings'

interface GatesPreview {
  Artists: { profiles: Profile[]; count: number }
  Venues: { profiles: Profile[]; count: number }
  Professionals: { profiles: Profile[]; count: number }
  Listings: { items: Listing[]; count: number }
}

const GOLD = '#E8A020'
const SURFACE = '#111120'
const BORDER = 'rgba(232,160,32,0.12)'

// Same pill the listings cards already use for their "Sponsored" flag, reused
// here for the featured/sponsored marker on the panel cards.
const BADGE_STYLE: React.CSSProperties = {
  position: 'absolute',
  top: 8,
  right: 8,
  fontSize: 9,
  fontWeight: 700,
  color: GOLD,
  backgroundColor: 'rgba(232,160,32,0.12)',
  border: '1px solid rgba(232,160,32,0.25)',
  borderRadius: 4,
  padding: '2px 6px',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
}

const GATE_CONFIG: { key: GateKey; slug: string; icon: string }[] = [
  { key: 'Artists',       slug: 'artists',       icon: '🎵' },
  { key: 'Venues',        slug: 'venues',        icon: '🏛' },
  { key: 'Professionals', slug: 'professionals', icon: '🤝' },
  { key: 'Listings',      slug: 'listings',      icon: '📋' },
]

// ── Compact profile card (used in the sponsored-first panel) ───────────
function CompactProfileCard({ profile }: { profile: Profile }) {
  const initials = profile.display_name?.slice(0, 2).toUpperCase() || '?'
  return (
    <Link
      href={`/profile/${profile.username}`}
      className="flex items-center gap-3 transition-all hover:opacity-90"
      style={{
        position: 'relative',
        // Uniform top padding on every card keeps the avatars aligned across
        // the grid and leaves room for the badge, which matters on the narrow
        // two-column mobile layout.
        padding: '24px 12px 12px',
        backgroundColor: '#1A1A28',
        border: `1px solid ${profile.is_featured ? GOLD : 'rgba(255,255,255,0.06)'}`,
        borderRadius: 6,
      }}
    >
      {profile.is_featured && <span style={BADGE_STYLE}>Featured</span>}
      {profile.avatar_url ? (
        <div className="relative rounded-full flex-shrink-0" style={{ width: 40, height: 40, overflow: 'hidden', border: `1px solid ${BORDER}` }}>
          <CroppedImage
            src={profile.avatar_url}
            alt={profile.display_name}
            crop={getAvatarCrop(profile)}
            sizes="40px"
          />
        </div>
      ) : (
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
          style={{ backgroundColor: 'rgba(232,160,32,0.12)', color: GOLD }}
        >
          {initials}
        </div>
      )}
      <div className="min-w-0">
        <div className="flex items-center gap-1">
          <p className="font-semibold text-white text-sm truncate">{profile.display_name}</p>
          {profile.is_verified && <span style={{ color: GOLD }} className="text-xs flex-shrink-0">✓</span>}
        </div>
        {profile.network_subcategory && (
          <p className="text-xs mt-0.5 truncate" style={{ color: GOLD }}>{profile.network_subcategory}</p>
        )}
        {profile.location && (
          <p className="text-[11px] mt-0.5 text-white/40 truncate">📍 {profile.location}</p>
        )}
      </div>
    </Link>
  )
}

// ── Compact listing card (panel counterpart of the ListingsBar card) ───
function CompactListingCard({ listing }: { listing: Listing }) {
  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: '26px 14px 14px',
        backgroundColor: listing.is_sponsored ? 'rgba(232,160,32,0.04)' : '#1A1A28',
        border: `1px solid ${listing.is_sponsored ? GOLD : 'rgba(255,255,255,0.06)'}`,
        borderRadius: 6,
      }}
    >
      {listing.is_sponsored && <span style={BADGE_STYLE}>Sponsored</span>}
      <span style={{ color: GOLD, fontSize: 9.5, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
        {listing.role}
      </span>
      <p
        className="line-clamp-2"
        style={{ fontFamily: 'var(--font-spectral),Georgia,serif', fontSize: 15, fontWeight: 500, color: '#F4F4F5', lineHeight: 1.3 }}
      >
        {listing.title}
      </p>
      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
        {[
          listing.city,
          listing.date_needed
            ? new Date(listing.date_needed).toLocaleDateString('el-GR', { day: 'numeric', month: 'short' })
            : null,
        ].filter(Boolean).join(' · ')}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginTop: 'auto' }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.40)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
          {listing.profiles.display_name}
        </span>
        <InterestButton listingId={listing.id} initialCount={0} />
      </div>
    </div>
  )
}

interface Props {
  gatesPreview: GatesPreview
}

export default function NetworkClient({ gatesPreview }: Props) {
  const { t } = useLanguage()
  const networkProfiles = useNetworkProfiles()

  const [showGuided, setShowGuided] = useState(false)
  // Exactly one category is always active; the first one is active on mount.
  const [activeGate, setActiveGate] = useState<GateKey>(GATE_CONFIG[0].key)

  // Hero typewriter — same pattern as the Spots hero. The eyebrow fades in
  // first (CSS), then the title types out, then subtitle + guided link fade in.
  useEffect(() => {
    const segments: [string, boolean][] = [
      ['The people behind the ', false],
      ['night.', true],
    ]
    const fullText = segments.map(s => s[0]).join('')
    const goldStart = segments[0][0].length
    const typed = document.getElementById('hero-typed')
    const cursor = document.getElementById('hero-cursor')
    const tail = document.getElementById('hero-tail')
    if (!typed || !cursor || !tail) return
    let i = 0
    let interval: ReturnType<typeof setInterval> | undefined
    const timeouts: ReturnType<typeof setTimeout>[] = []
    const start = setTimeout(() => {
      interval = setInterval(() => {
        if (i >= fullText.length) {
          clearInterval(interval)
          timeouts.push(setTimeout(() => {
            tail.style.animation = 'cn-fade-in 0.8s ease-out forwards'
            tail.style.pointerEvents = 'auto'
          }, 200))
          timeouts.push(setTimeout(() => { cursor.style.display = 'none' }, 1700))
          return
        }
        typed.innerHTML = ''
        const before = fullText.slice(0, Math.min(i + 1, goldStart))
        const after = i >= goldStart ? fullText.slice(goldStart, i + 1) : ''
        typed.appendChild(document.createTextNode(before))
        if (after) {
          const span = document.createElement('span')
          span.style.cssText = 'color:#E8A020;font-style:italic'
          span.textContent = after
          typed.appendChild(span)
        }
        i++
      }, 38)
    }, 700)
    return () => {
      clearTimeout(start)
      clearInterval(interval)
      timeouts.forEach(clearTimeout)
    }
  }, [])

  const gateDesc: Record<GateKey, string> = {
    Artists:       t('network_gate_artists_desc'),
    Venues:        t('network_gate_venues_desc'),
    Professionals: t('network_gate_pros_desc'),
    Listings:      t('network_gate_listings_desc'),
  }
  const gateTitle = (key: GateKey) =>
    key === 'Listings' ? t('network_gate_listings_title') : TAB_META[key].label
  const gateCount = (key: GateKey) => gatesPreview[key].count
  const gateHref = (key: GateKey) =>
    `/network/${GATE_CONFIG.find(g => g.key === key)!.slug}`

  // ── Sponsored-first panel for the active category ───────────────────
  // The data arrives from page.tsx already ordered is_featured / is_sponsored
  // desc, then created_at desc, capped at 4 — no client-side sorting needed.
  function renderPanel() {
    const isListings = activeGate === 'Listings'
    const empty = isListings
      ? gatesPreview.Listings.items.length === 0
      : gatesPreview[activeGate].profiles.length === 0

    return (
      <div
        className="flex flex-col p-4 lg:p-[18px] lg:min-h-[340px]"
        style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8 }}
      >
        {/* Header — title + sponsored label, see-all link bottom right */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 style={{ color: '#fff', fontWeight: 600, fontSize: 16 }}>{gateTitle(activeGate)}</h2>
              <span style={{ fontSize: 11, fontWeight: 600, color: GOLD, background: 'rgba(232,160,32,0.12)', borderRadius: 4, padding: '2px 7px' }}>
                {gateCount(activeGate)}
              </span>
            </div>
            <p style={{ marginTop: 5, fontSize: 9, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)' }}>
              Sponsored
            </p>
          </div>
          <Link
            href={gateHref(activeGate)}
            className="text-xs font-semibold transition-opacity hover:opacity-80"
            style={{ color: GOLD, flexShrink: 0 }}
          >
            {isListings
              ? t('network_see_all_listings')
              : `${t('network_see_all_profiles')} ${gateCount(activeGate)} →`}
          </Link>
        </div>

        {empty ? (
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, padding: '12px 4px' }}>{t('network_gate_empty')}</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {isListings
              ? gatesPreview.Listings.items.map(l => <CompactListingCard key={l.id} listing={l} />)
              : gatesPreview[activeGate].profiles.map(p => <CompactProfileCard key={p.id} profile={p} />)}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0F0F1A' }}>

      {/* ── Cinematic Hero ───────────────────────────────────── */}
      <div style={{ position: 'relative', background: '#080808', overflow: 'hidden', minHeight: '280px', display: 'flex', alignItems: 'flex-end', padding: '32px 0 48px' }}>
        <style>{`
          @keyframes cn-flash { 0%{opacity:1} 100%{opacity:0} }
          @keyframes cn-float { from{transform:translateY(0) translateX(0);opacity:var(--op)} to{transform:translateY(-40px) translateX(var(--dx));opacity:calc(var(--op)*0.2)} }
          @keyframes cn-trail { 0%{transform:translateY(0);opacity:0} 10%{opacity:1} 90%{opacity:0.5} 100%{transform:translateY(-100px);opacity:0} }
          @keyframes cn-flare { 0%,100%{opacity:0.03;transform:scale(1)} 50%{opacity:0.08;transform:scale(1.12)} }
          @keyframes cn-eyebrow { from{opacity:0;letter-spacing:0.6em} to{opacity:1;letter-spacing:0.35em} }
          @keyframes cn-particles-in { from{opacity:0} to{opacity:1} }
          @keyframes cn-blink { 0%,100%{opacity:1} 50%{opacity:0} }
          @keyframes cn-fade-in { from{opacity:0} to{opacity:1} }
        `}</style>

        {/* Camera-flash burst on mount */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'radial-gradient(ellipse 60% 80% at 20% 60%, rgba(232,160,32,0.35), transparent 60%)', animation: 'cn-flash 0.15s ease-out forwards', pointerEvents: 'none', zIndex: 20 }} />

        {/* Slow gold flares */}
        {([[20,20,200],[45,50,280],[70,15,160],[85,60,220]] as [number,number,number][]).map(([l,tp,s],i) => (
          <div key={`f${i}`} style={{ position: 'absolute', width: s, height: s, left: `${l}%`, top: `${tp}%`, transform: 'translate(-50%,-50%)', borderRadius: '50%', background: 'radial-gradient(circle, rgba(232,160,32,0.06) 0%, transparent 70%)', animation: `cn-flare ${6+i*2}s ease-in-out infinite`, animationDelay: `${i*1.5}s`, pointerEvents: 'none', zIndex: 1 }} />
        ))}

        {/* Particles + light trails */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, animation: 'cn-particles-in 2s ease-out forwards', animationDelay: '0.15s', opacity: 0, pointerEvents: 'none', zIndex: 1 }}>
          {[...Array(50)].map((_, i) => {
            const size = i%5===0 ? 2.5 : i%3===0 ? 1.5 : 1
            const op = 0.15+(i%6)*0.08
            const dx = ((i*7)%60)-30
            const dur = 8+(i%5)*3
            const blur = i%4===0
            return (
              <div key={`p${i}`} style={{ position: 'absolute', width: size, height: size, borderRadius: '50%', background: i%7===0 ? GOLD : '#ffffff', opacity: op, left: `${(i*13+7)%96}%`, top: `${(i*19+5)%90}%`, filter: blur ? 'blur(1px)' : 'none', ['--op' as string]: op, ['--dx' as string]: `${dx}px`, animation: `cn-float ${dur}s ease-in-out infinite alternate`, animationDelay: `${(i*0.3)%4}s` } as React.CSSProperties} />
            )
          })}
          {[...Array(14)].map((_, i) => (
            <div key={`t${i}`} style={{ position: 'absolute', width: '1px', height: `${10+(i%4)*8}px`, left: `${(i*17+3)%95}%`, top: `${60+(i%4)*8}%`, background: `linear-gradient(to top, transparent, rgba(255,255,255,${0.1+(i%3)*0.08}), transparent)`, animation: `cn-trail ${4+(i%4)*1.5}s ease-in infinite`, animationDelay: `${(i*0.6)%5}s` }} />
          ))}
        </div>

        {/* Fades into the page background */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '100px', background: 'linear-gradient(transparent, #0F0F1A)', pointerEvents: 'none', zIndex: 5 }} />
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '160px', background: 'linear-gradient(to right, #0F0F1A, transparent)', pointerEvents: 'none', zIndex: 5 }} />

        <div style={{ position: 'relative', zIndex: 10, maxWidth: '72rem', margin: '0 auto', padding: '0 24px', width: '100%' }}>
          {/* Eyebrow: LIVE NETWORK with pulsing dot */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, fontSize: 9, letterSpacing: '0.35em', textTransform: 'uppercase', color: GOLD, fontFamily: 'var(--font-sans)', opacity: 0, animation: 'cn-eyebrow 0.8s ease-out forwards', animationDelay: '0.2s' }}>
            <span className="animate-live-pulse" style={{ width: 7, height: 7, borderRadius: '50%', background: GOLD, display: 'inline-block', flexShrink: 0 }} />
            <span>{t('network_live_eyebrow')}</span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-spectral)', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 300, color: '#fff', lineHeight: 1.15, margin: 0, minHeight: '4rem' }}>
            <span id="hero-typed"></span>
            <span id="hero-cursor" style={{ display: 'inline-block', width: '2px', height: '0.85em', background: GOLD, verticalAlign: 'middle', marginLeft: '3px', animation: 'cn-blink 0.7s step-end infinite' }} />
          </h1>
          <div id="hero-tail" style={{ opacity: 0, pointerEvents: 'none' }}>
            <p style={{ marginTop: '12px', color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>
              {t('network_tagline')}
            </p>
            {/* Guided modal opener — subtle, not a big CTA */}
            <button
              onClick={() => setShowGuided(true)}
              style={{
                marginTop: 16,
                display: 'inline-flex',
                alignItems: 'center',
                fontSize: 12.5,
                fontWeight: 500,
                color: '#F5B335',
                background: 'rgba(232,160,32,0.08)',
                border: '1px solid rgba(232,160,32,0.15)',
                borderRadius: 6,
                padding: '8px 14px',
                cursor: 'pointer',
              }}
            >
              {t('network_guided_link')}
            </button>
          </div>
        </div>
      </div>

      {/* ══ CATEGORY LIST + SPONSORED PANEL ══════════════════════════ */}
      <div className="max-w-6xl mx-auto px-4 pt-4 pb-10 flex flex-col lg:flex-row lg:items-start gap-4 lg:gap-5">
        {/* Left column on desktop, full-width list on mobile */}
        <div className="w-full lg:w-[360px] lg:flex-shrink-0 flex flex-col gap-2.5">
          {GATE_CONFIG.map(gate => {
            const on = activeGate === gate.key
            return (
              <div key={gate.key}>
                <button
                  onClick={() => setActiveGate(gate.key)}
                  style={{
                    textAlign: 'left',
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 14px',
                    background: on ? 'rgba(232,160,32,0.05)' : SURFACE,
                    border: `1px solid ${on ? 'rgba(232,160,32,0.35)' : BORDER}`,
                    borderRadius: 6,
                    cursor: 'pointer',
                    transition: 'all .2s',
                  }}
                >
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(232,160,32,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                    {gate.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: '#fff', fontWeight: 600, fontSize: 15 }}>{gateTitle(gate.key)}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: GOLD, background: 'rgba(232,160,32,0.12)', borderRadius: 4, padding: '2px 7px' }}>
                      {gateCount(gate.key)}
                    </span>
                  </div>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 16, transition: 'transform .25s', transform: on ? 'rotate(90deg)' : 'rotate(0deg)', flexShrink: 0 }}>
                    ›
                  </span>
                </button>

                {/* One-sentence explainer, expands under the active item */}
                <div style={{ maxHeight: on ? 140 : 0, overflow: 'hidden', transition: 'max-height .3s ease' }}>
                  <p style={{ padding: '10px 14px 2px 66px', fontSize: 12.5, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
                    {gateDesc[gate.key]}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Right column on desktop; below the whole list on mobile */}
        <div className="w-full lg:flex-1 min-w-0">
          {renderPanel()}
        </div>
      </div>

      {showGuided && (
        <NetworkGuidedModal onClose={() => setShowGuided(false)} profiles={networkProfiles} />
      )}
    </div>
  )
}
