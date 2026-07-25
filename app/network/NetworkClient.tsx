'use client'
import { useState, Fragment } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { NETWORK, CITIES, CITY_LABELS } from '../lib/searchData'
import FollowButton from '@/components/ui/FollowButton'
import ListingsBar, { type Listing } from '@/components/network/ListingsBar'
import NetworkGuidedModal from '@/components/network/NetworkGuidedModal'
import { useNetworkProfiles } from '../components/NetworkProfilesContext'
import { useLanguage } from '../components/LanguageContext'
import { getAvatarCrop } from '../lib/profileCrop'
import CroppedImage from '../../components/ui/CroppedImage'

type NetworkTab = 'Artists' | 'Venues' | 'Professionals'
type GateKey = NetworkTab | 'Listings'

interface Profile {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  avatar_crop_x?: number | null
  avatar_crop_y?: number | null
  avatar_crop_width?: number | null
  avatar_crop_height?: number | null
  bio: string | null
  location: string | null
  network_tab: string | null
  network_category: string | null
  network_subcategory: string | null
  is_featured: boolean | null
  is_verified: boolean | null
}

interface GatesPreview {
  Artists: { profiles: Profile[]; count: number }
  Venues: { profiles: Profile[]; count: number }
  Professionals: { profiles: Profile[]; count: number }
  Listings: { items: Listing[]; count: number }
}

const GOLD = '#E8A020'
const BLUE = '#60A5FA'
const SURFACE = '#111120'
const BORDER = 'rgba(232,160,32,0.12)'

const TAB_META: Record<NetworkTab, { emoji: string; label: string }> = {
  Artists:       { emoji: '🎵', label: 'Artists' },
  Venues:        { emoji: '🏛', label: 'Venues' },
  Professionals: { emoji: '🤝', label: 'Professionals' },
}

const GATE_CONFIG: { key: GateKey; slug: string; icon: string }[] = [
  { key: 'Artists',       slug: 'artists',       icon: '🎵' },
  { key: 'Venues',        slug: 'venues',        icon: '🏛' },
  { key: 'Professionals', slug: 'professionals', icon: '🤝' },
  { key: 'Listings',      slug: 'listings',      icon: '📋' },
]

// ── Full profile card (used in the full-view grid) ─────────────────────
function ProfileCard({ profile }: { profile: Profile }) {
  const { t } = useLanguage()
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
          <div className="relative rounded-full flex-shrink-0" style={{ width: 48, height: 48, overflow: 'hidden', border: `1px solid ${BORDER}` }}>
            <CroppedImage
              src={profile.avatar_url}
              alt={profile.display_name}
              crop={getAvatarCrop(profile)}
              sizes="48px"
            />
          </div>
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
      <p className="text-xs font-medium mt-auto" style={{ color: GOLD }}>{t("network_view_profile")}</p>
    </Link>
  )
}

