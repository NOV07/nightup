'use client'

import { useState } from 'react'
import { useLanguage } from '@/app/components/LanguageContext'

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

const WHAT_OPTIONS = [
  { emoji: '🎵', label: 'Μουσική & Club' },
  { emoji: '🎭', label: 'Θέαμα & Τέχνη' },
  { emoji: '🍹', label: 'Ποτό & Παρέα' },
  { emoji: '✨', label: 'Έκπληξέ με' },
]

const WHEN_OPTIONS = ['Απόψε', 'Αύριο', 'Σαββατοκύριακο']

const MOOD_OPTIONS = [
  { emoji: '🔥', label: 'Έντονο' },
  { emoji: '😌', label: 'Χαλαρό' },
  { emoji: '👥', label: 'Παρέα' },
  { emoji: '💃', label: 'Dance' },
]

const CITY_OPTIONS = ['Αθήνα', 'Θεσσαλονίκη', 'Όλη η Ελλάδα']

const STEP_TITLES: Record<number, string> = {
  1: 'Τι ψάχνεις;',
  2: 'Πότε;',
  3: 'Τι mood;',
  4: 'Πού;',
}

export default function EventsFilterModal({ onClose, onApply }: EventsFilterModalProps) {
  const { t } = useLanguage()
  const [step, setStep] = useState(1)
  const [what, setWhat] = useState<string | null>(null)
  const [when, setWhen] = useState<string | null>(null)
  const [mood, setMood] = useState<string | null>(null)
  const [city, setCity] = useState<string | null>(null)

  const currentSelection = step === 1 ? what : step === 2 ? when : step === 3 ? mood : city

  function handlePrimary() {
    if (!currentSelection) return
    if (step < 4) {
      setStep(step + 1)
      return
    }
    onApply({
      when: when ?? '',
      mood: what ?? '',
      city: city ?? '',
    })
    onClose()
  }

  function handleBack() {
    if (step > 1) setStep(step - 1)
  }

  const tileBase: React.CSSProperties = {
    backgroundColor: '#1A1A28',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 6,
    padding: '20px 16px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  }

  const tileActive: React.CSSProperties = {
    ...tileBase,
    border: `1px solid ${GOLD}`,
    backgroundColor: 'rgba(232,160,32,0.08)',
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 300,
        backgroundColor: 'rgba(0,0,0,0.72)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#0F0F1A',
          borderRadius: '12px 12px 0 0',
          maxWidth: 480,
          width: '100%',
          padding: '24px 24px 40px',
        }}
      >
        {/* Top bar: back · dots · close */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <button
            onClick={handleBack}
            style={{
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: step > 1 ? GOLD : 'transparent',
              background: 'none',
              border: 'none',
              cursor: step > 1 ? 'pointer' : 'default',
              padding: 0,
              fontFamily: 'var(--font-sans), Inter, sans-serif',
            }}
          >
            {t("auth_back")}
          </button>

          <div style={{ display: 'flex', gap: 6 }}>
            {[1, 2, 3, 4].map((i) => (
              <span
                key={i}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: i <= step ? GOLD : 'rgba(255,255,255,0.15)',
                  transition: 'background-color 0.2s ease',
                  display: 'block',
                }}
              />
            ))}
          </div>

          <button
            onClick={onClose}
            style={{
              fontSize: 20,
              lineHeight: 1,
              color: 'rgba(255,255,255,0.35)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            ×
          </button>
        </div>

        {/* Step title */}
        <h2
          style={{
            fontFamily: 'var(--font-spectral), Georgia, serif',
            fontStyle: 'italic',
            fontSize: 22,
            fontWeight: 400,
            color: '#fff',
            marginBottom: 24,
          }}
        >
          {STEP_TITLES[step]}
        </h2>

        {/* Step 1 — Τι ψάχνεις */}
        {step === 1 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
            {WHAT_OPTIONS.map((opt) => (
              <div key={opt.label} style={{ ...(what === opt.label ? tileActive : tileBase), padding: '14px 10px' }} onClick={() => setWhat(opt.label)}>
                <div style={{ fontSize: 26, marginBottom: 8 }}>{opt.emoji}</div>
                <div style={{ fontFamily: 'var(--font-spectral), Georgia, serif', fontSize: 14, color: what === opt.label ? GOLD : '#fff' }}>
                  {opt.label}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Step 2 — Πότε */}
        {step === 2 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
            {WHEN_OPTIONS.map((opt) => (
              <div key={opt} style={{ ...(when === opt ? tileActive : tileBase), padding: '12px 8px' }} onClick={() => setWhen(opt)}>
                <div style={{ fontFamily: 'var(--font-spectral), Georgia, serif', fontSize: 14, color: when === opt ? GOLD : '#fff' }}>
                  {opt}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Step 3 — Mood */}
        {step === 3 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
            {MOOD_OPTIONS.map((opt) => (
              <div key={opt.label} style={{ ...(mood === opt.label ? tileActive : tileBase), padding: '14px 10px' }} onClick={() => setMood(opt.label)}>
                <div style={{ fontSize: 26, marginBottom: 8 }}>{opt.emoji}</div>
                <div style={{ fontFamily: 'var(--font-spectral), Georgia, serif', fontSize: 14, color: mood === opt.label ? GOLD : '#fff' }}>
                  {opt.label}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Step 4 — Πού */}
        {step === 4 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
            {CITY_OPTIONS.map((opt) => (
              <div key={opt} style={{ ...(city === opt ? tileActive : tileBase), padding: '12px 8px' }} onClick={() => setCity(opt)}>
                <div style={{ fontFamily: 'var(--font-spectral), Georgia, serif', fontSize: 14, color: city === opt ? GOLD : '#fff' }}>
                  {opt}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CTA */}
        <button
          onClick={handlePrimary}
          disabled={!currentSelection}
          style={{
            width: '100%',
            padding: '13px 0',
            borderRadius: 6,
            border: 'none',
            backgroundColor: GOLD,
            color: '#0A0A12',
            fontSize: 13,
            fontWeight: 700,
            fontFamily: 'var(--font-sans), Inter, sans-serif',
            textTransform: 'uppercase',
            letterSpacing: '0.10em',
            cursor: currentSelection ? 'pointer' : 'not-allowed',
            opacity: currentSelection ? 1 : 0.38,
            transition: 'opacity 0.15s ease',
          }}
        >
          {step < 4 ? t("filter_next") : t("filter_see_events")}
        </button>
      </div>
    </div>
  )
}
