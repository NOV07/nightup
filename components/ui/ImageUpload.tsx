'use client'
import { useState, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'

interface ImageUploadProps {
  onUpload: (url: string) => void
  existingUrl?: string
  folder?: string
}

export default function ImageUpload({ onUpload, existingUrl, folder = 'general' }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string>(existingUrl || '')
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      setError('File too large. Max 5MB.')
      return
    }

    if (!file.type.startsWith('image/')) {
      setError('Only images allowed.')
      return
    }

    setUploading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Not logged in'); setUploading(false); return }

    const ext = file.name.split('.').pop()
    const filename = `${user.id}/${folder}/${Date.now()}.${ext}`

    const { data, error } = await supabase.storage
      .from('uploads')
      .upload(filename, file, { upsert: true })

    if (error) {
      setError(error.message)
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('uploads')
      .getPublicUrl(data.path)

    setPreview(publicUrl)
    onUpload(publicUrl)
    setUploading(false)
  }

  return (
    <div className="space-y-2">
      <div
        onClick={() => fileInputRef.current?.click()}
        className="relative w-full h-48 rounded-xl border-2 border-dashed border-white/20 hover:border-[#E8A020]/50 transition cursor-pointer overflow-hidden flex items-center justify-center"
      >
        {preview ? (
          <>
            <img src={preview} alt="Preview" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition flex items-center justify-center">
              <p className="text-white text-sm font-medium">Change Image</p>
            </div>
          </>
        ) : (
          <div className="text-center p-4">
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-2 border-[#E8A020] border-t-transparent rounded-full animate-spin" />
                <p className="text-white/50 text-sm">Uploading...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-2xl">📸</div>
                <p className="text-white/50 text-sm">Click to upload image</p>
                <p className="text-white/30 text-xs">PNG, JPG up to 5MB</p>
              </div>
            )}
          </div>
        )}
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleUpload}
        className="hidden"
      />
    </div>
  )
}
