'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import InterestButton from '@/components/ui/InterestButton'
import { useLanguage } from '@/app/components/LanguageContext'

interface Profile {
  id: string
  display_name: string
  username: string
  avatar_url: string | null
  network_tab: string | null
  network_category: string | null
  network_subcategory: string | null
}

interface Listing {
  id: string
  type: 'seeking' | 'offering'
  role: string | null
  title: string
  description: string | null
  city: string | null
  date_needed: string | null
  is_sponsored: boolean
  created_at: string
  profiles: Profile
}

const GOLD = '#E8A020'

export default function ListingsPageClient({ listings }: { listings: Listing[] }) {
  const { t } = useLanguage()
  const [typeFilter, setTypeFilter] = useState<'all' | 'seeking' | 'offering'>('all')
  const [cityFilter, setCityFilter] = useState<string>('all')
  const [search, setSearch] = useState('')

  const cities = useMemo(() => {
    const all = listings.map(l => l.city).filter(Boolean) as string[]
    return ['all', ...Array.from(new Set(all)).sort()]
  }, [listings])

  const filtered = useMemo(() => {
    return listings.filter(l => {
      if (typeFilter !== 'all' && l.type !== typeFilter) return false
      if (cityFilter !== 'all' && l.city !== cityFilter) return false
      if (search) {
        const q = search.toLowerCase()
        if (!l.title.toLowerCase().includes(q) && !(l.role ?? '').toLowerCase().includes(q) && !(l.description ?? '').toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [listings, typeFilter, cityFilter, search])

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0F0F1A', paddingTop: 80 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: GOLD, marginBottom: 10 }}>
            NETWORK
          </p>
          <h1 style={{ fontFamily: 'var(--font-spectral),Georgia,serif', fontSize: 36, fontWeight: 500, color: '#F4F4F5', lineHeight: 1.2, marginBottom: 12 }}>
            {t("listings_title")}
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', maxWidth: 500 }}>
            {t("listings_subtitle")}
          </p>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 36, alignItems: 'center' }}>
          {/* Search */}
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t("listings_search")}
            style={{
              backgroundColor: '#1A1A28',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 6,
              padding: '8px 14px',
              fontSize: 13,
              color: '#F4F4F5',
              outline: 'none',
              width: 220,
            }}
          />
          {/* Type filter */}
          <div style={{ display: 'flex', gap: 6 }}>
            {(['all', 'seeking', 'offering'] as const).map(tab => (
              <button key={tab} onClick={() => setTypeFilter(tab)}
                style={{
                  padding: '7px 14px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  border: `1px solid ${typeFilter === tab ? GOLD : 'rgba(255,255,255,0.1)'}`,
                  backgroundColor: typeFilter === tab ? 'rgba(232,160,32,0.1)' : 'transparent',
                  color: typeFilter === tab ? GOLD : 'rgba(255,255,255,0.45)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}>
                {tab === 'all' ? t("listings_all") : tab === 'seeking' ? t("listings_seeking") : t("listings_offering")}
              </button>
            ))}
          </div>
          {/* City filter */}
          <select value={cityFilter} onChange={e => setCityFilter(e.target.value)}
            style={{
              backgroundColor: '#1A1A28',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 6,
              padding: '7px 12px',
              fontSize: 12,
              color: cityFilter === 'all' ? 'rgba(255,255,255,0.45)' : '#F4F4F5',
              outline: 'none',
              cursor: 'pointer',
            }}>
            {cities.map(c => <option key={c} value={c}>{c === 'all' ? t("listings_all_cities") : c}</option>)}
          </select>
          {/* Count */}
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginLeft: 'auto' }}>
            {filtered.length} {filtered.length === 1 ? t("listings_count_one") : t("listings_count_many")}
          </span>
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', paddingTop: 40 }}>{t("listings_none")}</p>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 16,
          }}>
            {filtered.map(listing => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ListingCard({ listing }: { listing: Listing }) {
  const { t } = useLanguage()
  const [expanded, setExpanded] = useState(false)

  const initials = (name: string) => name.slice(0, 2).toUpperCase()

  return (
    <div
      style={{
        backgroundColor: listing.is_sponsored ? 'rgba(232,160,32,0.04)' : '#1A1A28',
        border: `1px solid ${listing.is_sponsored ? 'rgba(232,160,32,0.3)' : 'rgba(255,255,255,0.07)'}`,
        borderRadius: 6,
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        cursor: 'pointer',
        transition: 'border-color 0.15s',
      }}
      onClick={() => setExpanded(e => !e)}
    >
      {/* Top: role + sponsored */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {listing.role && (
          <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: GOLD }}>
            {listing.role}
          </span>
        )}
        <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
          <span style={{
            fontSize: 9.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
            color: listing.type === 'seeking' ? '#60A5FA' : '#34D399',
            backgroundColor: listing.type === 'seeking' ? 'rgba(96,165,250,0.08)' : 'rgba(52,211,153,0.08)',
            border: `1px solid ${listing.type === 'seeking' ? 'rgba(96,165,250,0.25)' : 'rgba(52,211,153,0.25)'}`,
            borderRadius: 4, padding: '2px 7px',
          }}>
            {listing.type === 'seeking' ? t("listings_seeking") : t("listings_offering")}
          </span>
          {listing.is_sponsored && (
            <span style={{
              fontSize: 9.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
              color: GOLD, backgroundColor: 'rgba(232,160,32,0.1)',
              border: '1px solid rgba(232,160,32,0.25)', borderRadius: 4, padding: '2px 7px',
            }}>Sponsored</span>
          )}
        </div>
      </div>

      {/* Title */}
      <p style={{ fontFamily: 'var(--font-spectral),Georgia,serif', fontSize: 17, fontWeight: 500, color: '#F4F4F5', lineHeight: 1.3 }}>
        {listing.title}
      </p>

      {/* Expanded description */}
      {expanded && listing.description && (
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>
          {listing.description}
        </p>
      )}

      {/* Meta */}
      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
        {[
          listing.city,
          listing.date_needed
            ? new Date(listing.date_needed).toLocaleDateString('el-GR', { day: 'numeric', month: 'short' })
            : null,
        ].filter(Boolean).join(' · ')}
      </p>

      {/* Bottom: profile + interest */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}
        onClick={e => e.stopPropagation()}>
        <Link href={`/profile/${listing.profiles.username}`}
          style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
          onClick={e => e.stopPropagation()}>
          {listing.profiles.avatar_url ? (
            <img src={listing.profiles.avatar_url} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: 'rgba(232,160,32,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: GOLD }}>{initials(listing.profiles.display_name)}</span>
            </div>
          )}
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{listing.profiles.display_name}</span>
        </Link>
        <InterestButton listingId={listing.id} initialCount={0} />
      </div>
    </div>
  )
}
