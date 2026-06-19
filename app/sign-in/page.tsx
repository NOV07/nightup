'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import AuthModal from '@/components/auth/AuthModal'

function SignInContent() {
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/dashboard'
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        router.replace(redirectTo)
      } else {
        setReady(true)
      }
    })
  }, [redirectTo, router])

  if (!ready) {
    return (
      <div className="min-h-screen" style={{ background: '#0F0F1A' }} />
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#0F0F1A' }}>
      <AuthModal
        redirectTo={redirectTo}
        onClose={() => router.push('/')}
      />
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: '#0F0F1A' }} />}>
      <SignInContent />
    </Suspense>
  )
}
