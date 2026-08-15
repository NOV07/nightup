'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { GalleryItem } from '@/app/lib/types'
import { useLanguage } from '@/app/components/LanguageContext'

const SWIPE_THRESHOLD = 44
const TRANSITION = 'transform .4s cubic-bezier(.22,.75,.2,1)'

/** Play affordance drawn over a video's poster in a grid cell. SVG rather than
 *  an emoji so it stays crisp and takes the surrounding colour. */
export function GalleryPlayBadge({ size = 46 }: { size?: number }) {
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute', inset: 0, display: 'flex',
        alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
      }}
    >
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="23" fill="rgba(6,6,12,0.55)" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" />
        <path d="M20 16.5 33 24l-13 7.5z" fill="#fff" />
      </svg>
    </div>
  )
}

/** Grid-cell media for a gallery item: a video shows its captured poster frame
 *  plus a play badge, and never plays or makes sound outside the lightbox. */
export function GalleryThumb({ item, alt = '' }: { item: GalleryItem; alt?: string }) {
  const src = item.type === 'video' ? (item.poster || '') : item.url
  return (
    <>
      {src
        ? <img src={src} alt={alt} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        : <div style={{ width: '100%', height: '100%', background: 'rgba(255,255,255,0.06)' }} />}
      {item.type === 'video' && <GalleryPlayBadge />}
    </>
  )
}

export default function GalleryLightbox({
  items,
  startIndex,
  onClose,
}: {
  items: GalleryItem[]
  startIndex: number
  onClose: () => void
}) {
  const { t } = useLanguage()
  const count = items.length
  const loop = count > 1

  // Clone-edges track: [last, ...items, first]. Moving onto a clone animates
  // normally, then transitionend snaps to the real twin with transitions off,
  // so the wrap is invisible.
  const slides = loop ? [items[count - 1], ...items, items[0]] : items
  const offset = loop ? 1 : 0

  const clamped = Math.min(Math.max(startIndex, 0), Math.max(count - 1, 0))
  const [pos, setPos] = useState(clamped + offset)
  const [animate, setAnimate] = useState(true)
  const [reduced, setReduced] = useState(false)
  const [mounted, setMounted] = useState(false)

  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])
  const touchStartX = useRef<number | null>(null)

  const transitionsOn = animate && !reduced
  const realIndex = loop ? (((pos - 1) % count) + count) % count : pos

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => setReduced(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  // Lock background scroll for as long as the overlay is up.
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [])

  const go = useCallback((delta: 1 | -1) => {
    if (!loop) return
    setPos(p => {
      const next = p + delta
      // Out of track bounds means a second press landed before the pending
      // snap; drop it rather than sliding into empty space.
      return next < 0 || next > count + 1 ? p : next
    })
  }, [loop, count])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1) }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1) }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [go, onClose])

  // Re-enable the transition only after the browser has painted the snapped
  // position, otherwise the snap itself animates and the jump becomes visible.
  useEffect(() => {
    if (animate) return
    let inner = 0
    const outer = requestAnimationFrame(() => { inner = requestAnimationFrame(() => setAnimate(true)) })
    return () => { cancelAnimationFrame(outer); cancelAnimationFrame(inner) }
  }, [animate])

  // With transitions off there is no transitionend to snap on, so normalise here.
  useEffect(() => {
    if (transitionsOn || !loop) return
    if (pos === 0) setPos(count)
    else if (pos === count + 1) setPos(1)
  }, [transitionsOn, loop, pos, count])

  // Only the slide actually on screen may play; everything else (including a
  // clone showing the same source) is paused.
  useEffect(() => {
    videoRefs.current.forEach((video, i) => {
      if (video && i !== pos && !video.paused) video.pause()
    })
  }, [pos])

  const handleTransitionEnd = (e: React.TransitionEvent) => {
    if (e.propertyName !== 'transform' || !loop) return
    if (pos === 0) { setAnimate(false); setPos(count) }
    else if (pos === count + 1) { setAnimate(false); setPos(1) }
  }

  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(dx) < SWIPE_THRESHOLD) return
    go(dx < 0 ? 1 : -1)
  }

  if (!mounted || count === 0) return null

  const stop = (e: React.MouseEvent) => e.stopPropagation()

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Gallery"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(6,6,12,.95)', backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'flex', flexDirection: 'column',
      }}
    >
      <button
        type="button"
        onClick={(e) => { stop(e); onClose() }}
        aria-label={t('common_close')}
        style={{ ...roundBtn, position: 'absolute', top: 18, right: 18, zIndex: 2 }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>

      <div
        style={{ flex: 1, position: 'relative', overflow: 'hidden' }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div
          onTransitionEnd={handleTransitionEnd}
          style={{
            display: 'flex', height: '100%',
            transform: `translate3d(${-pos * 100}%, 0, 0)`,
            transition: transitionsOn ? TRANSITION : 'none',
          }}
        >
          {slides.map((item, i) => (
            <div
              key={i}
              style={{
                minWidth: '100%', height: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                // The overlay fills the screen; the media itself stays centred
                // with breathing room around it, never edge-to-edge.
                padding: '64px 56px',
                boxSizing: 'border-box',
              }}
            >
              {item.type === 'video' ? (
                <video
                  ref={(el) => { videoRefs.current[i] = el }}
                  src={item.url}
                  poster={item.poster || undefined}
                  controls
                  playsInline
                  preload="metadata"
                  onClick={stop}
                  style={{ maxWidth: '88%', maxHeight: '88%', borderRadius: 8, outline: 'none' }}
                />
              ) : (
                <img
                  src={item.url}
                  alt=""
                  onClick={stop}
                  style={{ maxWidth: '88%', maxHeight: '88%', objectFit: 'contain', borderRadius: 8 }}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {loop && (
        <>
          <button
            type="button"
            onClick={(e) => { stop(e); go(-1) }}
            aria-label={t('common_prev')}
            style={{ ...roundBtn, position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', zIndex: 2 }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={(e) => { stop(e); go(1) }}
            aria-label={t('common_next')}
            style={{ ...roundBtn, position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', zIndex: 2 }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      <div
        style={{
          padding: '0 0 22px', textAlign: 'center',
          fontSize: 13, letterSpacing: '1px', color: 'rgba(255,255,255,0.55)',
        }}
      >
        {realIndex + 1} / {count}
      </div>
    </div>,
    document.body,
  )
}

const roundBtn: React.CSSProperties = {
  width: 42, height: 42, borderRadius: '50%',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'rgba(255,255,255,0.08)', color: '#fff',
  border: '1px solid rgba(255,255,255,0.14)', cursor: 'pointer',
  backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
}
