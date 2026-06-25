'use client'
import { useState } from 'react'
import HotEventCard from './HotEventCard'

const MUSIC_GENRES = [
  'Techno', 'House', 'Hip-Hop', 'R&B', 'Drum & Bass', 'Disco',
  'Funk', 'Jazz', 'Rock', 'Metal', 'Pop', 'Electronic', 'Ambient',
  'Reggae', 'Soul', 'Latin',
]

interface EventTabsProps {
  thisWeekCards: any[]
  hotPopularCards: any[]
}

export default function EventTabs({ thisWeekCards, hotPopularCards }: EventTabsProps) {
  const [activeTab, setActiveTab] = useState<'week' | 'hot'>('week')
  const cards = activeTab === 'week' ? thisWeekCards : hotPopularCards

  return (
    <div>
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .ev-tab-anim { animation: fadeSlideIn 0.25s ease-out; }
        .ev-scroll {
          display: flex;
          overflow-x: auto;
          gap: 12px;
          padding-bottom: 12px;
          scroll-snap-type: x mandatory;
          scrollbar-width: none;
        }
        .ev-scroll::-webkit-scrollbar { display: none; }
        .ev-card {
          flex-shrink: 0;
          scroll-snap-align: start;
          width: calc(25% - 9px);
          position: relative;
        }
        @media (max-width: 640px) {
          .ev-card { width: calc(70% - 9px); }
        }
        .ev-fade {
          position: absolute;
          right: 0;
          top: 0;
          bottom: 12px;
          width: 48px;
          background: linear-gradient(to left, #0F0F1A, transparent);
          pointer-events: none;
          z-index: 10;
        }
        .ev-badge {
          position: absolute;
          top: 8px;
          right: 8px;
          z-index: 20;
          background: rgba(0,0,0,0.75);
          color: #fff;
          font-size: 9px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          padding: 4px 8px;
          border-radius: 4px;
          pointer-events: none;
          font-family: var(--font-mono), monospace;
        }
      `}</style>

      {/* Tab bar */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        marginBottom: '20px',
      }}>
        {([
          { key: 'week', label: 'This Week' },
          { key: 'hot',  label: 'Hot & Popular' },
        ] as const).map(({ key, label }) => (
          <span
            key={key}
            onClick={() => setActiveTab(key)}
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
          >
            {label}
          </span>
        ))}
      </div>

      {/* Cards */}
      {cards.length > 0 ? (
        <div key={activeTab} className="ev-tab-anim" style={{ position: 'relative' }}>
          <div className="ev-scroll">
            {cards.slice(0, 8).map((e: any) => {
              const isMusic = MUSIC_GENRES.includes(e.genre)
              const showBadge = !isMusic && Boolean(e.category)
              return (
                <div key={e.id} className="ev-card">
                  <HotEventCard
                    id={e.id}
                    title={e.title}
                    image={e.image_url || e.image}
                    genre={e.genre}
                    price={e.price}
                    date={e.date}
                    time={e.time}
                    venue={e.venue}
                    city={e.city}
                    isRadarPick={e.isRadarPick || e.badge === 'Nightup Radar'}
                    showHotBadge={activeTab === 'hot'}
                    variant="compact"
                  />
                  {showBadge && (
                    <span className="ev-badge">{e.category}</span>
                  )}
                </div>
              )
            })}
          </div>
          <div className="ev-fade" />
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
  )
}