// ── Compact profile card (used in the gate previews) ───────────────────
function CompactProfileCard({ profile }: { profile: Profile }) {
  const initials = profile.display_name?.slice(0, 2).toUpperCase() || '?'
  return (
    <Link
      href={`/profile/${profile.username}`}
      className="flex items-center gap-3 p-3 transition-all hover:opacity-90"
      style={{
        backgroundColor: '#1A1A28',
        border: `1px solid ${profile.is_featured ? GOLD : 'rgba(255,255,255,0.06)'}`,
        borderRadius: 6,
      }}
    >
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
          {profile.is_featured && <span style={{ color: GOLD }} className="text-xs flex-shrink-0">★</span>}
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

interface Props {
  profiles: Profile[]
  allProfiles?: Profile[]
  listings?: Listing[]
  gatesPreview: GatesPreview
}

export default function NetworkClient({ profiles, listings = [], gatesPreview }: Props) {
  const { t } = useLanguage()
  const router = useRouter()
  const params = useSearchParams()
  const networkProfiles = useNetworkProfiles()

  const [showGuided, setShowGuided] = useState(false)
  const [activeGate, setActiveGate] = useState<GateKey | null>(null)

  const slugToTab: Record<string, NetworkTab> = {
    artists: 'Artists',
    venues: 'Venues',
    professionals: 'Professionals',
  }
  const activeTab: NetworkTab = slugToTab[params.get('tab') ?? 'artists'] ?? 'Artists'
  const activeCategory = params.get('category') || ''
  const activeCity = params.get('city') || ''

  // Full-view is shown when the URL carries any of these params (keeps every
  // existing deep link — ?tab=/?category=/?city= — working); the plain
  // /network entry shows the gates.
  const showFullView = ['view', 'tab', 'category', 'city'].some(k => params.get(k))

  function push(overrides: Record<string, string>) {
    const p = new URLSearchParams()
    p.set('view', 'all')
    const next = { tab: activeTab, category: activeCategory, city: activeCity, ...overrides }
    if (next.tab) p.set('tab', next.tab.toLowerCase())
    if (next.category) p.set('category', next.category)
    if (next.city) p.set('city', next.city)
    router.push(`/network?${p.toString()}`)
  }

  const gateDesc: Record<GateKey, string> = {
    Artists:       t('network_gate_artists_desc'),
    Venues:        t('network_gate_venues_desc'),
    Professionals: t('network_gate_pros_desc'),
    Listings:      t('network_gate_listings_desc'),
  }
  const gateTitle = (key: GateKey) =>
    key === 'Listings' ? t('network_gate_listings_title') : TAB_META[key].label
  const gateCount = (key: GateKey) => gatesPreview[key].count

  const tabData = NETWORK[activeTab] as Record<string, unknown>

  // For Professionals, flatten "For Events" and "For Artists" sub-groups into
  // one list for the filter pills.
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

  const renderGrid = (list: Profile[]) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {list.map(p => <ProfileCard key={p.id} profile={p} />)}
    </div>
  )

  // ── Professionals grouping (full-view) ──────────────────────────────
  const forEventsRoles = Object.keys(NETWORK.Professionals['For Events'])
  const forArtistsRoles = Object.keys(NETWORK.Professionals['For Artists'])
  const inGroup = (roles: string[], p: Profile) => roles.includes(p.network_category ?? '')
  const proForEvents = profiles.filter(p => inGroup(forEventsRoles, p))
  const proForArtists = profiles.filter(p => inGroup(forArtistsRoles, p))
  const proUngrouped = profiles.filter(p => !inGroup(forEventsRoles, p) && !inGroup(forArtistsRoles, p))

  const groupSection = (label: string, color: string, list: Profile[]) => (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color }}>{label}</span>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
      </div>
      {renderGrid(list)}
    </div>
  )

  // ── Gate panel (accordion expand content) ───────────────────────────
  function renderGatePanel(key: GateKey) {
    if (key === 'Listings') {
      const { items } = gatesPreview.Listings
      return (
        <div style={{ padding: '2px 2px 8px' }}>
          {items.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, padding: '12px 4px' }}>{t('network_gate_empty')}</p>
          ) : (
            <ListingsBar listings={items} />
          )}
          <Link
            href="/network/listings"
            className="inline-block mt-4 text-xs font-semibold transition-opacity hover:opacity-80"
            style={{ color: GOLD }}
          >
            {t('network_see_all_listings')}
          </Link>
        </div>
      )
    }

    const preview = gatesPreview[key]
    const slug = key.toLowerCase()
    return (
      <div style={{ padding: '2px 2px 8px' }}>
        {preview.profiles.length === 0 ? (
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, padding: '12px 4px' }}>{t('network_gate_empty')}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {preview.profiles.map(p => <CompactProfileCard key={p.id} profile={p} />)}
          </div>
        )}
        <button
          onClick={() => router.push(`/network?view=all&tab=${slug}`)}
          className="mt-4 text-xs font-semibold transition-opacity hover:opacity-80"
          style={{ color: GOLD, cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
        >
          {t('network_see_all_profiles')} {preview.count} →
        </button>
      </div>
    )
  }

  const gateRows = [GATE_CONFIG.slice(0, 2), GATE_CONFIG.slice(2, 4)]

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0F0F1A' }}>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <div style={{ position: 'relative', background: '#080808', overflow: 'hidden', minHeight: '260px', display: 'flex', alignItems: 'flex-end', padding: '48px 0 44px' }}>
        {/* Ambient floating blobs (float = drift, glow-pulse = opacity) */}
        <div className="animate-float-a" style={{ position: 'absolute', top: -90, left: -70, pointerEvents: 'none', zIndex: 1 }}>
          <div className="animate-glow-pulse" style={{ width: 320, height: 320, borderRadius: '50%', background: GOLD, filter: 'blur(80px)' }} />
        </div>
        <div className="animate-float-b" style={{ position: 'absolute', top: -110, right: -80, pointerEvents: 'none', zIndex: 1 }}>
          <div className="animate-glow-pulse" style={{ width: 360, height: 360, borderRadius: '50%', background: '#16213E', filter: 'blur(90px)' }} />
        </div>

        {/* Bottom fade into page background */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '80px', background: 'linear-gradient(transparent, #0F0F1A)', pointerEvents: 'none', zIndex: 5 }} />

        <div style={{ position: 'relative', zIndex: 10, maxWidth: '72rem', margin: '0 auto', padding: '0 24px', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              {/* Eyebrow: LIVE NETWORK with pulsing dot */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span className="animate-live-pulse" style={{ width: 7, height: 7, borderRadius: '50%', background: GOLD, display: 'inline-block', flexShrink: 0 }} />
                <span style={{ fontSize: 9, letterSpacing: '0.35em', textTransform: 'uppercase', color: GOLD, fontFamily: 'var(--font-sans)' }}>{t('network_live_eyebrow')}</span>
              </div>
              <h1 style={{ fontFamily: 'var(--font-spectral)', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 300, color: '#fff', lineHeight: 1.15, margin: 0 }}>
                The people behind the <span style={{ color: GOLD, fontStyle: 'italic' }}>night.</span>
              </h1>
            </div>
            <Link href="/network/listings" className="section-link-gold" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
              {t('network_listings')}
            </Link>
          </div>
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

      {showFullView ? (
        /* ══ FULL VIEW — tabs + filters + grid ═══════════════════════ */
        <>
          {/* Listings Bar */}
          {listings.length > 0 && (
            <div className="max-w-6xl mx-auto px-4 pt-6 pb-2">
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
                  <option value="">{t("network_all_cities")}</option>
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
                      {t("network_all")}
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

            {/* Back to gates */}
            <button
              onClick={() => router.push('/network')}
              className="mb-5 text-xs transition-colors hover:text-white"
              style={{ color: 'rgba(255,255,255,0.45)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
            >
              {t('network_back_to_gates')}
            </button>

            {/* Count */}
            <div className="mb-5">
              <p className="text-xs text-white/30">
                {profiles.length} {profiles.length === 1 ? t("network_results_one") : t("network_results_many")}
                {activeCategory && <span> · {activeCategory}</span>}
                {activeCity && <span> · {activeCity}</span>}
              </p>
            </div>

            {profiles.length > 0 ? (
              activeTab === 'Professionals' ? (
                <div className="space-y-9">
                  {proForEvents.length > 0 && groupSection(t('network_group_for_events'), BLUE, proForEvents)}
                  {proForArtists.length > 0 && groupSection(t('network_group_for_artists'), GOLD, proForArtists)}
                  {proUngrouped.length > 0 && renderGrid(proUngrouped)}
                </div>
              ) : (
                renderGrid(profiles)
              )
            ) : (
              <div className="text-center py-20">
                <p className="text-white/30 text-sm mb-2">{t("network_no_results")}</p>
                {(activeCategory || activeCity) && (
                  <button
                    onClick={() => push({ category: '', city: '' })}
                    className="text-xs hover:underline mt-2"
                    style={{ color: GOLD }}
                  >
                    {t("network_clear")}
                  </button>
                )}
              </div>
            )}
          </div>
        </>
      ) : (
        /* ══ GATES — default view ════════════════════════════════════ */
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {gateRows.map((row, ri) => (
              <Fragment key={ri}>
                {row.map(gate => {
                  const open = activeGate === gate.key
                  return (
                    <button
                      key={gate.key}
                      onClick={() => setActiveGate(open ? null : gate.key)}
                      style={{
                        textAlign: 'left',
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                        padding: 20,
                        background: open ? 'rgba(232,160,32,0.05)' : SURFACE,
                        border: `1px solid ${open ? 'rgba(232,160,32,0.35)' : BORDER}`,
                        borderRadius: 6,
                        cursor: 'pointer',
                        transition: 'all .2s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(232,160,32,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                          {gate.icon}
                        </div>
                        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ color: '#fff', fontWeight: 600, fontSize: 15 }}>{gateTitle(gate.key)}</span>
                          <span style={{ fontSize: 11, fontWeight: 600, color: GOLD, background: 'rgba(232,160,32,0.12)', borderRadius: 4, padding: '2px 7px' }}>
                            {gateCount(gate.key)}
                          </span>
                        </div>
                        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 16, transition: 'transform .25s', transform: open ? 'rotate(90deg)' : 'rotate(0deg)', flexShrink: 0 }}>
                          ›
                        </span>
                      </div>
                      <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
                        {gateDesc[gate.key]}
                      </p>
                    </button>
                  )
                })}
                {row.some(g => g.key === activeGate) && activeGate && (
                  <div
                    style={{
                      gridColumn: '1 / -1',
                      background: 'rgba(255,255,255,0.02)',
                      border: `1px solid ${BORDER}`,
                      borderRadius: 6,
                      padding: 16,
                    }}
                  >
                    {renderGatePanel(activeGate)}
                  </div>
                )}
              </Fragment>
            ))}
          </div>
        </div>
      )}

      {showGuided && (
        <NetworkGuidedModal onClose={() => setShowGuided(false)} profiles={networkProfiles} />
      )}
    </div>
  )
}
