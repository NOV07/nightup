'use client'
import { useState } from 'react'
import EventCard from './EventCard'

interface EventTabsProps {
  thisWeekCards: any[]
  hotPopularCards: any[]
}

export default function EventTabs({ thisWeekCards, hotPopularCards }: EventTabsProps) {
  const [activeTab, setActiveTab] = useState<'week' | 'hot'>('week')

  const cards = activeTab === 'week' ? thisWeekCards : hotPopularCards

  return (
    <div>
      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        marginBottom: '20px',
      }}>
        {[
          { key: 'week', label: 'This Week' },
          { key: 'hot', label: 'Hot & Popular' },
        ].map(({ key, label }) => (
          <span
            key={key}
            onClick={() => setActiveTab(key as 'week' | 'hot')}
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '11px',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: activeTab === key ? 'var(--text-primary)' : 'var(--text-muted)',
              paddingBottom: '10px',
              marginRight: '20px',
              borderBottom: activeTab === key ? '1px solid var(--gold)' : '1px solid transparent',
              cursor: 'pointer',
              transition: 'color 0.2s',
            }}
          >{label}</span>
        ))}
      </div>

      {/* Cards */}
      <div
        key={activeTab}
        style={{
          animation: 'fadeSlideIn 0.25s ease-out',
        }}
      >
        {cards.length > 0 ? (
          <div className="ev-grid-responsive" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
            gap: '8px',
          }}>
            {cards.slice(0, 5).map((e: any) => (
              <EventCard key={e.id} {...e} badge={e.badge || undefined} />
            ))}
          </div>
        ) : (
          <p style={{
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            padding: '40px 0',
          }}>
            {activeTab === 'week' ? 'No events this week' : 'No featured events'}
          </p>
        )}
      </div>

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
