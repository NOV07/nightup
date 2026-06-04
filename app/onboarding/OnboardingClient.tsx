'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ImageUpload from '../../components/ui/ImageUpload'

export default function OnboardingClient() {
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [instagram, setInstagram] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit() {
    setLoading(true)
    setError('')

    const res = await fetch('/api/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        display_name: displayName,
        profile_type: 'user',
        ...(bio && { bio }),
        ...(instagram && { instagram }),
        ...(avatarUrl && { avatar_url: avatarUrl }),
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error)
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-[#E8A020]"

  return (
    <div className="min-h-screen bg-[#0F0F1A] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome to <span className="text-[#E8A020]">Nightup</span>
          </h1>
          <p className="text-white/50">Set up your profile to get started</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-white/60 text-sm mb-1.5 block">Profile Photo (optional)</label>
            <ImageUpload
              folder="avatars"
              onUpload={(url) => setAvatarUrl(url)}
            />
          </div>

          <div>
            <input
              placeholder="Username (e.g. djvoid)"
              value={username}
              onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
              className={inputClass}
            />
            <p className="text-white/30 text-xs mt-1">nightup.gr/@{username || 'username'}</p>
          </div>

          <input
            placeholder="Display Name (e.g. DJ Void)"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            className={inputClass}
          />

          <textarea
            placeholder="Bio (optional)"
            value={bio}
            onChange={e => setBio(e.target.value)}
            rows={3}
            className={`${inputClass} resize-none`}
          />

          <input
            placeholder="Instagram handle (optional)"
            value={instagram}
            onChange={e => setInstagram(e.target.value)}
            className={inputClass}
          />

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="pt-2">
            <button
              onClick={handleSubmit}
              disabled={loading || !username || !displayName}
              className="w-full bg-[#E8A020] text-black font-bold py-3 rounded-lg hover:bg-[#E8A020]/90 transition disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Profile →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
