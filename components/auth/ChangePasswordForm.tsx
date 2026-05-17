"use client"
import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export default function ChangePasswordForm() {
  const [current, setCurrent] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (newPass !== confirm) { setError('Passwords do not match'); return }
    if (newPass.length < 8) { setError('Password must be at least 8 characters'); return }

    // Re-authenticate with current password first
    const { data: { user } } = await supabase.auth.getUser()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user?.email!,
      password: current
    })
    if (signInError) { setError('Current password is incorrect'); return }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPass })
    if (updateError) { setError(updateError.message); return }
    setSuccess(true)
    setCurrent(''); setNewPass(''); setConfirm('')
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <input
        type="password"
        placeholder="Current password"
        value={current}
        onChange={e => setCurrent(e.target.value)}
        required
        style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '12px',
          padding: '14px 16px',
          color: '#fff',
          fontSize: '15px',
          outline: 'none',
          width: '100%',
        }}
      />
      <input
        type="password"
        placeholder="New password"
        value={newPass}
        onChange={e => setNewPass(e.target.value)}
        required
        style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '12px',
          padding: '14px 16px',
          color: '#fff',
          fontSize: '15px',
          outline: 'none',
          width: '100%',
        }}
      />
      <input
        type="password"
        placeholder="Confirm new password"
        value={confirm}
        onChange={e => setConfirm(e.target.value)}
        required
        style={{
          background: 'rgba(255,255,255,0.06)',
          border: confirm && confirm !== newPass ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.12)',
          borderRadius: '12px',
          padding: '14px 16px',
          color: '#fff',
          fontSize: '15px',
          outline: 'none',
          width: '100%',
        }}
      />
      {error && <p style={{ color: '#ef4444', fontSize: '14px', margin: 0 }}>{error}</p>}
      {success && <p style={{ color: '#22c55e', fontSize: '14px', margin: 0 }}>Password changed successfully!</p>}
      <button
        type="submit"
        style={{
          background: '#E8A020',
          color: '#000',
          fontWeight: '700',
          fontSize: '15px',
          border: 'none',
          borderRadius: '12px',
          padding: '14px',
          cursor: 'pointer',
          width: '100%',
          marginTop: '4px',
        }}
      >
        Change password
      </button>
    </form>
  )
}
