'use client'
import { useEffect, useState } from 'react'

/**
 * The current moment, read in the browser. null until the page has mounted, so
 * the cached server HTML never carries a "now". It ticks when the minute
 * changes (checked twice a minute) and when the tab becomes visible again, so a
 * map left open overnight moves on to the new night by itself.
 */
export function useAthensNow(): Date | null {
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    const tick = () => setNow(prev => {
      const d = new Date()
      return prev && Math.floor(prev.getTime() / 60_000) === Math.floor(d.getTime() / 60_000) ? prev : d
    })
    tick()
    const id = setInterval(tick, 30_000)
    const onVisible = () => { if (document.visibilityState === 'visible') tick() }
    document.addEventListener('visibilitychange', onVisible)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible) }
  }, [])
  return now
}
