'use client'
import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { FiHeart } from 'react-icons/fi'
import { FaHeart } from 'react-icons/fa'
import { toast } from 'sonner'
import { useLanguage } from '@/app/components/LanguageContext'
import { useOwned } from '@/app/lib/useOwned'

const GOLD = '#E8A020'

// Save button and public save count for the spot page. The count is a number
// only; owners see it too but cannot save their own spot (the API rejects it).
export default function SpotSaveButton({ spotId }: { spotId: string }) {
  const { t } = useLanguage()
  const router = useRouter()
  const pathname = usePathname()
  const isOwn = useOwned()?.spots.has(spotId) ?? false
  const [saved, setSaved] = useState(false)
  const [base, setBase] = useState<number | null>(null)
  const [pending, setPending] = useState(false)
  // A slow initial load must not overwrite what the user already chose.
  const touched = useRef(false)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/saved/spots?spot_id=${encodeURIComponent(spotId)}`)
      .then(r => (r.ok ? r.json() : null))
      .then((body: { saved?: boolean; count?: number | null } | null) => {
        if (cancelled || !body) return
        if (typeof body.count === 'number') setBase(body.count - (body.saved ? 1 : 0))
        if (!touched.current) setSaved(!!body.saved)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [spotId])

  async function toggle() {
    if (pending) return
    touched.current = true
    const next = !saved
    setSaved(next)
    setPending(true)
    const signIn = () => toast(t('toast_sign_in_save'), {
      duration: 5000,
      action: { label: t('toast_sign_in'), onClick: () => router.push(`/sign-in?redirect=${encodeURIComponent(pathname)}`) },
    })
    try {
      const res = next
        ? await fetch('/api/saved/spots', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ spot_id: spotId }),
          })
        : await fetch(`/api/saved/spots?spot_id=${encodeURIComponent(spotId)}`, { method: 'DELETE' })
      if (res.status === 401) { setSaved(!next); signIn() }
      else if (!res.ok) { setSaved(!next); toast(t('form_generic_error')) }
    } catch {
      setSaved(!next)
      toast(t('form_generic_error'))
    } finally {
      setPending(false)
    }
  }

  const count = base == null ? null : base + (saved ? 1 : 0)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      {!isOwn && (
        <button
          type="button"
          onClick={toggle}
          disabled={pending}
          aria-label={t(saved ? 'spot_unsave_aria' : 'spot_save_aria')}
          aria-pressed={saved}
          style={{
            width: 40, height: 40, borderRadius: 10, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(255,255,255,0.06)',
            border: `1px solid ${saved ? 'rgba(232,160,32,0.5)' : 'rgba(255,255,255,0.12)'}`,
            cursor: pending ? 'default' : 'pointer',
            opacity: pending ? 0.7 : 1,
          }}
        >
          {saved ? <FaHeart size={18} style={{ color: GOLD }} /> : <FiHeart size={18} style={{ color: 'rgba(255,255,255,0.9)' }} />}
        </button>
      )}
      {count != null && (
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }} data-testid="spot-save-count">
          <strong style={{ color: '#fff' }}>{count}</strong> {t('spot_saves_label')}
        </span>
      )}
    </div>
  )
}
