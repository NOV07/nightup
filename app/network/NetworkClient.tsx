'use client'
import { useState } from 'react'
import Link from 'next/link'
import { type Listing } from '@/components/network/ListingsBar'
import InterestButton from '@/components/ui/InterestButton'
import CinematicHero from '@/components/network/CinematicHero'
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

      <CinematicHero
        eyebrow={t('network_live_eyebrow')}
        eyebrowDot
        titleBefore="The people behind the "
        titleEm="night."
        subtitle={t('network_tagline')}
      >
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
      </CinematicHero>

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
