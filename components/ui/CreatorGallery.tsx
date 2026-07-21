'use client'
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { FiChevronUp, FiChevronDown, FiX, FiCrop } from 'react-icons/fi'
import ImageUpload from './ImageUpload'
import ImageCropper, { type CropBox } from './ImageCropper'
import CroppedImage from './CroppedImage'
import { useLanguage } from '@/app/components/LanguageContext'

const MAX_PHOTOS = 12
const GALLERY_CROP_ASPECT = 1

interface GalleryPhoto {
  id: string
  image_url: string
  display_order: number
  crop_x: number | null
  crop_y: number | null
  crop_width: number | null
  crop_height: number | null
}

function cropOf(photo: GalleryPhoto): CropBox | null {
  if (photo.crop_x == null || photo.crop_y == null || photo.crop_width == null || photo.crop_height == null) return null
  return { crop_x: photo.crop_x, crop_y: photo.crop_y, crop_width: photo.crop_width, crop_height: photo.crop_height }
}

export default function CreatorGallery({ profileId }: { profileId: string }) {
  const { t } = useLanguage()
  const [photos, setPhotos] = useState<GalleryPhoto[]>([])
  const [error, setError] = useState('')
  const [croppingId, setCroppingId] = useState<string | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    let cancelled = false
    supabase
      .from('creator_gallery')
      .select('id, image_url, display_order, crop_x, crop_y, crop_width, crop_height')
      .eq('profile_id', profileId)
      .order('display_order', { ascending: true })
      .then(({ data }) => { if (!cancelled && data) setPhotos(data as GalleryPhoto[]) })
    return () => { cancelled = true }
  }, [profileId])

  async function handleUpload(url: string) {
    setError('')
    const nextOrder = photos.length ? Math.max(...photos.map(p => p.display_order)) + 1 : 0
    const { data, error } = await supabase
      .from('creator_gallery')
      .insert({ profile_id: profileId, image_url: url, display_order: nextOrder })
      .select('id, image_url, display_order, crop_x, crop_y, crop_width, crop_height')
      .single()
    if (error) { setError(error.message); return }
    setPhotos(prev => [...prev, data as GalleryPhoto])
  }

  async function handleCropConfirm(id: string, box: CropBox) {
    setCroppingId(null)
    setPhotos(prev => prev.map(p => p.id === id ? { ...p, crop_x: box.crop_x, crop_y: box.crop_y, crop_width: box.crop_width, crop_height: box.crop_height } : p))
    await supabase.from('creator_gallery').update({
      crop_x: box.crop_x, crop_y: box.crop_y, crop_width: box.crop_width, crop_height: box.crop_height,
    }).eq('id', id)
  }

  async function handleDelete(id: string) {
    setError('')
    const { error } = await supabase.from('creator_gallery').delete().eq('id', id)
    if (error) { setError(error.message); return }
    setPhotos(prev => prev.filter(p => p.id !== id))
  }

  async function move(index: number, direction: -1 | 1) {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= photos.length) return
    const current = photos[index]
    const target = photos[targetIndex]
    const updated = [...photos]
    updated[index] = { ...current, display_order: target.display_order }
    updated[targetIndex] = { ...target, display_order: current.display_order }
    updated.sort((a, b) => a.display_order - b.display_order)
    setPhotos(updated)
    await Promise.all([
      supabase.from('creator_gallery').update({ display_order: target.display_order }).eq('id', current.id),
      supabase.from('creator_gallery').update({ display_order: current.display_order }).eq('id', target.id),
    ])
  }

  return (
    <div className="p-6 rounded-2xl space-y-4" style={{ backgroundColor: '#111120', border: '0.5px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider">{t('dashboard_gallery')}</h2>
        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{photos.length}/{MAX_PHOTOS}</span>
      </div>
      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{t('dashboard_creator_gallery_desc')}</p>

      {error && <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {photos.map((photo, i) => (
          <div key={photo.id} className="relative aspect-square rounded-xl overflow-hidden group" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.1)' }}>
            <CroppedImage src={photo.image_url} alt={`Gallery ${i + 1}`} crop={cropOf(photo)} sizes="200px" />
            <button
              type="button"
              onClick={() => setCroppingId(photo.id)}
              aria-label={t('image_crop_edit')}
              className="absolute top-1.5 left-1.5 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ backgroundColor: 'rgba(0,0,0,0.7)', color: 'white' }}
            >
              <FiCrop size={12} />
            </button>
            {croppingId === photo.id && (
              <ImageCropper
                imageUrl={photo.image_url}
                aspect={GALLERY_CROP_ASPECT}
                initialCrop={cropOf(photo)}
                onConfirm={(box) => handleCropConfirm(photo.id, box)}
                onCancel={() => setCroppingId(null)}
              />
            )}
            <button
              type="button"
              onClick={() => handleDelete(photo.id)}
              aria-label={t('dashboard_gallery_delete_alt')}
              className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ backgroundColor: 'rgba(0,0,0,0.7)', color: 'white' }}
            >
              <FiX size={12} />
            </button>
            <div className="absolute bottom-1.5 left-1.5 right-1.5 flex justify-between opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                aria-label={t('dashboard_gallery_move_up')}
                className="w-6 h-6 rounded-full flex items-center justify-center disabled:opacity-30"
                style={{ backgroundColor: 'rgba(0,0,0,0.7)', color: 'white' }}
              >
                <FiChevronUp size={12} />
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === photos.length - 1}
                aria-label={t('dashboard_gallery_move_down')}
                className="w-6 h-6 rounded-full flex items-center justify-center disabled:opacity-30"
                style={{ backgroundColor: 'rgba(0,0,0,0.7)', color: 'white' }}
              >
                <FiChevronDown size={12} />
              </button>
            </div>
          </div>
        ))}
        {photos.length < MAX_PHOTOS && (
          <div className="aspect-square rounded-xl overflow-hidden" style={{ border: '0.5px dashed rgba(255,255,255,0.15)' }}>
            <ImageUpload key={photos.length} bucket="creator-gallery" folder="gallery" onUpload={handleUpload} />
          </div>
        )}
      </div>

      {photos.length >= MAX_PHOTOS && (
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{t('dashboard_gallery_max_reached')}</p>
      )}
    </div>
  )
}
