'use client'

import { useEffect, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'

// The spot page is ISR (revalidate = 300), so a server-side count would run
// about once per revalidation, not once per visit. The count is taken here,
// on the client, through the increment_spot_views RPC.
//
// Counted once per visit: the ref stops React StrictMode's double effect in
// dev, and the sessionStorage key stops a refresh or back-navigation in the
// same session from counting again. Failures are silent by design.
export default function SpotViewTracker({ spotId }: { spotId: string }) {
  const sent = useRef(false)

  useEffect(() => {
    if (sent.current) return
    sent.current = true

    const key = `spot-viewed:${spotId}`
    try {
      if (sessionStorage.getItem(key)) return
      // Set before the call so a second mount can't race it.
      sessionStorage.setItem(key, '1')
    } catch {
      // sessionStorage blocked (private mode, etc.): count anyway, the ref still guards this mount.
    }

    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      supabase.rpc('increment_spot_views', { p_spot_id: spotId }).then(() => {}, () => {})
    } catch {
      // never break the page over analytics
    }
  }, [spotId])

  return null
}
