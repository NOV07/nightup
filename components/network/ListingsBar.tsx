import InterestButton from '@/components/ui/InterestButton'

export interface Listing {
  id: string
  type: 'seeking' | 'offering'
  role: string
  title: string
  description: string | null
  city: string | null
  date_needed: string | null
  is_sponsored: boolean
  created_at: string
  profiles: {
    display_name: string
    username: string
  }
}

const GOLD = '#E8A020'

export default function ListingsBar({ listings }: { listings: Listing[] }) {
  if (listings.length === 0) return null

  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        overflowX: 'auto',
        paddingBottom: 6,
        scrollbarWidth: 'none',
      }}
      className="scrollbar-none"
    >
      {listings.map(listing => (
        <div
          key={listing.id}
          style={{
            width: 260,
            flexShrink: 0,
            backgroundColor: listing.is_sponsored ? 'rgba(232,160,32,0.04)' : '#1A1A28',
            border: `1px solid ${listing.is_sponsored ? 'rgba(232,160,32,0.35)' : 'rgba(255,255,255,0.06)'}`,
            borderRadius: 6,
            padding: 15,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {/* Top row: role + sponsored badge */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ color: GOLD, fontSize: 9.5, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
              {listing.role}
            </span>
            {listing.is_sponsored && (
              <span style={{
                fontSize: 9,
                fontWeight: 700,
                color: GOLD,
                backgroundColor: 'rgba(232,160,32,0.12)',
                border: '1px solid rgba(232,160,32,0.25)',
                borderRadius: 4,
                padding: '2px 6px',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}>
                Sponsored
              </span>
            )}
          </div>

          {/* Title */}
          <p
            className="line-clamp-2"
            style={{
              fontFamily: 'var(--font-spectral),Georgia,serif',
              fontSize: 16,
              fontWeight: 500,
              color: '#F4F4F5',
              lineHeight: 1.3,
            }}
          >
            {listing.title}
          </p>

          {/* Meta */}
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
            {[
              listing.city,
              listing.date_needed
                ? new Date(listing.date_needed).toLocaleDateString('el-GR', { day: 'numeric', month: 'short' })
                : null,
            ].filter(Boolean).join(' · ')}
          </p>

          {/* Bottom row: display_name + interest button */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 'auto' }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {listing.profiles.display_name}
            </span>
            <InterestButton listingId={listing.id} initialCount={0} />
          </div>
        </div>
      ))}
    </div>
  )
}
