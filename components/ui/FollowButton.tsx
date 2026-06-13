'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function FollowButton({ profileId }: { profileId: string }) {
  const [following, setFollowing] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

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
        if (res.status === 401) { setFollowing(false); router.push('/signin'); return }
      } else {
        const res = await fetch(`/api/follows?profile_id=${profileId}`, { method: 'DELETE' })
        if (res.status === 401) { setFollowing(true); router.push('/signin'); return }
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
      {following ? 'Ακολουθώ' : 'Ακολούθησε'}
    </button>
  )
}
