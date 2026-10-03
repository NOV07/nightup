'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/app/components/LanguageContext'
import TranslatedText from '@/app/components/TranslatedText'
import { isSafeInternalPath } from '@/app/lib/safeLink'
import { timeAgo } from '@/app/lib/timeAgo'
import type { TranslationKey } from '@/app/lib/translations'

interface Actor {
  display_name: string
  username: string
}

interface Notification {
  id: string
  type: string
  title: string
  body: string | null
  link: string | null
  read: boolean
  created_at: string
  actor: Actor | null
}

interface ApiResponse {
  notifications: Notification[]
  unread_count: number
}

// The listing title is only kept inside the stored (Greek) title written by
// /api/listings/[id]/interest, so it is read back from there. A title cut off by
// notify.ts's length cap has no closing » and falls back to the generic wording.
const LISTING_TITLE_RE = /ενδιαφέρθηκε για «([\s\S]+)»$/

type Copy = { title: string; body: string | null }

/**
 * Notifications are stored with Greek title/body. For the types the server
 * writes, the text is rebuilt in the viewer's language from type + actor;
 * anything else keeps the stored text (machine-translated in EN).
 */
function notificationCopy(n: Notification, t: (key: TranslationKey) => string): Copy | null {
  const name = n.actor?.display_name || t('notif_someone')
  const fill = (key: TranslationKey, title = '') =>
    t(key).replace('{name}', name).replace('{title}', title)

  switch (n.type) {
    case 'new_follow':
      return { title: fill('notif_new_follow'), body: null }
    case 'listing_interest': {
      const listingTitle = n.title.match(LISTING_TITLE_RE)?.[1]
      return {
        title: listingTitle ? fill('notif_listing_interest', listingTitle) : fill('notif_listing_interest_any'),
        body: t('notif_listing_interest_body'),
      }
    }
    default:
      return null
  }
}

function initials(displayName: string | undefined): string {
  if (!displayName) return '?'
  return displayName.slice(0, 2).toUpperCase()
}

export default function NotificationBell() {
  const [data, setData]   = useState<ApiResponse>({ notifications: [], unread_count: 0 })
  const [open, setOpen]   = useState(false)
  const ref               = useRef<HTMLDivElement>(null)
  const router            = useRouter()
  const { t, lang }       = useLanguage()

  async function fetchNotifications() {
    try {
      const res = await fetch('/api/notifications')
      if (!res.ok) return
      setData(await res.json())
    } catch {}
  }

  useEffect(() => {
    fetchNotifications()
    const id = setInterval(fetchNotifications, 60_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!open) return
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  async function markAllRead() {
    await fetch('/api/notifications', { method: 'PATCH' })
    setData(prev => ({
      notifications: prev.notifications.map(n => ({ ...n, read: true })),
      unread_count: 0,
    }))
  }

  async function handleClick(n: Notification) {
    if (!n.read) {
      await fetch(`/api/notifications/${n.id}`, { method: 'PATCH' })
      setData(prev => ({
        notifications: prev.notifications.map(x => x.id === n.id ? { ...x, read: true } : x),
        unread_count: Math.max(0, prev.unread_count - 1),
      }))
    }
    setOpen(false)
    // Old or forged rows may carry an external or script link: navigate only to in-app paths.
    if (isSafeInternalPath(n.link)) router.push(n.link)
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={t('notif_title')}
        style={{
          position: 'relative',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 16,
          color: 'rgba(255,255,255,0.5)',
        }}
      >
        🔔
        {data.unread_count > 0 && (
          <span style={{
            position: 'absolute',
            top: 2,
            right: 2,
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: '#E8A020',
            border: '1.5px solid rgba(10,10,18,0.9)',
          }} />
        )}
      </button>

      {/* Below 640px the 340px panel would overflow the left edge, so it spans the
          screen with 16px gutters under the 56px mobile navbar. The header's
          backdrop-filter makes it the containing block for `fixed`; it is sticky
          at top 0 and full width, so the offsets still match the viewport. */}
      <style>{`
        .notif-panel { position: absolute; top: 100%; right: 0; width: 340px; }
        @media (max-width: 639px) {
          .notif-panel { position: fixed; top: 56px; left: 16px; right: 16px; width: auto; }
        }
      `}</style>
      {open && (
        <div className="notif-panel" style={{
          backgroundColor: '#0F0F1A',
          border: '1px solid rgba(232,160,32,0.15)',
          borderRadius: 6,
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          maxHeight: 480,
          overflowY: 'auto',
          zIndex: 100,
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            position: 'sticky',
            top: 0,
            backgroundColor: '#0F0F1A',
          }}>
            <span style={{
              fontFamily: 'var(--font-spectral),Georgia,serif',
              fontSize: 16,
              color: '#F4F4F5',
              fontWeight: 600,
            }}>
              {t('notif_title')}
            </span>
            {data.unread_count > 0 && (
              <button
                onClick={markAllRead}
                style={{ fontSize: 11, color: '#E8A020', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                {t('notif_mark_all')}
              </button>
            )}
          </div>

          {/* Body */}
          {data.notifications.length === 0 ? (
            <div style={{ padding: '40px 16px', textAlign: 'center', color: 'rgba(255,255,255,0.40)', fontSize: 13 }}>
              {t('notif_empty')}
            </div>
          ) : (
            data.notifications.map((n, i) => {
              const copy = notificationCopy(n, t)
              const hasBody = copy ? !!copy.body : !!n.body
              return (
              <div
                key={n.id}
                onClick={() => handleClick(n)}
                style={{
                  display: 'flex',
                  gap: 12,
                  padding: '14px 16px',
                  borderBottom: i < data.notifications.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  backgroundColor: n.read ? 'transparent' : 'rgba(232,160,32,0.04)',
                  cursor: isSafeInternalPath(n.link) ? 'pointer' : 'default',
                  transition: 'background-color 0.15s',
                }}
              >
                {/* Actor avatar */}
                <div style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  backgroundColor: n.read ? 'rgba(255,255,255,0.08)' : 'rgba(232,160,32,0.18)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 700,
                  color: n.read ? 'rgba(255,255,255,0.4)' : '#E8A020',
                  flexShrink: 0,
                }}>
                  {initials(n.actor?.display_name)}
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: 13,
                    color: n.read ? 'rgba(255,255,255,0.4)' : '#F4F4F5',
                    lineHeight: 1.4,
                    marginBottom: hasBody ? 4 : 2,
                  }}>
                    {copy ? copy.title : <TranslatedText text={n.title} />}
                  </p>
                  {hasBody && (
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', lineHeight: 1.4, marginBottom: 4 }}>
                      {copy ? copy.body : <TranslatedText text={n.body!} />}
                    </p>
                  )}
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>
                    {timeAgo(n.created_at, lang)}
                  </p>
                </div>
              </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
