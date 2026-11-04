import T from '@/app/components/T'

export interface ProfileListing {
  id: string
  type: 'seeking' | 'offering' | string
  role?: string | null
  title: string
  description?: string | null
  city?: string | null
}

// Active listings of a profile. Data comes in as props; no queries here.
export default function ProfileListings({ listings }: { listings: ProfileListing[] }) {
  if (listings.length === 0) return null
  return (
    <div style={{ marginTop: 40 }}>
      <h2 style={{ fontFamily: 'var(--font-spectral),Georgia,serif', fontSize: 20, fontWeight: 500, color: '#F4F4F5', marginBottom: 16 }}>
        <T k="profile_listings_heading" />
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {listings.map((listing) => (
          <div key={listing.id} style={{
            backgroundColor: '#1A1A28',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 6,
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 16,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                {listing.role && (
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#E8A020' }}>
                    {listing.role}
                  </span>
                )}
                <span style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                  color: listing.type === 'seeking' ? '#60A5FA' : '#34D399',
                  backgroundColor: listing.type === 'seeking' ? 'rgba(96,165,250,0.08)' : 'rgba(52,211,153,0.08)',
                  border: `1px solid ${listing.type === 'seeking' ? 'rgba(96,165,250,0.2)' : 'rgba(52,211,153,0.2)'}`,
                  borderRadius: 4, padding: '2px 6px',
                }}>
                  <T k={listing.type === 'seeking' ? 'listings_seeking' : 'listings_offering'} />
                </span>
              </div>
              <p style={{ fontFamily: 'var(--font-spectral),Georgia,serif', fontSize: 16, fontWeight: 500, color: '#F4F4F5', marginBottom: 4 }}>
                {listing.title}
              </p>
              {listing.description && (
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>{listing.description}</p>
              )}
              {listing.city && (
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 6 }}>{listing.city}</p>
              )}
            </div>
            <a href="/network/listings" style={{ fontSize: 12, color: '#E8A020', textDecoration: 'none', flexShrink: 0, paddingTop: 2 }}>
              <T k="profile_express_interest" />
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}
