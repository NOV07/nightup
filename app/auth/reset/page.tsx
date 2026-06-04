'use client'
import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
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
    if (password !== confirm) { setError('Οι κωδικοί δεν ταιριάζουν'); return }
    if (password.length < 8) { setError('Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες'); return }

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
        <h2 className="text-2xl font-bold text-white mb-2">Νέος κωδικός</h2>
        <p className="text-white/50 text-sm mb-6">Επέλεξε έναν νέο κωδικό για τον λογαριασμό σου</p>

        {done ? (
          <p className="text-green-400 text-sm text-center py-4">
            Ο κωδικός άλλαξε — ανακατεύθυνση...
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="password"
              placeholder="Νέος κωδικός"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className={inputClass}
              required
            />
            <input
              type="password"
              placeholder="Επιβεβαίωση κωδικού"
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
              {loading ? 'Αποθήκευση...' : 'Αλλαγή κωδικού →'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
