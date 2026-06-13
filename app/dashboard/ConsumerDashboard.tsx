'use client'
import { useState } from 'react'
import Link from 'next/link'

const GOLD = '#E8A020'
const SURFACE = '#1A1A28'
const BORDER = 'rgba(255,255,255,0.06)'

const GREEK_MONTHS = ['Ιαν', 'Φεβ', 'Μαρ', 'Απρ', 'Μαϊ', 'Ιουν', 'Ιουλ', 'Αυγ', 'Σεπ', 'Οκτ', 'Νοε', 'Δεκ']
const GREEK_DAYS   = ['Κυριακή', 'Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο']

type LibraryTab = 'events' | 'spots' | 'artists'

function daysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const d = new Date(dateStr); d.setHours(0, 0, 0, 0)
  return Math.round((d.getTime() - today.getTime()) / 86_400_000)
}

function upcomingLabel(dateStr: string): string {
  const n = daysUntil(dateStr)
  if (n === 0) return 'Σήμερα'
  if (n === 1) return 'Αύριο'
  if (n <= 6)  return GREEK_DAYS[new Date(dateStr).getDay()]
  return `σε ${n} μέρες`
}

function SectionTitle({ before, italicWord }: { before: string; italicWord: string }) {
  return (
    <h2 style={{ fontFamily: 'var(--font-spectral),Georgia,serif', fontWeight: 700, fontSize: 19, color: '#F4F4F5', margin: '0 0 16px 0' }}>
      {before}{' '}<em style={{ color: GOLD, fontStyle: 'italic' }}>{italicWord}</em>
    </h2>
  )
}

function EmptyState({ emoji, title, text, href, cta }: { emoji: string; title: string; text: string; href: string; cta: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
      <div style={{ fontSize: 30, marginBottom: 12 }}>{emoji}</div>
      <h3 style={{ fontFamily: 'var(--font-spectral),Georgia,serif', fontSize: 16, fontWeight: 700, color: '#F4F4F5', marginBottom: 8 }}>{title}</h3>
      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, marginBottom: 14 }}>{text}</p>
      <Link href={href} style={{ color: GOLD, fontSize: 12, fontWeight: 600 }}>{cta}</Link>
    </div>
  )
}

