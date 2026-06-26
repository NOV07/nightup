'use client'
import { useState, useRef, useEffect } from 'react'
import HotEventCard from './HotEventCard'

function getBorderColor(e: any): string {
  if (e.type === 'culture') return '#7C3AED'
  if (e.type === 'sports')  return '#2563EB'
  if (e.type === 'other')   return '#059669'
  return '#E8A020'
}

interface EventTabsProps {
  thisWeekCards: any[]
  hotPopularCards: any[]
}

export default function EventTabs({ thisWeekCards, hotPopularCards }: EventTabsProps) {
  const [activeTab, setActiveTab] = useState<'week' | 'hot'>('week')
  const cards = activeTab === 'week' ? thisWeekCards : hotPopularCards
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  function updateScrollState() {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 0)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1)
  }

  useEffect(() => { updateScrollState() }, [cards])

  function scrollBy(dx: number) {
    scrollRef.current?.scrollBy({ left: dx, behavior: 'smooth' })
  }

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
        .ev-arrow {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #1A1A28;
          border: 1px solid rgba(255,255,255,0.15);
          color: #E8A020;
          font-size: 16px;
          cursor: pointer;
          z-index: 20;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s, color 0.2s;
          padding: 0;
        }
        .ev-arrow:hover { background: #E8A020; color: #0A0A12; }
        .ev-arrow-left  { left: -16px; }
        .ev-arrow-right { right: -16px; }
        @media (max-width: 640px) { .ev-arrow { display: none; } }
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
          {canScrollLeft && (
            <button className="ev-arrow ev-arrow-left" onClick={() => scrollBy(-300)} aria-label="Previous">‹</button>
          )}
          {canScrollRight && (
            <button className="ev-arrow ev-arrow-right" onClick={() => scrollBy(300)} aria-label="Next">›</button>
          )}
          <div className="ev-scroll" ref={scrollRef} onScroll={updateScrollState}>
            {cards.slice(0, 8).map((e: any) => (
              <div
                key={e.id}
                className="ev-card"
                style={{
                  borderBottom: `2px solid ${getBorderColor(e)}`,
                  borderRadius: '0 0 6px 6px',
                }}
              >
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
              </div>
            ))}
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
