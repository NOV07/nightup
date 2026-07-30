'use client'
import { useState, type ComponentType } from 'react'
import Link from 'next/link'
import { type Listing } from '@/components/network/ListingsBar'
import InterestButton from '@/components/ui/InterestButton'
import CinematicHero from '@/components/network/CinematicHero'
import PartyBuilderModal from '@/components/network/PartyBuilderModal'
import CareerBuilderModal from '@/components/network/CareerBuilderModal'
import { LuPartyPopper, LuDisc3 } from 'react-icons/lu'
import { ArtistsIcon, VenuesIcon, ProfessionalsIcon, ListingsIcon } from '@/components/network/icons'
import { TAB_META, type NetworkTab, type Profile } from '@/app/lib/networkProfile'
import { type TranslationKey } from '../lib/translations'
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

// Each gate carries its own drawn glyph; the tinted circle behind it stays gold
// on all four, so only the glyph colour separates the categories.
const GATE_CONFIG: { key: GateKey; slug: string; Icon: ComponentType<{ size?: number; className?: string }> }[] = [
  { key: 'Artists',       slug: 'artists',       Icon: ArtistsIcon },
  { key: 'Venues',        slug: 'venues',        Icon: VenuesIcon },
  { key: 'Professionals', slug: 'professionals', Icon: ProfessionalsIcon },
  { key: 'Listings',      slug: 'listings',      Icon: ListingsIcon },
]

