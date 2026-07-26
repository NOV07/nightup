'use client'
import { useState } from 'react'
import { NETWORK } from '@/app/lib/searchData'
import { useLanguage } from '@/app/components/LanguageContext'
import type { Profile } from '@/app/lib/networkProfile'
import ProfileCard from '@/components/network/ProfileCard'
import CategoryPageLayout, { CategoryPills } from '@/components/network/CategoryPageLayout'

const GOLD = '#E8A020'
const BLUE = '#60A5FA'

const FOR_EVENTS_ROLES = Object.keys(NETWORK.Professionals['For Events'])
const FOR_ARTISTS_ROLES = Object.keys(NETWORK.Professionals['For Artists'])

// The pills stay flat — both sub-groups in one filter row — while the grid
// below keeps them grouped.
const SUBCATEGORIES = [...FOR_EVENTS_ROLES, ...FOR_ARTISTS_ROLES]

const inGroup = (roles: string[], p: Profile) => roles.includes(p.network_category ?? '')

function renderGrid(list: Profile[]) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {list.map(p => <ProfileCard key={p.id} profile={p} />)}
    </div>
  )
}

function groupSection(label: string, color: string, list: Profile[]) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color }}>{label}</span>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
      </div>
      {renderGrid(list)}
    </div>
  )
}

export default function ProfessionalsPageClient({ profiles }: { profiles: Profile[] }) {
  const { t } = useLanguage()
  const [category, setCategory] = useState('')
  const [city, setCity] = useState('')

  const filtered = profiles.filter(p => {
    if (category && p.network_category !== category) return false
    if (city && !(p.location ?? '').toLowerCase().includes(city.toLowerCase())) return false
    return true
  })

  const forEvents = filtered.filter(p => inGroup(FOR_EVENTS_ROLES, p))
  const forArtists = filtered.filter(p => inGroup(FOR_ARTISTS_ROLES, p))
  const ungrouped = filtered.filter(p => !inGroup(FOR_EVENTS_ROLES, p) && !inGroup(FOR_ARTISTS_ROLES, p))

  return (
    <CategoryPageLayout
      tab="Professionals"
      subtitle={t('network_gate_pros_desc')}
      city={city}
      onCityChange={setCity}
      resultCount={filtered.length}
      activeCategory={category}
      canClear={!!(category || city)}
      onClear={() => { setCategory(''); setCity('') }}
      pills={<CategoryPills options={SUBCATEGORIES} active={category} onChange={setCategory} />}
    >
      <div className="space-y-9">
        {forEvents.length > 0 && groupSection(t('network_group_for_events'), BLUE, forEvents)}
        {forArtists.length > 0 && groupSection(t('network_group_for_artists'), GOLD, forArtists)}
        {ungrouped.length > 0 && renderGrid(ungrouped)}
      </div>
    </CategoryPageLayout>
  )
}
