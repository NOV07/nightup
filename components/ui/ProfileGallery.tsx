'use client'
import { useState } from 'react'
import CroppedImage from './CroppedImage'
import GalleryLightbox, { GalleryPlayBadge } from './GalleryLightbox'
import type { GalleryItem } from '@/app/lib/types'
import { useLanguage } from '@/app/components/LanguageContext'

/** A creator_gallery row. media_type / poster_url are optional because the
 *  media-type migration is applied by hand — rows read before it runs simply
 *  behave as images. */
export interface ProfileGalleryPhoto {
  id: string
  image_url: string
  media_type?: string | null
  poster_url?: string | null
  crop_x: number | null
  crop_y: number | null
  crop_width: number | null
  crop_height: number | null
}

function cropOf(photo: ProfileGalleryPhoto) {
  return photo.crop_x != null && photo.crop_y != null && photo.crop_width != null && photo.crop_height != null
    ? { crop_x: photo.crop_x, crop_y: photo.crop_y, crop_width: photo.crop_width, crop_height: photo.crop_height }
    : null
}

/** Client wrapper around the profile gallery grid, so the rest of the profile
 *  page stays a server component. The grid markup and classes are unchanged —
 *  this only adds the click/keyboard handling that opens the lightbox. */
export default function ProfileGallery({ photos }: { photos: ProfileGalleryPhoto[] }) {
  const { t } = useLanguage()
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const items: GalleryItem[] = photos.map((p) =>
    p.media_type === 'video'
      ? { url: p.image_url, type: 'video' as const, ...(p.poster_url ? { poster: p.poster_url } : {}) }
      : { url: p.image_url, type: 'image' as const },
  )

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {photos.map((photo, i) => {
          const isVideo = photo.media_type === 'video'
          const thumb = isVideo ? photo.poster_url : photo.image_url
          return (
            <div
              key={photo.id}
              role="button"
              tabIndex={0}
              aria-label={`${isVideo ? t('media_video') : t('media_photo')} ${i + 1}`}
              onClick={() => setLightboxIndex(i)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setLightboxIndex(i) }
              }}
              className="relative aspect-square rounded-xl overflow-hidden cursor-pointer"
            >
              {thumb ? (
                <CroppedImage
                  src={thumb}
                  alt=""
                  crop={cropOf(photo)}
                  className="hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 640px) 50vw, 33vw"
                />
              ) : (
                <div className="w-full h-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
              )}
              {isVideo && <GalleryPlayBadge size={38} />}
            </div>
          )
        })}
      </div>

      {lightboxIndex !== null && (
        <GalleryLightbox items={items} startIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />
      )}
    </>
  )
}
