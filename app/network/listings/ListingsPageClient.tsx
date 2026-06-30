'use client'
import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import InterestButton from '@/components/ui/InterestButton'
import { useLanguage } from '@/app/components/LanguageContext'
import { getListingCategory } from '@/app/lib/searchData'

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
const NAVY = '#0F0F1A'
const CARD_BG = '#1A1A28'

function timeAgo(dateStr: string, lang: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return lang === 'el' ? 'μόλις τώρα' : 'just now'
  if (mins < 60) return lang === 'el' ? `${mins}λ πριν` : `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return lang === 'el' ? `${hours}ω πριν` : `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return lang === 'el' ? `${days}μ πριν` : `${days}d ago`
  return new Date(dateStr).toLocaleDateString(lang === 'el' ? 'el-GR' : 'en-GB', { day: 'numeric', month: 'short' })
}

function SidebarSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 12 }}>
        {title}
      </p>
      {children}
    </div>
  )
}

export default function ListingsPageClient({ listings }: { listings: Listing[] }) {
  const { t, lang } = useLanguage()

  const [typeFilter, setTypeFilter] = useState<'all' | 'seeking' | 'offering'>('all')
  const [categoryFilter, setCategoryFilter] = useState<string[]>([])
  const [cityFilter, setCityFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [publishedFilter, setPublishedFilter] = useState<'all' | '24h' | '7d' | '30d'>('all')
  const [search, setSearch] = useState('')
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const cities = useMemo(() => {
    const all = listings.map(l => l.city).filter(Boolean) as string[]
    return ['all', ...Array.from(new Set(all)).sort()]
  }, [listings])

  function toggleCategory(cat: string) {
    setCategoryFilter(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])
  }

  const sorted = useMemo(() => {
    return listings
      .filter(l => {
        if (typeFilter !== 'all' && l.type !== typeFilter) return false
        if (categoryFilter.length > 0) {
          const cat = getListingCategory(l.role)
          const group = cat ? cat.group : 'Other'
          if (!categoryFilter.includes(group)) return false
        }
        if (cityFilter !== 'all' && l.city !== cityFilter) return false
        if (dateFrom && l.date_needed && l.date_needed < dateFrom) return false
        if (dateTo && l.date_needed && l.date_needed > dateTo) return false
        if (publishedFilter !== 'all') {
          const ms = publishedFilter === '24h' ? 86400000 : publishedFilter === '7d' ? 604800000 : 2592000000
          if (Date.now() - new Date(l.created_at).getTime() > ms) return false
        }
        if (search) {
          const q = search.toLowerCase()
          if (
            !l.title.toLowerCase().includes(q) &&
            !(l.role ?? '').toLowerCase().includes(q) &&
            !(l.description ?? '').toLowerCase().includes(q)
          ) return false
        }
        return true
      })
      .sort((a, b) => {
        if (a.is_sponsored && !b.is_sponsored) return -1
        if (!a.is_sponsored && b.is_sponsored) return 1
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
  }, [listings, typeFilter, categoryFilter, cityFilter, dateFrom, dateTo, publishedFilter, search])

  const inputStyle: React.CSSProperties = {
    backgroundColor: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 6,
    padding: '7px 10px',
    fontSize: 12,
    color: '#F4F4F5',
    outline: 'none',
    width: '100%',
  }

  const activeFilterCount = [
    categoryFilter.length > 0,
    typeFilter !== 'all',
    cityFilter !== 'all',
    !!(dateFrom || dateTo),
    publishedFilter !== 'all',
  ].filter(Boolean).length

  const sidebarFilters = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* Τύπος */}
      <SidebarSection title={t('listings_type')}>
        {(['all', 'seeking', 'offering'] as const).map(v => (
          <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 8 }}>
            <input
              type="radio"
              name="type-filter"
              checked={typeFilter === v}
              onChange={() => setTypeFilter(v)}
              style={{ accentColor: GOLD }}
            />
            <span style={{ fontSize: 13, color: typeFilter === v ? GOLD : 'rgba(255,255,255,0.6)' }}>
              {v === 'all' ? t('listings_all') : v === 'seeking' ? t('listings_seeking') : t('listings_offering')}
            </span>
          </label>
        ))}
      </SidebarSection>

      {/* Κατηγορία */}
      <SidebarSection title={t('listings_category')}>
        {(['Artists', 'Venues', 'Professionals', 'Other'] as const).map(cat => (
          <label key={cat} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 8 }}>
            <input
              type="checkbox"
              checked={categoryFilter.includes(cat)}
              onChange={() => toggleCategory(cat)}
              style={{ accentColor: GOLD }}
            />
            <span style={{ fontSize: 13, color: categoryFilter.includes(cat) ? GOLD : 'rgba(255,255,255,0.6)' }}>
              {cat === 'Artists' ? t('listings_cat_artists')
                : cat === 'Venues' ? t('listings_cat_venues')
                : cat === 'Professionals' ? t('listings_cat_professionals')
                : t('listings_cat_other')}
            </span>
          </label>
        ))}
      </SidebarSection>

      {/* Πόλη */}
      <SidebarSection title={t('listings_city')}>
        <select
          value={cityFilter}
          onChange={e => setCityFilter(e.target.value)}
          style={{ ...inputStyle, cursor: 'pointer' }}
        >
          {cities.map(c => (
            <option key={c} value={c}>{c === 'all' ? t('listings_all_cities') : c}</option>
          ))}
        </select>
      </SidebarSection>

      {/* Πότε χρειάζεται */}
      <SidebarSection title={t('listings_when_needed')}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 4 }}>
              {t('listings_date_from')}
            </span>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 4 }}>
              {t('listings_date_to')}
            </span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>
      </SidebarSection>

      {/* Δημοσιεύτηκε */}
      <SidebarSection title={t('listings_published')}>
        {(['all', '24h', '7d', '30d'] as const).map(v => (
          <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 8 }}>
            <input
              type="radio"
              name="published-filter"
              checked={publishedFilter === v}
              onChange={() => setPublishedFilter(v)}
              style={{ accentColor: GOLD }}
            />
            <span style={{ fontSize: 13, color: publishedFilter === v ? GOLD : 'rgba(255,255,255,0.6)' }}>
              {v === 'all' ? t('listings_pub_all')
                : v === '24h' ? t('listings_pub_24h')
                : v === '7d' ? t('listings_pub_7d')
                : t('listings_pub_30d')}
            </span>
          </label>
        ))}
      </SidebarSection>

    </div>
  )

  return (
    <div style={{ minHeight: '100vh', backgroundColor: NAVY, paddingTop: 80 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: GOLD, marginBottom: 10 }}>
            NETWORK
          </p>
          <h1 style={{ fontFamily: 'var(--font-spectral),Georgia,serif', fontSize: 36, fontWeight: 500, color: '#F4F4F5', lineHeight: 1.2, marginBottom: 12 }}>
            {t('listings_title')}
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', maxWidth: 500 }}>
            {t('listings_subtitle')}
          </p>
        </div>

        {/* Mobile filter toggle */}
        {isMobile && (
          <button
            onClick={() => setMobileFiltersOpen(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '9px 16px', borderRadius: 8,
              backgroundColor: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.7)', fontSize: 13,
              cursor: 'pointer', marginBottom: 20,
            }}
          >
            <svg width="14" height="12" viewBox="0 0 14 12" fill="none">
              <path d="M1 2h12M3 6h8M5 10h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Φίλτρα
            {activeFilterCount > 0 && (
              <span style={{
                backgroundColor: GOLD, color: NAVY,
                borderRadius: '50%', width: 18, height: 18,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700,
              }}>
                {activeFilterCount}
              </span>
            )}
          </button>
        )}

        {/* Mobile filter overlay */}
        {mobileFiltersOpen && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex' }}>
            <div
              style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)' }}
              onClick={() => setMobileFiltersOpen(false)}
            />
            <div style={{
              position: 'relative', zIndex: 1,
              width: '85vw', maxWidth: 320, height: '100%',
              backgroundColor: '#13131F',
              borderRight: '1px solid rgba(255,255,255,0.08)',
              overflowY: 'auto', padding: '24px 20px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
                <span style={{ fontWeight: 700, fontSize: 15, color: '#F4F4F5' }}>Φίλτρα</span>
                <button
                  onClick={() => setMobileFiltersOpen(false)}
                  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}
                >
                  ✕
                </button>
              </div>
              {sidebarFilters}
            </div>
          </div>
        )}

        {/* Two-column layout */}
        <div style={{ display: 'flex', gap: 48, alignItems: 'flex-start' }}>

          {/* Sidebar (desktop only) */}
          {!isMobile && (
            <aside style={{ width: 260, flexShrink: 0, position: 'sticky', top: 100 }}>
              {sidebarFilters}
            </aside>
          )}

          {/* Main column */}
          <main style={{ flex: 1, minWidth: 0 }}>

            {/* Search + count */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 24 }}>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t('listings_search')}
                style={{
                  flex: 1,
                  backgroundColor: CARD_BG,
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 6,
                  padding: '9px 14px',
                  fontSize: 13,
                  color: '#F4F4F5',
                  outline: 'none',
                }}
              />
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap' }}>
                {sorted.length} {sorted.length === 1 ? t('listings_count_one') : t('listings_count_many')}
              </span>
            </div>

            {/* Card list */}
            {sorted.length === 0 ? (
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', paddingTop: 40 }}>
                {t('listings_none')}
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {sorted.map(listing => (
                  <ListingCard key={listing.id} listing={listing} lang={lang} />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}

function ListingCard({ listing, lang }: { listing: Listing; lang: string }) {
  const { t } = useLanguage()
  const cat = getListingCategory(listing.role)

  const catLabel = cat
    ? cat.subgroup ? `${cat.group} · ${cat.subgroup}` : cat.group
    : (listing.role ?? null)

  const initials = (name: string) => name.slice(0, 2).toUpperCase()

  return (
    <article style={{
      backgroundColor: listing.is_sponsored ? 'rgba(232,160,32,0.04)' : CARD_BG,
      border: `1px solid ${listing.is_sponsored ? 'rgba(232,160,32,0.25)' : 'rgba(255,255,255,0.07)'}`,
      borderRadius: 8,
      padding: '20px 24px',
    }}>

      {/* Top row: category badge · type badge · sponsored · time */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        {catLabel && (
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
            color: listing.is_sponsored ? GOLD : 'rgba(255,255,255,0.45)',
            backgroundColor: listing.is_sponsored ? 'rgba(232,160,32,0.1)' : 'rgba(255,255,255,0.06)',
            border: `1px solid ${listing.is_sponsored ? 'rgba(232,160,32,0.3)' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: 4, padding: '2px 8px',
          }}>
            {catLabel}
          </span>
        )}
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
          color: listing.type === 'seeking' ? '#60A5FA' : '#34D399',
          backgroundColor: listing.type === 'seeking' ? 'rgba(96,165,250,0.08)' : 'rgba(52,211,153,0.08)',
          border: `1px solid ${listing.type === 'seeking' ? 'rgba(96,165,250,0.25)' : 'rgba(52,211,153,0.25)'}`,
          borderRadius: 4, padding: '2px 8px',
        }}>
          {listing.type === 'seeking' ? t('listings_seeking') : t('listings_offering')}
        </span>
        {listing.is_sponsored && (
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
            color: GOLD, backgroundColor: 'rgba(232,160,32,0.1)',
            border: '1px solid rgba(232,160,32,0.3)', borderRadius: 4, padding: '2px 8px',
          }}>
            Sponsored
          </span>
        )}
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginLeft: 'auto' }}>
          {timeAgo(listing.created_at, lang)}
        </span>
      </div>

      {/* Title */}
      <p style={{
        fontFamily: 'var(--font-spectral),Georgia,serif',
        fontSize: 18, fontWeight: 500, color: '#F4F4F5', lineHeight: 1.35, marginBottom: 8,
      }}>
        {listing.title}
      </p>

      {/* Description — 2-line clamp */}
      {listing.description && (
        <p style={{
          fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, marginBottom: 10,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical' as React.CSSProperties['WebkitBoxOrient'],
        }}>
          {listing.description}
        </p>
      )}

      {/* Meta: city · date_needed */}
      {(listing.city || listing.date_needed) && (
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 16 }}>
          {[
            listing.city,
            listing.date_needed
              ? new Date(listing.date_needed).toLocaleDateString('el-GR', { day: 'numeric', month: 'short', year: 'numeric' })
              : null,
          ].filter(Boolean).join(' · ')}
        </p>
      )}

      {/* Bottom: profile + interest button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link
          href={`/profile/${listing.profiles.username}`}
          style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
        >
          {listing.profiles.avatar_url ? (
            <img
              src={listing.profiles.avatar_url}
              alt=""
              style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              backgroundColor: 'rgba(232,160,32,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: GOLD }}>
                {initials(listing.profiles.display_name)}
              </span>
            </div>
          )}
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
            {listing.profiles.display_name}
          </span>
        </Link>
        <InterestButton listingId={listing.id} initialCount={0} />
      </div>
    </article>
  )
}