// Mobile hero shortcuts into the two builders — gold for the party flow, blue
// for the music one, matching the icon colours on the desktop guide cards.
const HERO_SHORTCUTS: {
  key: 'party' | 'music'
  title: TranslationKey
  sub: TranslationKey
  color: string
  bg: string
  border: string
}[] = [
  {
    key: 'party',
    title: 'network_guide_event_mini',
    sub: 'network_guide_event_mini_sub',
    color: '#F5B335',
    bg: 'rgba(232,160,32,0.08)',
    border: 'rgba(232,160,32,0.25)',
  },
  {
    key: 'music',
    title: 'network_guide_music_mini',
    sub: 'network_guide_music_mini_sub',
    color: '#60A5FA',
    bg: 'rgba(96,165,250,0.08)',
    border: 'rgba(96,165,250,0.25)',
  },
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

  // Each guide card opens its own builder modal — party (gold), music (blue).
  const [showParty, setShowParty] = useState(false)
  const [showCareer, setShowCareer] = useState(false)
  // At most one category is active. Nothing is selected on mount, and clicking
  // the active one deselects it — both leave the panel on its guides state.
  const [activeGate, setActiveGate] = useState<GateKey | null>(null)

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

  // ── Guides — shown in the panel while no category is selected ───────
  function renderGuides() {
    const guides = [
      { key: 'party' as const, title: t('network_guide_event_title'), sub: t('network_guide_event_sub') },
      { key: 'music' as const, title: t('network_guide_music_title'), sub: t('network_guide_music_sub') },
    ]
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
        {guides.map(guide => (
          <button
            key={guide.key}
            onClick={() => guide.key === 'party' ? setShowParty(true) : setShowCareer(true)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 10,
              padding: 20,
              textAlign: 'left',
              background: '#1A1A28',
              border: `1px solid ${BORDER}`,
              borderRadius: 6,
              cursor: 'pointer',
              transition: 'all .2s',
            }}
          >
            {guide.key === 'party'
              ? <LuPartyPopper size={26} color={GOLD} strokeWidth={1.5} />
              : <LuDisc3 size={26} color="#60A5FA" strokeWidth={1.5} />}
            <span style={{ color: '#fff', fontWeight: 600, fontSize: 15 }}>{guide.title}</span>
            <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.45)', lineHeight: 1.65 }}>{guide.sub}</span>
            <span style={{ marginTop: 'auto', paddingTop: 8, fontSize: 12, fontWeight: 600, color: '#F5B335' }}>
              {t('network_guided_link')}
            </span>
          </button>
        ))}
      </div>
    )
  }

  // ── Sponsored-first panel for the active category ───────────────────
  // The data arrives from page.tsx already ordered is_featured / is_sponsored
  // desc, then created_at desc, capped at 4 — no client-side sorting needed.
  // Rendered twice: in the fixed right column on desktop, and inline inside the
  // open accordion item on mobile. Only the wrapper below differs, so the grid
  // and the guides markup live here once.
  function renderPanelContent(gate: GateKey | null) {
    if (gate === null) return renderGuides()

    const isListings = gate === 'Listings'
    const empty = isListings
      ? gatesPreview.Listings.items.length === 0
      : gatesPreview[gate].profiles.length === 0

    return (
      <>
        {/* Header — category title, count and the sponsored label */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h2 style={{ color: '#fff', fontWeight: 600, fontSize: 16 }}>{gateTitle(gate)}</h2>
            <span style={{ fontSize: 11, fontWeight: 600, color: GOLD, background: 'rgba(232,160,32,0.12)', borderRadius: 4, padding: '2px 7px' }}>
              {gateCount(gate)}
            </span>
          </div>
          <p style={{ marginTop: 5, fontSize: 9, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)' }}>
            Sponsored
          </p>
        </div>

        {empty ? (
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, padding: '12px 4px' }}>{t('network_gate_empty')}</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {isListings
              ? gatesPreview.Listings.items.map(l => <CompactListingCard key={l.id} listing={l} />)
              : gatesPreview[gate].profiles.map(p => <CompactProfileCard key={p.id} profile={p} />)}
          </div>
        )}

        {/* See-all pill — centred in the space left under the grid */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, padding: '20px 8px 6px' }}>
          <Link
            href={gateHref(gate)}
            className="text-xs font-semibold transition-all hover:opacity-80"
            style={{
              color: '#F5B335',
              background: 'rgba(232,160,32,0.08)',
              border: '1px solid rgba(232,160,32,0.25)',
              borderRadius: 999,
              padding: '10px 22px',
              whiteSpace: 'nowrap',
            }}
          >
            {isListings
              ? t('network_see_all_listings')
              : `${t('network_see_all_profiles')} ${gateCount(gate)} →`}
          </Link>
        </div>
      </>
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
        {/* Mobile only — the two builders are reachable from the desktop guide
            cards in the sponsored panel, which mobile never shows. These pair
            of shortcuts stand in for them, independent of the accordion. */}
        <div className="lg:hidden" style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          {HERO_SHORTCUTS.map(shortcut => (
            <button
              key={shortcut.key}
              onClick={() => shortcut.key === 'party' ? setShowParty(true) : setShowCareer(true)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                textAlign: 'left',
                padding: '11px 12px',
                background: shortcut.bg,
                border: `1px solid ${shortcut.border}`,
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 700, color: shortcut.color }}>
                {t(shortcut.title)}
              </span>
              <span style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.4)' }}>
                {t(shortcut.sub)}
              </span>
            </button>
          ))}
        </div>
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
                  onClick={() => setActiveGate(on ? null : gate.key)}
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
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(232,160,32,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <gate.Icon size={22} />
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

                {/* Mobile only — the sponsored panel rides inside this item's
                    accordion, right under the explainer. On desktop the same
                    content lives in the fixed right column instead. */}
                {on && (
                  <div
                    className="lg:hidden flex flex-col"
                    style={{ marginTop: 8, padding: 14, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 6 }}
                  >
                    {renderPanelContent(gate.key)}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Right column — desktop only; on mobile the panel is inline above */}
        <div className="hidden lg:block lg:flex-1 min-w-0">
          <div
            className="flex flex-col p-[18px] min-h-[360px]"
            style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8 }}
          >
            {renderPanelContent(activeGate)}
          </div>
        </div>
      </div>

      {showParty && (
        <PartyBuilderModal onClose={() => setShowParty(false)} profiles={networkProfiles} />
      )}

      {showCareer && (
        <CareerBuilderModal onClose={() => setShowCareer(false)} profiles={networkProfiles} />
      )}
    </div>
  )
}
