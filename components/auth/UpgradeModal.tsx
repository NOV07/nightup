'use client'
import { useState } from 'react'

const SPECIALTIES = [
  'DJ / Producer',
  'Live Act',
  'Venue / Bar / Club',
  'Promoter',
  'Photographer / Videographer',
  'Άλλο',
]

export default function UpgradeModal({ onClose }: { onClose: () => void }) {
  const [specialty, setSpecialty] = useState('')
  const [bio, setBio] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    setLoading(true)
    setError('')

    const res = await fetch('/api/upgrade-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ specialty, bio }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error)
      return
    }

    setDone(true)
  }

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-[#E8A020]"

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0F0F1A] border border-[#E8A020]/30 rounded-xl p-8 w-full max-w-md relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/40 hover:text-white transition text-xl"
        >✕</button>

        {done ? (
          <div className="text-center py-6">
            <div className="text-4xl mb-4">🎯</div>
            <h2 className="text-xl font-bold text-white mb-2">Η αίτησή σου στάλθηκε!</h2>
            <p className="text-white/50 text-sm">Θα σου απαντήσουμε σύντομα στο email σου.</p>
            <button
              onClick={onClose}
              className="mt-6 text-[#E8A020] hover:underline text-sm"
            >Κλείσιμο</button>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-1">Γίνε Creator</h2>
              <p className="text-white/50 text-sm">Ανέβασε events, δημιούργησε network profile και releases.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-white/60 text-sm mb-1.5 block">Ειδικότητα</label>
                <select
                  value={specialty}
                  onChange={e => setSpecialty(e.target.value)}
                  className={inputClass}
                >
                  <option value="" disabled>Επίλεξε ειδικότητα...</option>
                  {SPECIALTIES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-white/60 text-sm mb-1.5 block">Σύντομο bio</label>
                <textarea
                  placeholder="Πες μας λίγα λόγια για σένα..."
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  rows={4}
                  className={`${inputClass} resize-none`}
                />
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <button
                onClick={handleSubmit}
                disabled={loading || !specialty || !bio.trim()}
                className="w-full bg-[#E8A020] text-black font-bold py-3 rounded-lg hover:bg-[#E8A020]/90 transition disabled:opacity-50"
              >
                {loading ? 'Αποστολή...' : 'Αποστολή αίτησης →'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
