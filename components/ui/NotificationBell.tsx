'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

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

function timeAgo(dateStr: string): string {
  const now = new Date()
  const d = new Date(dateStr)
  const diffMins  = Math.floor((now.getTime() - d.getTime()) / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays  = Math.floor(diffHours / 24)

  if (diffMins < 1)   return 'μόλις τώρα'
  if (diffMins < 60)  return `πριν ${diffMins} ${diffMins === 1 ? 'λεπτό' : 'λεπτά'}`
  if (diffHours < 24) return `πριν ${diffHours} ${diffHours === 1 ? 'ώρα' : 'ώρες'}`
  if (diffDays === 1) return 'χθες'
  if (diffDays < 7)   return `πριν ${diffDays} μέρες`
  return d.toLocaleDateString('el-GR', { day: 'numeric', month: 'short' })
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
    if (n.link) router.push(n.link)
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Ειδοποιήσεις"
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

      {open && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          width: 340,
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
              Ειδοποιήσεις
            </span>
            {data.unread_count > 0 && (
              <button
                onClick={markAllRead}
                style={{ fontSize: 11, color: '#E8A020', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                Σήμαν όλες ως διαβασμένες
              </button>
            )}
          </div>

          {/* Body */}
          {data.notifications.length === 0 ? (
            <div style={{ padding: '40px 16px', textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>
              Δεν έχεις ειδοποιήσεις ακόμα
            </div>
          ) : (
            data.notifications.map((n, i) => (
              <div
                key={n.id}
                onClick={() => handleClick(n)}
                style={{
                  display: 'flex',
                  gap: 12,
                  padding: '14px 16px',
                  borderBottom: i < data.notifications.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  backgroundColor: n.read ? 'transparent' : 'rgba(232,160,32,0.04)',
                  cursor: n.link ? 'pointer' : 'default',
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
                    marginBottom: n.body ? 4 : 2,
                  }}>
                    {n.title}
                  </p>
                  {n.body && (
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', lineHeight: 1.4, marginBottom: 4 }}>
                      {n.body}
                    </p>
                  )}
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>
                    {timeAgo(n.created_at)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
