'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import SpotFormSteps, { spotFormToPayload, type SpotFormData } from '@/components/spots/SpotFormSteps'

export default function NewSpotClient() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(data: SpotFormData) {
    setLoading(true)
    setError('')

    const res = await fetch('/api/spots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(spotFormToPayload(data)),
    })

    const json = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(json.error ?? 'Κάτι πήγε στραβά. Δοκίμασε ξανά.')
      return
    }

    router.push('/dashboard?submitted=spot')
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0F0F1A', padding: '32px 16px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'white', marginBottom: 4 }}>Καταχώρησε το spot σου</h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.50)' }}>
          Θα ελεγχθεί από την ομάδα μας πριν δημοσιευτεί.
        </p>
      </div>
      <SpotFormSteps onSubmit={handleSubmit} loading={loading} error={error} />
    </div>
  )
}
