'use client'
import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface Props {
  listingId: string
  initialCount: number
}

export default function InterestButton({ listingId, initialCount }: Props) {
  const [sent, setSent] = useState(false)
  const [count, setCount] = useState(initialCount)
  const router = useRouter()
  const pathname = usePathname()

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (sent) return

    setSent(true)
    setCount(c => c + 1)

    const res = await fetch(`/api/listings/${listingId}/interest`, { method: 'POST' })

    if (res.status === 401) {
      setSent(false)
      setCount(c => c - 1)
      toast('Συνδέσου για να εκδηλώσεις ενδιαφέρον', {
        duration: 5000,
        action: {
          label: 'Σύνδεση',
          onClick: () => router.push(`/sign-in?redirect=${encodeURIComponent(pathname)}`),
        },
      })
      return
    }
    // 409 = already sent — keep sent state
    if (!res.ok && res.status !== 409) {
      setSent(false)
      setCount(c => c - 1)
    }
  }

  // suppress unused warning — count available for future display
  void count

  return (
    <button
      onClick={handleClick}
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: '6px 12px',
        borderRadius: 6,
        cursor: sent ? 'default' : 'pointer',
        border: sent ? '1px solid rgba(255,255,255,0.12)' : 'none',
        backgroundColor: sent ? 'transparent' : '#E8A020',
        color: sent ? 'rgba(255,255,255,0.4)' : '#0F0F1A',
        transition: 'all 0.15s',
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      {sent ? '✓ Έστειλες' : 'Ενδιαφέρομαι'}
    </button>
  )
}
