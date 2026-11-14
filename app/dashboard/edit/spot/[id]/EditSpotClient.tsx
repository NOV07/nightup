'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import SpotFormSteps, { spotFormToPayload, type SpotFormData } from '@/components/spots/SpotFormSteps'
import { spotToForm } from '@/app/lib/spotForm'
import { useLanguage } from '@/app/components/LanguageContext'

export default function EditSpotClient({ spot }: { spot: any }) {
  const { t } = useLanguage()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(data: SpotFormData) {
    setLoading(true)
    setError('')

    const res = await fetch(`/api/spots/${spot.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(spotFormToPayload(data)),
    })

    const json = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(json.error ?? t('spot_form_error_generic'))
      return
    }

    router.push('/dashboard?saved=spot')
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0F0F1A', padding: '32px 16px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'white', marginBottom: 4 }}>{t('spot_edit_heading')}</h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.50)' }}>{spot.name}</p>
        {!spot.is_published && (
          <p style={{ fontSize: 13, color: '#E8A020', marginTop: 10 }}>
            {t('spot_edit_pending')}
          </p>
        )}
      </div>
      <SpotFormSteps initialData={spotToForm(spot)} onSubmit={handleSubmit} loading={loading} error={error} isEdit />
    </div>
  )
}
