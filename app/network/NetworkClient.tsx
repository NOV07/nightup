'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { NETWORK, CITIES } from '../lib/searchData'
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
    padding: '0.4rem 1rem',
    borderRadius: 6,
    fontSize: '0.8rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s',
    backgroundColor: active ? GOLD : 'transparent',
    color: active ? '#0F0F1A' : 'rgba(255,255,255,0.5)',
    border: active ? `1px solid ${GOLD}` : '1px solid rgba(255,255,255,0.08)',
  })

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0F0F1A' }}>

      {/* Hero */}
      <div className="max-w-6xl mx-auto px-4 pt-10 pb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-0">
          <div>
            <h1 className="text-3xl font-semibold text-white mb-2">
              The people behind the <span style={{ color: GOLD, fontStyle: 'italic' }}>night.</span>
            </h1>
            <p className="text-white/40 text-sm">
              Artists, venues και professionals — όλοι εδώ.
            </p>
          </div>
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
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none flex-shrink-0">
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
              className="text-sm outline-none flex-shrink-0"
              style={{
                backgroundColor: '#111120',
                color: activeCity ? 'white' : 'rgba(255,255,255,0.4)',
                border: `1px solid ${BORDER}`,
                borderRadius: 6,
                padding: '0.4rem 0.75rem',
              }}
            >
              <option value="">Όλες οι πόλεις</option>
              {CITIES.slice(1).map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          {/* Row 2: subcategories */}
          {hasSubcategories && (
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
