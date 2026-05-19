'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SubmitEventForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    title: '',
    description: '',
    venue: '',
    city: '',
    date: '',
    time: '',
    genre: '',
    ticket_url: '',
    image_url: '',
    contact_email: '',
    instagram: '',
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error)
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-[#E8A020]"

  return (
    <div className="min-h-screen bg-[#0F0F1A] p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Submit Event</h1>
          <p className="text-white/50">Your event will be reviewed before going live</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          <div>
            <label className="text-white/60 text-sm mb-1.5 block">Event Title *</label>
            <input name="title" placeholder="e.g. Void Night Vol.3" onChange={handleChange} className={inputClass} required />
          </div>

          <div>
            <label className="text-white/60 text-sm mb-1.5 block">Description</label>
            <textarea name="description" placeholder="Tell us about your event..." onChange={handleChange} rows={4} className={`${inputClass} resize-none`} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-white/60 text-sm mb-1.5 block">Venue *</label>
              <input name="venue" placeholder="e.g. Club Void" onChange={handleChange} className={inputClass} required />
            </div>
            <div>
              <label className="text-white/60 text-sm mb-1.5 block">City</label>
              <input name="city" placeholder="e.g. Athens" onChange={handleChange} className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-white/60 text-sm mb-1.5 block">Date *</label>
              <input name="date" type="date" onChange={handleChange} className={inputClass} required />
            </div>
            <div>
              <label className="text-white/60 text-sm mb-1.5 block">Time</label>
              <input name="time" placeholder="e.g. 23:00" onChange={handleChange} className={inputClass} />
            </div>
          </div>

          <div>
            <label className="text-white/60 text-sm mb-1.5 block">Genre</label>
            <input name="genre" placeholder="e.g. Techno, House, R&B" onChange={handleChange} className={inputClass} />
          </div>

          <div>
            <label className="text-white/60 text-sm mb-1.5 block">Ticket URL</label>
            <input name="ticket_url" placeholder="https://..." onChange={handleChange} className={inputClass} />
          </div>

          <div>
            <label className="text-white/60 text-sm mb-1.5 block">Cover Image URL</label>
            <input name="image_url" placeholder="https://..." onChange={handleChange} className={inputClass} />
          </div>

          <div>
            <label className="text-white/60 text-sm mb-1.5 block">Contact Email</label>
            <input name="contact_email" type="email" placeholder="your@email.com" onChange={handleChange} className={inputClass} />
          </div>

          <div>
            <label className="text-white/60 text-sm mb-1.5 block">Instagram</label>
            <input name="instagram" placeholder="@handle" onChange={handleChange} className={inputClass} />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 border border-white/20 text-white py-3 rounded-lg hover:bg-white/5 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-[#E8A020] text-black font-bold py-3 rounded-lg hover:bg-[#E8A020]/90 transition disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit Event →'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}
