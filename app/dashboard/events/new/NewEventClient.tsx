'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import EventFormSteps, { EventFormData } from '../../../../components/events/EventFormSteps'

export default function NewEventClient() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(data: EventFormData) {
    setLoading(true)
    setError('')

    const lineup = data.lineup
      ? data.lineup.split(',').map(s => s.trim()).filter(Boolean)
      : []

    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title:             data.title,
        genres:            data.genres,
        type:              data.type || null,
        short_description: data.short_description,
        full_description:  data.full_description || null,
        date:              data.date,
        time:              data.start_time,
        end_time:          data.end_time || null,
        venue:             data.venue,
        city:              data.city,
        address:           data.address || null,
        maps_url:          data.maps_url || null,
        image_url:         data.image_url || null,
        ticket_url:        data.ticket_url || null,
        price:             data.price ? `€${data.price}` : null,
        age_restriction:   data.age_restriction,
        dress_code:        data.dress_code || null,
        lineup,
        instagram:         data.instagram || null,
        facebook:          data.facebook || null,
        tiktok:            data.tiktok || null,
        contact_email:     data.contact_email,
      }),
    })

    const json = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(json.error ?? 'Something went wrong')
      return
    }

    router.push('/dashboard?submitted=event')
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0F0F1A', padding: '32px 16px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'white', marginBottom: 4 }}>New Event</h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)' }}>Fill in the details below. Your event will be reviewed before going live.</p>
      </div>
      <EventFormSteps onSubmit={handleSubmit} loading={loading} error={error} />
    </div>
  )
}
