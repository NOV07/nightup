'use client'
import { useRef, useState } from 'react'
import type { GalleryItem } from '@/app/lib/types'
import { GalleryPlayBadge } from './GalleryLightbox'
import { useLanguage } from '@/app/components/LanguageContext'
import { compressImage } from '@/app/lib/compressImage'

/** Server-side duration checking would mean shipping ffmpeg just to parse a
 *  container header, so the limit is enforced here instead. */
const MAX_VIDEO_SECONDS = 60
const PROBE_TIMEOUT_MS = 10_000

export type GalleryUploadContext = 'spot' | 'profile'

interface GalleryUploadProps {
  context: GalleryUploadContext
  onUpload: (item: GalleryItem) => void
  /** Pass these to get the built-in preview grid. Callers that already render
   *  their own grid (the spot wizard, CreatorGallery) leave them off. */
  items?: GalleryItem[]
  onRemove?: (index: number) => void
  max?: number
}

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: () => T): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback()), ms)
    promise.then(
      (value) => { clearTimeout(timer); resolve(value) },
      () => { clearTimeout(timer); resolve(fallback()) },
    )
  })
}

/** Reads duration off a hidden <video>, then grabs the first frame as a poster.
 *  A poster that fails to render is not fatal — the item just falls back to the
 *  browser's own first-frame rendering in the lightbox. */
async function probeVideo(file: File): Promise<{ duration: number; poster: Blob | null }> {
  const objectUrl = URL.createObjectURL(file)
  const video = document.createElement('video')
  video.preload = 'metadata'
  video.muted = true
  video.playsInline = true

  try {
    const duration = await withTimeout(
      new Promise<number>((resolve, reject) => {
        video.onloadedmetadata = () => resolve(video.duration)
        video.onerror = () => reject(new Error('metadata'))
        video.src = objectUrl
      }),
      PROBE_TIMEOUT_MS,
      () => NaN,
    )

    if (!Number.isFinite(duration)) return { duration: NaN, poster: null }
    if (duration > MAX_VIDEO_SECONDS) return { duration, poster: null }

    const poster = await withTimeout(
      new Promise<Blob | null>((resolve, reject) => {
        video.onseeked = () => {
          const canvas = document.createElement('canvas')
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          const ctx = canvas.getContext('2d')
          if (!ctx || !canvas.width || !canvas.height) { resolve(null); return }
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.8)
        }
        video.onerror = () => reject(new Error('seek'))
        // Not 0 — some encoders leave the very first frame blank.
        video.currentTime = 0.1
      }),
      PROBE_TIMEOUT_MS,
      () => null,
    )

    return { duration, poster }
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

async function postFile(file: File | Blob, name: string, context: string): Promise<{ url: string; type: 'image' | 'video' }> {
  const body = new FormData()
  body.append('file', file, name)
  body.append('context', context)
  const res = await fetch('/api/gallery/upload', { method: 'POST', body })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json?.error || 'Upload failed')
  return json
}

export default function GalleryUpload({ context, onUpload, items, onRemove, max }: GalleryUploadProps) {
  const { t } = useLanguage()
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const showGrid = items !== undefined
  const atMax = max !== undefined && items !== undefined && items.length >= max

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return

    setUploading(true)
    setError('')

    const failures: string[] = []
    let accepted = 0

    for (const [i, file] of files.entries()) {
      if (max !== undefined && items !== undefined && items.length + accepted >= max) {
        failures.push(`${t('gallery_limit_prefix')} ${max} ${t('gallery_limit_suffix')}`)
        break
      }

      setProgress(files.length > 1 ? `${i + 1}/${files.length}` : '')
      const isVideo = file.type.startsWith('video/')

      try {
        if (isVideo) {
          const { duration, poster } = await probeVideo(file)
          if (!Number.isFinite(duration)) {
            failures.push(`${file.name}: ${t('gallery_video_unreadable')}`)
            continue
          }
          if (duration > MAX_VIDEO_SECONDS) {
            failures.push(`${file.name}: ${t('gallery_video_max_prefix')} ${MAX_VIDEO_SECONDS} ${t('gallery_video_max_suffix')}`)
            continue
          }

          let posterUrl: string | undefined
          if (poster) {
            try {
              const base = file.name.replace(/\.[^.]+$/, '')
              const uploaded = await postFile(poster, `${base}-poster.jpg`, context)
              posterUrl = uploaded.url
            } catch {
              // A missing poster degrades the grid thumbnail, not the upload.
            }
          }

          const uploaded = await postFile(file, file.name, context)
          onUpload({ url: uploaded.url, type: 'video', ...(posterUrl ? { poster: posterUrl } : {}) })
          accepted++
        } else {
          const compressed = await compressImage(file)
          const uploaded = await postFile(compressed, compressed.name, context)
          onUpload({ url: uploaded.url, type: uploaded.type })
          accepted++
        }
      } catch (err) {
        failures.push(`${file.name}: ${err instanceof Error ? err.message : 'Upload failed'}`)
      }
    }

    setProgress('')
    setUploading(false)
    setError(failures.join(' · '))
    // Let the same file be picked again after a failure.
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="space-y-2">
      <div
        onClick={() => { if (!uploading && !atMax) fileInputRef.current?.click() }}
        className={`relative w-full h-full min-h-[7rem] rounded-xl border-2 border-dashed transition overflow-hidden flex items-center justify-center ${
          atMax ? 'border-white/10 cursor-default' : 'border-white/20 hover:border-[#E8A020]/50 cursor-pointer'
        }`}
      >
        <div className="text-center p-4">
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-2 border-[#E8A020] border-t-transparent rounded-full animate-spin" />
              <p className="text-white/50 text-sm">Uploading{progress ? ` ${progress}` : ''}...</p>
            </div>
          ) : atMax ? (
            <p className="text-white/30 text-xs">{t('gallery_at_max')}</p>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-2xl">📸</div>
              <p className="text-white/50 text-sm">{t('gallery_photos_videos')}</p>
              <p className="text-white/30 text-xs">{t('gallery_formats')} / {MAX_VIDEO_SECONDS}s</p>
            </div>
          )}
        </div>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {showGrid && items!.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {items!.map((item, i) => (
            <div
              key={`${item.url}-${i}`}
              className="relative aspect-square rounded-xl overflow-hidden group"
              style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.1)' }}
            >
              {item.type === 'video' ? (
                <>
                  {item.poster
                    ? <img src={item.poster} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full" style={{ background: 'rgba(255,255,255,0.06)' }} />}
                  <GalleryPlayBadge size={28} />
                </>
              ) : (
                <img src={item.url} alt="" className="w-full h-full object-cover" />
              )}
              {onRemove && (
                <button
                  type="button"
                  onClick={() => onRemove(i)}
                  aria-label={t('common_remove')}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ backgroundColor: 'rgba(0,0,0,0.7)', color: 'white' }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        onChange={handleFiles}
        className="hidden"
      />
    </div>
  )
}
