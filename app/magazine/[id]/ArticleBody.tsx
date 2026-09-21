'use client'

import { useEffect, useRef, useState } from 'react'
import GalleryLightbox from '../../../components/ui/GalleryLightbox'
import type { GalleryItem } from '../../lib/types'

/**
 * Renders the article's stored HTML as-is, then wires its inline <img> tags
 * into the shared lightbox after mount. Delegation on the container (rather
 * than a listener per <img>) means re-runs on `html` change (locale switch)
 * can't stack duplicate handlers — each effect cleans up its own before the
 * next attaches.
 */
export default function ArticleBody({ html }: { html: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [lightbox, setLightbox] = useState<{ items: GalleryItem[]; index: number } | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const imgs = Array.from(container.querySelectorAll('img'))
    imgs.forEach(img => {
      if (img.closest('a')) return // leave linked images alone — the link should keep working
      img.style.cursor = 'pointer'
      img.setAttribute('role', 'button')
      img.setAttribute('tabIndex', '0')
    })

    const openAt = (img: HTMLImageElement) => {
      const index = imgs.indexOf(img)
      if (index === -1) return
      setLightbox({ items: imgs.map(i => ({ url: i.src, type: 'image' })), index })
    }

    const onClick = (e: MouseEvent) => {
      const img = (e.target as HTMLElement).closest('img')
      if (!img || img.closest('a')) return
      e.preventDefault()
      openAt(img)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' && e.key !== ' ') return
      const img = (e.target as HTMLElement).closest('img')
      if (!img || img.closest('a')) return
      e.preventDefault()
      openAt(img)
    }

    container.addEventListener('click', onClick)
    container.addEventListener('keydown', onKeyDown)
    return () => {
      container.removeEventListener('click', onClick)
      container.removeEventListener('keydown', onKeyDown)
    }
  }, [html])

  return (
    <>
      <div ref={containerRef} dangerouslySetInnerHTML={{ __html: html }} />
      {lightbox && (
        <GalleryLightbox items={lightbox.items} startIndex={lightbox.index} onClose={() => setLightbox(null)} />
      )}
    </>
  )
}
