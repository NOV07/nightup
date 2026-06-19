'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import UpgradeModal from '@/components/auth/UpgradeModal'

export default function UpgradePage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace('/sign-in?redirect=/upgrade')
      } else {
        setReady(true)
      }
    })
  }, [router])

  if (!ready) {
    return <div className="min-h-screen" style={{ background: '#0F0F1A' }} />
  }

  return (
    <div className="min-h-screen" style={{ background: '#0F0F1A' }}>
      <UpgradeModal onClose={() => router.push('/dashboard')} />
    </div>
  )
}
