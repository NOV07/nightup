'use client'
import { useState } from 'react'
import SpotFormSteps, { spotFormToPayload, type SpotFormData } from '@/components/spots/SpotFormSteps'
import { spotToForm } from '@/app/lib/spotForm'

/**
 * Admin edit of a spot: the owner's wizard, saved through the admin route so
 * the spot does not have to belong to the admin. Used inside the admin Edit
 * modal.
 */
export default function AdminSpotEdit({ spot, onSaved }: { spot: Record<string, any>; onSaved: () => void | Promise<void> }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(data: SpotFormData) {
    setLoading(true)
    setError('')
    const res = await fetch(`/api/admin/spots/${spot.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(spotFormToPayload(data)),
    })
    const json = await res.json().catch(() => ({}))
    setLoading(false)
    if (!res.ok) {
      setError(json.error ?? `Failed to save (HTTP ${res.status})`)
      return
    }
    await onSaved()
  }

  return (
    <SpotFormSteps
      key={`admin-edit-spot-${spot.id}`}
      initialData={spotToForm(spot)}
      onSubmit={handleSubmit}
      loading={loading}
      error={error}
      isEdit
    />
  )
}
