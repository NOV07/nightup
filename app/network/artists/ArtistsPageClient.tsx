'use client'
import { useState } from 'react'
import { NETWORK } from '@/app/lib/searchData'
import { useLanguage } from '@/app/components/LanguageContext'
import type { Profile } from '@/app/lib/networkProfile'
import ProfileCard from '@/components/network/ProfileCard'
import CategoryPageLayout, { CategoryPills } from '@/components/network/CategoryPageLayout'

const SUBCATEGORIES = Object.keys(NETWORK.Artists)

export default function ArtistsPageClient({ profiles }: { profiles: Profile[] }) {
  const { t } = useLanguage()
  const [category, setCategory] = useState('')
  const [city, setCity] = useState('')

  const filtered = profiles.filter(p => {
    if (category && p.network_category !== category) return false
    if (city && !(p.location ?? '').toLowerCase().includes(city.toLowerCase())) return false
    return true
  })

  return (
    <CategoryPageLayout
      tab="Artists"
      subtitle={t('network_gate_artists_desc')}
      city={city}
      onCityChange={setCity}
      resultCount={filtered.length}
      activeCategory={category}
      canClear={!!(category || city)}
      onClear={() => { setCategory(''); setCity('') }}
      pills={<CategoryPills options={SUBCATEGORIES} active={category} onChange={setCategory} />}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(p => <ProfileCard key={p.id} profile={p} />)}
      </div>
    </CategoryPageLayout>
  )
}
