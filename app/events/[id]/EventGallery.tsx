'use client'

import { useState } from 'react'
import GalleryLightbox, { GalleryPlayBadge } from '../../../components/ui/GalleryLightbox'
import CroppedImage from '../../../components/ui/CroppedImage'
import type { GalleryItem } from '../../lib/types'

export default function EventGallery({ items, alt }: { items: GalleryItem[]; alt: string }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  if (items.length === 0) return null

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
        {items.map((item, i) => (
          <div
            key={i}
            role="button"
            tabIndex={0}
            aria-label={`${alt} ${i + 1}`}
            onClick={() => setLightboxIndex(i)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setLightboxIndex(i) }
            }}
            style={{
              position: 'relative', aspectRatio: '1 / 1', borderRadius: 12, overflow: 'hidden',
              backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              cursor: 'pointer',
            }}
          >
            <CroppedImage
              src={item.type === 'video' ? (item.poster || '') : item.url}
              alt={`${alt} ${i + 1}`}
              sizes="(max-width: 680px) 45vw, 220px"
            />
            {item.type === 'video' && <GalleryPlayBadge size={38} />}
          </div>
        ))}
      </div>

      {lightboxIndex !== null && (
        <GalleryLightbox items={items} startIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />
      )}
    </>
  )
}
