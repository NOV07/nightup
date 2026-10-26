'use client'
import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useLanguage } from '@/app/components/LanguageContext'

// `showCount` adds the public follower number (a count only, never who) next
// to the button; on your own profile the button is hidden but the number stays.
export default function FollowButton({ profileId, showCount = false }: { profileId: string; showCount?: boolean }) {
  const [following, setFollowing] = useState(false)
  const [count, setCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [self, setSelf] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const { t } = useLanguage()

  useEffect(() => {
    fetch(`/api/follows?profile_id=${profileId}`)
      .then(r => r.json())
      .then(data => { setFollowing(!!data.following); setSelf(!!data.self); setCount(typeof data.count === 'number' ? data.count : null); setLoading(false) })
      .catch(() => setLoading(false))
  }, [profileId])

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const next = !following
    setFollowing(next)
    setCount(c => (c == null ? c : Math.max(0, c + (next ? 1 : -1))))
    try {
      if (next) {
        const res = await fetch('/api/follows', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profile_id: profileId }),
        })
        if (res.status === 401) {
          setFollowing(false)
          setCount(c => (c == null ? c : Math.max(0, c - 1)))
          toast(t('toast_sign_in_follow'), {
            duration: 5000,
            action: {
              label: t('toast_sign_in'),
              onClick: () => router.push(`/sign-in?redirect=${encodeURIComponent(pathname)}`),
            },
          })
          return
        }
      } else {
        const res = await fetch(`/api/follows?profile_id=${profileId}`, { method: 'DELETE' })
        if (res.status === 401) {
          setFollowing(true)
          setCount(c => (c == null ? c : c + 1))
          toast(t('toast_sign_in_follow'), {
            duration: 5000,
            action: {
              label: t('toast_sign_in'),
              onClick: () => router.push(`/sign-in?redirect=${encodeURIComponent(pathname)}`),
            },
          })
          return
        }
      }
    } catch {
      setFollowing(!next)
      setCount(c => (c == null ? c : Math.max(0, c + (next ? -1 : 1))))
    }
  }

  if (loading) return null

  const countLabel = showCount && count != null ? (
    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }} data-testid="follower-count">
      <strong style={{ color: '#fff', fontWeight: 700 }}>{count}</strong> {t('follow_followers')}
    </span>
  ) : null

  // Your own profile: nothing to follow, the number is still public.
  if (self) return countLabel

  const button = (
    <button
      onClick={handleClick}
      style={{
        padding: '6px 16px',
        borderRadius: 99,
        fontSize: 12,
        fontWeight: 600,
        cursor: 'pointer',
        border: following ? '1px solid rgba(232,160,32,0.4)' : '1px solid rgba(255,255,255,0.15)',
        color: following ? '#E8A020' : 'rgba(255,255,255,0.5)',
        background: following ? 'rgba(232,160,32,0.08)' : 'transparent',
        transition: 'all 0.2s',
      }}
    >
      {following ? t('follow_following') : t('follow_follow')}
    </button>
  )

  if (!countLabel) return button
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      {button}
      {countLabel}
    </div>
  )
}
