'use client'

import { useState } from 'react'

const GOLD = '#E8A020'

export interface EventsFilterResult {
  when: string
  mood: string
  city: string
}

interface EventsFilterModalProps {
  onClose: () => void
  onApply: (result: EventsFilterResult) => void
}

const WHEN_OPTIONS = ['Απόψε', 'Αύριο', 'Σαββατοκύριακο']
const MOOD_OPTIONS = ['Μουσική & Club', 'Ποτό & Παρέα', 'Θέαμα', 'Έκπληξέ με']
const CITY_OPTIONS = ['Αθήνα', 'Θεσσαλονίκη', 'Όλη η Ελλάδα']

const STEP_SUBTITLES: Record<number, string> = {
  1: 'Πότε θες να βγεις;',
  2: 'Τι mood;',
  3: 'Πού;',
}

export default function EventsFilterModal({ onClose, onApply }: EventsFilterModalProps) {
  const [step, setStep] = useState(1)
  const [when, setWhen] = useState<string | null>(null)
  const [mood, setMood] = useState<string | null>(null)
  const [city, setCity] = useState<string | null>(null)

  const tileStyle = (active: boolean): React.CSSProperties => ({
    padding: '18px 10px',
    borderRadius: 6,
    border: `1px solid ${active ? GOLD : 'rgba(255,255,255,0.08)'}`,
    backgroundColor: active ? 'rgba(232,160,32,0.08)' : '#1A1A28',
    color: active ? GOLD : 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: 600,
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    fontFamily: 'var(--font-sans), Inter, sans-serif',
  })

  const canContinue = step === 1 ? !!when : step === 2 ? !!mood : !!city

  function handlePrimary() {
    if (step < 3) {
      setStep(step + 1)
      return
    }
    if (when && mood && city) {
      onApply({ when, mood, city })
    }
    onClose()
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 300,
        backgroundColor: 'rgba(10,10,18,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#0F0F1A',
          border: '0.5px solid rgba(232,160,32,0.25)',
          borderRadius: 6,
          maxWidth: 420,
          width: '100%',
          padding: 28,
        }}
      >
        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 20 }}>
          {[1, 2, 3].map((i) => (
            <span
              key={i}
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: i <= step ? GOLD : 'rgba(255,255,255,0.12)',
                transition: 'background-color 0.2s ease',
              }}
            />
          ))}
        </div>

        {/* Title */}
        <h2
          style={{
            fontFamily: 'var(--font-spectral), Georgia, serif',
            fontSize: 22,
            fontWeight: 500,
            color: '#F4F4F5',
            textAlign: 'center',
            marginBottom: 6,
          }}
        >
          Βρες την βραδιά σου
        </h2>
        <p
          style={{
            fontFamily: 'var(--font-sans), Inter, sans-serif',
            fontSize: 13,
            color: 'rgba(255,255,255,0.4)',
            textAlign: 'center',
            marginBottom: 24,
          }}
        >
          {STEP_SUBTITLES[step]}
        </p>

        {/* Step 1 — Πότε */}
        {step === 1 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
            {WHEN_OPTIONS.map((opt) => (
              <div key={opt} style={tileStyle(when === opt)} onClick={() => setWhen(opt)}>
                {opt}
              </div>
            ))}
          </div>
        )}

        {/* Step 2 — Mood */}
        {step === 2 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 24 }}>
            {MOOD_OPTIONS.map((opt) => (
              <div key={opt} style={tileStyle(mood === opt)} onClick={() => setMood(opt)}>
                {opt}
              </div>
            ))}
          </div>
        )}

        {/* Step 3 — Πού */}
        {step === 3 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
            {CITY_OPTIONS.map((opt) => (
              <div key={opt} style={tileStyle(city === opt)} onClick={() => setCity(opt)}>
                {opt}
              </div>
            ))}
          </div>
        )}

        {/* Primary action */}
        <button
          onClick={handlePrimary}
          disabled={!canContinue}
          style={{
            width: '100%',
            padding: '12px 0',
            borderRadius: 6,
            border: 'none',
            backgroundColor: GOLD,
            color: '#0F0F1A',
            fontSize: 14,
            fontWeight: 700,
            fontFamily: 'var(--font-sans), Inter, sans-serif',
            cursor: canContinue ? 'pointer' : 'not-allowed',
            opacity: canContinue ? 1 : 0.5,
            transition: 'opacity 0.15s ease',
          }}
        >
          {step < 3 ? 'Συνέχεια →' : 'Δες events →'}
        </button>
      </div>
    </div>
  )
}
