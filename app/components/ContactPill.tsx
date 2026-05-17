'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  email?: string | null
  phone?: string | null
}

export default function ContactPill({ email, phone }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  if (!email && !phone) return null

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="text-xs px-3 py-1.5 rounded-full font-semibold transition-opacity hover:opacity-80"
        style={{ backgroundColor: '#E8A020', color: '#0F0F1A' }}
      >
        Contact
      </button>

      {open && (
        <div
          className="absolute top-full left-0 mt-2 z-50 rounded-xl p-4"
          style={{
            backgroundColor: '#1A1A2E',
            border: '0.5px solid rgba(232,160,32,0.25)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            minWidth: '220px',
          }}
        >
          <button
            onClick={() => setOpen(false)}
            className="absolute top-2.5 right-3 text-xs transition-opacity hover:opacity-60"
            style={{ color: 'rgba(255,255,255,0.3)', lineHeight: 1 }}
            aria-label="Close"
          >
            ✕
          </button>

          <div className="flex flex-col gap-3 pr-4">
            {email && (
              <div className="flex flex-col gap-0.5">
                <span className="text-xs uppercase tracking-widest font-medium" style={{ color: 'rgba(255,255,255,0.3)' }}>Email</span>
                <a
                  href={`mailto:${email}`}
                  className="text-sm font-medium transition-opacity hover:opacity-80 truncate"
                  style={{ color: '#E8A020' }}
                >
                  {email}
                </a>
              </div>
            )}
            {phone && (
              <div className="flex flex-col gap-0.5">
                <span className="text-xs uppercase tracking-widest font-medium" style={{ color: 'rgba(255,255,255,0.3)' }}>Phone</span>
                <a
                  href={`tel:${phone}`}
                  className="text-sm font-medium transition-opacity hover:opacity-80"
                  style={{ color: '#E8A020' }}
                >
                  {phone}
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
