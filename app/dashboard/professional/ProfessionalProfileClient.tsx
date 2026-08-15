'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import ProfessionalFormSteps, {
  profileToProForm, proFormToPayload, type ProfessionalFormData,
} from '@/components/professional/ProfessionalFormSteps'
import { useLanguage } from '@/app/components/LanguageContext'

export default function ProfessionalProfileClient({ profile }: { profile: any }) {
  const { t } = useLanguage()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  async function handleSubmit(data: ProfessionalFormData) {
    setLoading(true)
    setError('')

    // Single write to `profiles` — professionals no longer have a parallel row.
    const { error } = await supabase
      .from('profiles')
      .update(proFormToPayload(data))
      .eq('id', profile.id)

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    router.push('/dashboard?saved=professional')
    router.refresh()
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0F0F1A', padding: '32px 16px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', marginBottom: 32 }}>
        <Link href="/dashboard" style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', textDecoration: 'none' }}>
          ← Dashboard
        </Link>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'white', margin: '10px 0 4px' }}>
          {t('pro_client_title')}
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.50)' }}>
          {t('pro_client_sub')}
        </p>
      </div>

      <ProfessionalFormSteps
        profileId={profile.id}
        username={profile.username}
        isVerified={!!profile.is_verified}
        initialData={profileToProForm(profile)}
        onSubmit={handleSubmit}
        loading={loading}
        error={error}
      />
    </div>
  )
}