function UpcomingRow({ event, isLast }: { event: any; isLast: boolean }) {
  const [hovered, setHovered] = useState(false)
  const d = new Date(event.date)
  return (
    <Link
      href={`/events/${event.id}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '14px 16px',
        borderBottom: isLast ? 'none' : `1px solid ${BORDER}`,
        textDecoration: 'none',
        backgroundColor: hovered ? 'rgba(232,160,32,0.04)' : 'transparent',
        transition: 'background-color 0.15s',
      }}
    >
      {/* Date block */}
      <div style={{ width: 36, textAlign: 'center', flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--font-spectral),Georgia,serif', fontSize: 22, fontWeight: 700, color: GOLD, lineHeight: 1 }}>
          {d.getDate()}
        </div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 2, letterSpacing: '0.05em' }}>
          {GREEK_MONTHS[d.getMonth()]}
        </div>
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 36, backgroundColor: BORDER, flexShrink: 0 }} />

      {/* Event info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: '#F4F4F5', fontSize: 13.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {event.title}
        </p>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11.5, marginTop: 2 }}>
          {[event.venue, event.city].filter(Boolean).join(' · ')}
        </p>
      </div>

      {/* Days pill */}
      <div style={{
        fontSize: 11,
        fontWeight: 600,
        color: GOLD,
        flexShrink: 0,
        padding: '3px 10px',
        borderRadius: 99,
        border: '1px solid rgba(232,160,32,0.25)',
        backgroundColor: 'rgba(232,160,32,0.06)',
        whiteSpace: 'nowrap',
      }}>
        {upcomingLabel(event.date)}
      </div>
    </Link>
  )
}

function GridCard({ href, title, sub, accent }: { href: string; title: string; sub?: string; accent?: string }) {
  const [hovered, setHovered] = useState(false)
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          backgroundColor: SURFACE,
          border: `1px solid ${hovered ? 'rgba(232,160,32,0.3)' : BORDER}`,
          borderRadius: 6,
          padding: '12px 14px',
          transition: 'border-color 0.15s',
          height: '100%',
          boxSizing: 'border-box',
        }}
      >
        <p style={{ color: '#F4F4F5', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {title}
        </p>
        {sub && (
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {sub}
          </p>
        )}
        {accent && (
          <p style={{ color: GOLD, fontSize: 10.5, marginTop: 4 }}>{accent}</p>
        )}
      </div>
    </Link>
  )
}

interface Props {
  name: string
  savedEvents: any[]
  upcomingEvents: any[]
  savedSpots: any[]
  followedProfiles: any[]
}

export default function ConsumerDashboard({ name, savedEvents, upcomingEvents, savedSpots, followedProfiles }: Props) {
  const [activeTab, setActiveTab] = useState<LibraryTab>('events')

  const pillStyle = (active: boolean): React.CSSProperties => ({
    padding: '0.35rem 1rem',
    borderRadius: 99,
    fontSize: '0.78rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s',
    backgroundColor: active ? GOLD : 'transparent',
    color: active ? '#0F0F1A' : 'rgba(255,255,255,0.45)',
    border: active ? `1px solid ${GOLD}` : '1px solid rgba(255,255,255,0.1)',
  })

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', paddingTop: 32 }}>

      {/* Greeting */}
      <div style={{ marginBottom: 34 }}>
        <h1 style={{ fontFamily: 'var(--font-spectral),Georgia,serif', fontSize: 26, fontWeight: 700, color: '#F4F4F5', lineHeight: 1.25, marginBottom: 8 }}>
          Καλησπέρα,{' '}
          <em style={{ color: GOLD, fontStyle: 'italic' }}>{name}</em>
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>
          {savedEvents.length} saved events · {savedSpots.length} spots · {followedProfiles.length} artists
        </p>
      </div>

      {/* ── Έρχονται σύντομα ── */}
      <section>
        <SectionTitle before="Έρχονται" italicWord="σύντομα" />

        {upcomingEvents.length === 0 ? (
          <EmptyState
            emoji="🎫"
            title="Τίποτα μπροστά σου"
            text="Σώσε events για να τα βλέπεις εδώ"
            href="/events"
            cta="Εξερεύνησε events →"
          />
        ) : (
          <div style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 6, overflow: 'hidden' }}>
            {upcomingEvents.map((event: any, i: number) => (
              <UpcomingRow key={event.id} event={event} isLast={i === upcomingEvents.length - 1} />
            ))}
          </div>
        )}
      </section>

      {/* ── Η βιβλιοθήκη μου ── */}
      <section style={{ marginTop: 34 }}>
        <SectionTitle before="Η βιβλιοθήκη" italicWord="μου" />

        {/* Tab pills */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {([
            { key: 'events'  as LibraryTab, label: `Events (${savedEvents.length})` },
            { key: 'spots'   as LibraryTab, label: `Spots (${savedSpots.length})` },
            { key: 'artists' as LibraryTab, label: `Artists (${followedProfiles.length})` },
          ]).map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={pillStyle(activeTab === tab.key)}>
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'events' && (
          savedEvents.length === 0
            ? <EmptyState emoji="🎵" title="Καμία αποθήκευση ακόμα" text="Πάτα save σε events που σε ενδιαφέρουν" href="/events" cta="Εξερεύνησε events →" />
            : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                {savedEvents.map((event: any) => (
                  <GridCard
                    key={event.id}
                    href={`/events/${event.id}`}
                    title={event.title}
                    sub={[
                      event.date ? new Date(event.date).toLocaleDateString('el-GR', { day: 'numeric', month: 'short' }) : '',
                      event.venue,
                    ].filter(Boolean).join(' · ')}
                    accent={event.genre}
                  />
                ))}
              </div>
            )
        )}

        {activeTab === 'spots' && (
          savedSpots.length === 0
            ? <EmptyState emoji="🏛" title="Δεν έχεις spots ακόμα" text="Εξερεύνησε μαγαζιά και σώσε τα αγαπημένα σου" href="/spots" cta="Εξερεύνησε spots →" />
            : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                {savedSpots.map((spot: any) => (
                  <GridCard
                    key={spot.id}
                    href={`/spots/${spot.slug}`}
                    title={spot.name}
                    sub={[spot.category, spot.neighborhood].filter(Boolean).join(' · ')}
                    accent={spot.rating ? `★ ${spot.rating}` : undefined}
                  />
                ))}
              </div>
            )
        )}

        {activeTab === 'artists' && (
          followedProfiles.length === 0
            ? <EmptyState emoji="🎤" title="Κανένας artist ακόμα" text="Ακολούθησε artists, DJs και venues" href="/network" cta="Εξερεύνησε το Network →" />
            : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                {followedProfiles.map((p: any) => (
                  <GridCard
                    key={p.id}
                    href={`/profile/${p.username}`}
                    title={p.display_name}
                    sub={[p.network_category, p.location].filter(Boolean).join(' · ')}
                  />
                ))}
              </div>
            )
        )}
      </section>
    </div>
  )
}
