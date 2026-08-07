'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import SpotFormSteps, {
  spotFormToPayload, deserializeOpeningHours, type SpotFormData,
} from '@/components/spots/SpotFormSteps'

/** The stored row, back into the wizard's state shape. */
function spotToForm(spot: any): Partial<SpotFormData> {
  const hasCrop = spot.crop_x != null && spot.crop_y != null && spot.crop_width != null && spot.crop_height != null
  return {
    name: spot.name ?? '',
    category: spot.category ?? '',
    subcategory: spot.subcategory ?? '',
    city: spot.city ?? '',
    neighborhood: spot.neighborhood ?? '',
    address: spot.address ?? '',
    // The pasted URL is not stored, but lat/lng are — rebuild a link that
    // satisfies the step-2 coordinate check so an edit does not have to redo it.
    maps_url: spot.lat != null && spot.lng != null ? `https://www.google.com/maps/@${spot.lat},${spot.lng},17z` : '',
    lat: spot.lat ?? null,
    lng: spot.lng ?? null,
    cover_image: spot.cover_image ?? '',
    crop: hasCrop
      ? { crop_x: spot.crop_x, crop_y: spot.crop_y, crop_width: spot.crop_width, crop_height: spot.crop_height }
      : null,
    gallery: Array.isArray(spot.gallery) ? spot.gallery : [],
    opening_hours: deserializeOpeningHours(spot.opening_hours),
    phone: spot.phone ?? '',
    website: spot.website ?? '',
    instagram: spot.instagram ?? '',
    price_level: spot.price_level ?? 0,
    description: spot.description ?? '',
  }
}

export default function EditSpotClient({ spot }: { spot: any }) {
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
      setError(json.error ?? 'Κάτι πήγε στραβά. Δοκίμασε ξανά.')
      return
    }

    router.push('/dashboard?saved=spot')
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0F0F1A', padding: '32px 16px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'white', marginBottom: 4 }}>Επεξεργασία spot</h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.50)' }}>{spot.name}</p>
        {!spot.is_published && (
          <p style={{ fontSize: 13, color: '#E8A020', marginTop: 10 }}>
            Σε αναμονή έγκρισης — δεν εμφανίζεται ακόμα δημόσια.
          </p>
        )}
      </div>
      <SpotFormSteps initialData={spotToForm(spot)} onSubmit={handleSubmit} loading={loading} error={error} isEdit />
    </div>
  )
}
