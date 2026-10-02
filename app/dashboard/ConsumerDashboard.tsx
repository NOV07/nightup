'use client'
import { useLanguage } from '@/app/components/LanguageContext'
import MyLibrary from './MyLibrary'

const GOLD = '#E8A020'

interface Props {
  name: string
  savedEvents: any[]
  upcomingEvents: any[]
  savedSpots: any[]
  followedProfiles: any[]
}

export default function ConsumerDashboard({ name, savedEvents, upcomingEvents, savedSpots, followedProfiles }: Props) {
  const { t } = useLanguage()

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', paddingTop: 32 }}>

      {/* Greeting */}
      <div style={{ marginBottom: 34 }}>
        <h1 style={{ fontFamily: 'var(--font-spectral),Georgia,serif', fontSize: 26, fontWeight: 700, color: '#F4F4F5', lineHeight: 1.25, marginBottom: 8 }}>
          {t('dashboard_greeting')},{' '}
          <em style={{ color: GOLD, fontStyle: 'italic' }}>{name}</em>
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.50)', fontSize: 13 }}>
          {savedEvents.length} {t('dashboard_stat_saved_events')} · {savedSpots.length} {t('dashboard_stat_spots')} · {followedProfiles.length} {t('dashboard_stat_artists')}
        </p>
      </div>

      <MyLibrary
        savedEvents={savedEvents}
        upcomingEvents={upcomingEvents}
        savedSpots={savedSpots}
        followedProfiles={followedProfiles}
      />
    </div>
  )
}
