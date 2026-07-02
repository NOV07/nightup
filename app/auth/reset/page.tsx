'use client'
import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/app/components/LanguageContext'

export default function ResetPasswordPage() {
  const { t } = useLanguage()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const router = useRouter()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError(t('reset_mismatch')); return }
    if (password.length < 8) { setError(t('reset_too_short')); return }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) { setError(error.message); return }
    setDone(true)
    setTimeout(() => router.push('/dashboard'), 2000)
  }

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-[#E8A020]"

  return (
    <div className="min-h-screen bg-[#0A0A12] flex items-center justify-center p-4">
      <div className="bg-[#0F0F1A] border border-[#E8A020]/30 rounded-xl p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-white mb-2">{t('reset_title')}</h2>
        <p className="text-white/50 text-sm mb-6">{t('reset_subtitle')}</p>

        {done ? (
          <p className="text-green-400 text-sm text-center py-4">
            {t('reset_success')}
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="password"
              placeholder={t('reset_new_password_placeholder')}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className={inputClass}
              required
            />
            <input
              type="password"
              placeholder={t('reset_confirm_placeholder')}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              className={`${inputClass} ${confirm && confirm !== password ? 'border-red-500' : ''}`}
              required
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#E8A020] text-black font-bold py-3 rounded-lg hover:bg-[#E8A020]/90 transition disabled:opacity-50"
            >
              {loading ? t('reset_saving') : t('reset_submit')}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
