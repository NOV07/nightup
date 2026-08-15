'use client'
import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useLanguage } from '@/app/components/LanguageContext'

export default function FollowButton({ profileId }: { profileId: string }) {
  const [following, setFollowing] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()
  const { t } = useLanguage()

  useEffect(() => {
    fetch(`/api/follows?profile_id=${profileId}`)
      .then(r => r.json())
      .then(data => { setFollowing(!!data.following); setLoading(false) })
      .catch(() => setLoading(false))
  }, [profileId])

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const next = !following
    setFollowing(next)
    try {
      if (next) {
        const res = await fetch('/api/follows', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profile_id: profileId }),
        })
        if (res.status === 401) {
          setFollowing(false)
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
    }
  }

  if (loading) return null

  return (
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
}
