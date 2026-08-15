'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import VenueFormSteps, {
  profileToVenueForm, venueFormToPayload, type VenueFormData,
} from '@/components/venue/VenueFormSteps'
import { useLanguage } from '@/app/components/LanguageContext'

export default function VenueProfileClient({ profile }: { profile: any }) {
  const { t } = useLanguage()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  async function handleSubmit(data: VenueFormData) {
    setLoading(true)
    setError('')

    const { error } = await supabase
      .from('profiles')
      .update(venueFormToPayload(data))
      .eq('id', profile.id)

    setLoading(false)

    if (error) {
      // The address columns ship in a migration that has to be run by hand, so
      // name it rather than surfacing a bare PostgREST "column does not exist".
      setError(
        /venue_address|venue_neighborhood/.test(error.message)
          ? 'Λείπουν στήλες από τη βάση. Τρέξε το migration 20260808040000_venue_address_fields.sql και δοκίμασε ξανά.'
          : error.message
      )
      return
    }

    router.push('/dashboard?saved=venue')
    router.refresh()
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0F0F1A', padding: '32px 16px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', marginBottom: 32 }}>
        <Link href="/dashboard" style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', textDecoration: 'none' }}>
          ← Dashboard
        </Link>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'white', margin: '10px 0 4px' }}>
          {t('venue_client_title')}
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.50)' }}>
          {t('venue_client_sub')}
        </p>
      </div>

      <VenueFormSteps
        profileId={profile.id}
        username={profile.username}
        isVerified={!!profile.is_verified}
        initialData={profileToVenueForm(profile)}
        onSubmit={handleSubmit}
        loading={loading}
        error={error}
      />
    </div>
  )
}
