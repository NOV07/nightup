'use client'
import Link from 'next/link'
import { CITIES, CITY_LABELS } from '@/app/lib/searchData'
import { useLanguage } from '@/app/components/LanguageContext'

const GOLD = '#E8A020'
const NAVY = '#0F0F1A'
const BORDER = 'rgba(232,160,32,0.12)'

export type NetworkTab = 'Artists' | 'Venues' | 'Professionals'

export const TAB_META: Record<NetworkTab, { emoji: string; label: string; slug: string }> = {
  Artists:       { emoji: '🎵', label: 'Artists',       slug: 'artists' },
  Venues:        { emoji: '🏛', label: 'Venues',        slug: 'venues' },
  Professionals: { emoji: '🤝', label: 'Professionals', slug: 'professionals' },
}

export const pillStyle = (active: boolean) => ({
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

// Subcategory filter row — the pills from the old in-page full view.
export function CategoryPills({
  options,
  active,
  onChange,
}: {
  options: readonly string[]
  active: string
  onChange: (value: string) => void
}) {
  const { t } = useLanguage()
  return (
    <div className="relative">
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button onClick={() => onChange('')} style={pillStyle(!active)}>
          {t('network_all')}
        </button>
        {options.map(sub => (
          <button
            key={sub}
            onClick={() => onChange(active === sub ? '' : sub)}
            style={pillStyle(active === sub)}
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
  )
}

interface Props {
  tab: NetworkTab
  subtitle: string
  city: string
  onCityChange: (city: string) => void
  resultCount: number
  /** Shown next to the result count, mirroring the old full view. */
  activeCategory?: string
  /** Subcategory pills row; omitted for tabs without a taxonomy (Venues). */
  pills?: React.ReactNode
  /** Whether any filter is set, so the empty state can offer a reset. */
  canClear?: boolean
  onClear?: () => void
  children: React.ReactNode
}

export default function CategoryPageLayout({
  tab, subtitle, city, onCityChange, resultCount, activeCategory, pills, canClear, onClear, children,
}: Props) {
  const { t } = useLanguage()

  return (
    <div style={{ minHeight: '100vh', backgroundColor: NAVY, paddingTop: 80 }}>

      {/* Header */}
      <div className="max-w-6xl mx-auto px-4 pt-8 pb-6">
        <Link
          href="/network"
          className="text-xs transition-colors hover:text-white"
          style={{ color: 'rgba(255,255,255,0.45)' }}
        >
          ← Network
        </Link>
        <h1
          style={{
            fontFamily: 'var(--font-spectral),Georgia,serif',
            fontSize: 34,
            fontWeight: 500,
            color: '#F4F4F5',
            lineHeight: 1.2,
            marginTop: 14,
          }}
        >
          {TAB_META[tab].label}
        </h1>
        <p style={{ marginTop: 10, fontSize: 14, color: 'rgba(255,255,255,0.45)', maxWidth: 560 }}>
          {subtitle}
        </p>
      </div>

      {/* Sticky filter bar — tabs + city, then the optional pills row */}
      <div
        className="sticky z-10 border-b"
        style={{ top: 56, backgroundColor: 'rgba(15,15,26,0.95)', backdropFilter: 'blur(8px)', borderColor: BORDER }}
      >
        <div className="max-w-6xl mx-auto px-4 py-3 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none min-w-0 flex-1">
              {(Object.keys(TAB_META) as NetworkTab[]).map(key => (
                <Link key={key} href={`/network/${TAB_META[key].slug}`} style={pillStyle(tab === key)}>
                  {TAB_META[key].emoji} {TAB_META[key].label}
                </Link>
              ))}
            </div>
            <select
              value={city}
              onChange={e => onCityChange(e.target.value)}
              className="outline-none flex-shrink-0"
              style={{
                backgroundColor: '#1A1A28',
                color: city ? 'white' : 'rgba(255,255,255,0.4)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 6,
                fontSize: '0.8rem',
                padding: '0.4rem 0.75rem',
              }}
            >
              <option value="">{t('network_all_cities')}</option>
              {CITIES.slice(1).map(c => <option key={c} value={c}>{CITY_LABELS[c] ?? c}</option>)}
            </select>
          </div>

          {pills}
        </div>
      </div>

      {/* Results */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="mb-5">
          <p className="text-xs text-white/30">
            {resultCount} {resultCount === 1 ? t('network_results_one') : t('network_results_many')}
            {activeCategory && <span> · {activeCategory}</span>}
            {city && <span> · {CITY_LABELS[city] ?? city}</span>}
          </p>
        </div>

        {resultCount > 0 ? children : (
          <div className="text-center py-20">
            <p className="text-white/30 text-sm mb-2">{t('network_no_results')}</p>
            {canClear && (
              <button
                onClick={onClear}
                className="text-xs hover:underline mt-2"
                style={{ color: GOLD }}
              >
                {t('network_clear')}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
