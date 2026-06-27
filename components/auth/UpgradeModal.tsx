'use client'
import { useState } from 'react'
import { useLanguage } from '@/app/components/LanguageContext'

const TYPES_BASE = [
  { id: 'organiser', emoji: '🎪', label: 'Event Organiser', sub: null as string[] | null },
  { id: 'artist',    emoji: '🎵', label: 'Artist',          sub: ['DJ', 'Live Act', 'Singer', 'MC'] },
  { id: 'spot',      emoji: '📍', label: 'Spot',            sub: null as string[] | null },
  { id: 'professional', emoji: '🤝', label: 'Professional', sub: null as string[] | null },
]

export default function UpgradeModal({ onClose }: { onClose: () => void }) {
  const { t } = useLanguage()
  const profSubs = t("upgrade_prof_cat").split(",")
  const TYPES = TYPES_BASE.map(type =>
    type.id === 'professional' ? { ...type, sub: profSubs } : type
  )
  const [step, setStep] = useState<'type' | 'sub' | 'bio'>('type')
  const [selectedType, setSelectedType] = useState<string>('')
  const [selectedSub, setSelectedSub] = useState<string>('')
  const [bio, setBio] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const currentType = TYPES.find(t => t.id === selectedType)

  function handleTypeSelect(id: string) {
    setSelectedType(id)
    const t = TYPES.find(t => t.id === id)
    if (t?.sub) {
      setStep('sub')
    } else {
      setStep('bio')
    }
  }

  function handleBack() {
    if (step === 'sub') { setStep('type'); setSelectedSub('') }
    if (step === 'bio') { currentType?.sub ? setStep('sub') : setStep('type') }
  }

  async function handleSubmit() {
    setLoading(true)
    setError('')
    const specialty = selectedSub
      ? `${currentType?.label} — ${selectedSub}`
      : currentType?.label || ''
    const res = await fetch('/api/upgrade-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ specialty, bio }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error); return }
    setDone(true)
  }

  const gold = '#E8A020'
  const surface = '#1A1A28'
  const border = 'rgba(232,160,32,0.15)'

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-md relative" style={{ backgroundColor: '#0F0F1A', border: '1px solid rgba(232,160,32,0.25)', borderRadius: 6, padding: '2rem' }}>

        {/* Close */}
        <button onClick={onClose} className="absolute top-4 right-4 text-white/40 hover:text-white transition text-xl">✕</button>

        {done ? (
          <div className="text-center py-6">
            <div className="text-4xl mb-4">🎯</div>
            <h2 className="text-xl font-bold text-white mb-2">{t("upgrade_submitted")}</h2>
            <p className="text-white/50 text-sm">{t("upgrade_reply")}</p>
            <button onClick={onClose} className="mt-6 text-sm hover:underline" style={{ color: gold }}>{t("upgrade_close")}</button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="mb-6">
              {step !== 'type' && (
                <button onClick={handleBack} className="text-white/40 hover:text-white text-sm mb-3 flex items-center gap-1 transition">
                  {t("upgrade_back")}
                </button>
              )}
              <h2 className="text-xl font-bold text-white">
                {step === 'type' && 'Γίνε Creator'}
                {step === 'sub' && currentType?.label}
                {step === 'bio' && 'Σχεδόν έτοιμος'}
              </h2>
              <p className="text-white/40 text-sm mt-1">
                {step === 'type' && 'Τι τύπος creator είσαι;'}
                {step === 'sub' && 'Επίλεξε ειδικότητα'}
                {step === 'bio' && `${currentType?.label}${selectedSub ? ` · ${selectedSub}` : ''}`}
              </p>
            </div>

            {/* Step 1 — Type tiles */}
            {step === 'type' && (
              <div className="grid grid-cols-2 gap-3">
                {TYPES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => handleTypeSelect(t.id)}
                    className="flex flex-col items-center justify-center gap-2 py-5 transition-all"
                    style={{
                      backgroundColor: surface,
                      border: `1px solid ${border}`,
                      borderRadius: 6,
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = gold
                      ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(232,160,32,0.06)'
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = border
                      ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = surface
                    }}
                  >
                    <span className="text-2xl">{t.emoji}</span>
                    <span className="text-white text-sm font-medium">{t.label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Step 2 — Subcategory tiles */}
            {step === 'sub' && currentType?.sub && (
              <div className="grid grid-cols-2 gap-3">
                {currentType.sub.map(s => (
                  <button
                    key={s}
                    onClick={() => { setSelectedSub(s); setStep('bio') }}
                    className="flex items-center justify-center py-4 text-sm font-medium text-white transition-all"
                    style={{
                      backgroundColor: surface,
                      border: `1px solid ${border}`,
                      borderRadius: 6,
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = gold
                      ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(232,160,32,0.06)'
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = border
                      ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = surface
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Step 3 — Bio */}
            {step === 'bio' && (
              <div className="space-y-4">
                <textarea
                  placeholder="Πες μας λίγα λόγια για σένα..."
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  rows={4}
                  className="w-full resize-none text-white placeholder:text-white/40 focus:outline-none"
                  style={{
                    backgroundColor: surface,
                    border: `1px solid ${border}`,
                    borderRadius: 6,
                    padding: '0.75rem 1rem',
                    fontSize: '0.875rem',
                  }}
                  onFocus={e => (e.target.style.borderColor = gold)}
                  onBlur={e => (e.target.style.borderColor = border)}
                />
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <button
                  onClick={handleSubmit}
                  disabled={loading || !bio.trim()}
                  className="w-full font-bold py-3 transition-opacity disabled:opacity-50"
                  style={{ backgroundColor: gold, color: '#0F0F1A', borderRadius: 6 }}
                >
                  {loading ? 'Αποστολή...' : 'Αποστολή αίτησης →'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
