'use client'
import { useState } from 'react'
import { useLanguage } from '@/app/components/LanguageContext'
import type { Profile } from '@/app/lib/networkProfile'
import ProfileCard from '@/components/network/ProfileCard'
import CategoryPageLayout from '@/components/network/CategoryPageLayout'

// Venues has no subcategory taxonomy in NETWORK yet, so the pills row is
// omitted and city is the only filter.
export default function VenuesPageClient({ profiles }: { profiles: Profile[] }) {
  const { t } = useLanguage()
  const [city, setCity] = useState('')

  const filtered = profiles.filter(p =>
    !city || (p.location ?? '').toLowerCase().includes(city.toLowerCase())
  )

  return (
    <CategoryPageLayout
      tab="Venues"
      subtitle={t('network_gate_venues_desc')}
      city={city}
      onCityChange={setCity}
      resultCount={filtered.length}
      canClear={!!city}
      onClear={() => setCity('')}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(p => <ProfileCard key={p.id} profile={p} />)}
      </div>
    </CategoryPageLayout>
  )
}
