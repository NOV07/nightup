import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase-server'
import { firstUrl } from '@/app/lib/mapsCoords'
import { resolveMapsUrl, takeRateLimit, MapsResolveError } from '@/app/lib/mapsResolve'
import { extractPlaceText, geocodeNominatim } from '@/app/lib/mapsGeocode'

// Expands a Google Maps short link (maps.app.goo.gl, goo.gl/maps, g.co/kgs)
// into coordinates. It fetches a user-supplied URL, so it is authenticated,
// rate limited, and restricted to an exact-hostname allowlist on every hop.
// When the final URL has no coordinates, the address in its /place/ segment
// is geocoded with Nominatim. No upstream body is ever returned: only
// lat, lng, finalUrl, source and, for Nominatim, placeText/precision/unverified.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!takeRateLimit(user.id)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  }

  let body: { url?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_url' }, { status: 400 })
  }
  const input = typeof body.url === 'string' ? body.url.trim() : ''
  if (!input || input.length > 2048) {
    return NextResponse.json({ error: 'invalid_url' }, { status: 400 })
  }
  // Accept the whole pasted text (share sheets prepend the place name), but
  // only when the input is not a bare URL already.
  const url = /^https?:\/\//i.test(input) ? input : firstUrl(input) ?? input

  try {
    const { lat, lng, finalUrl } = await resolveMapsUrl(url)
    return NextResponse.json({ lat, lng, finalUrl, source: 'url' })
  } catch (e) {
    const code = e instanceof MapsResolveError ? e.code : 'fetch_failed'
    if (code === 'no_coords' && e instanceof MapsResolveError && e.finalUrl) {
      const place = extractPlaceText(e.finalUrl)
      const hit = place ? await geocodeNominatim(place) : null
      if (place && hit) {
        return NextResponse.json({
          lat: hit.lat,
          lng: hit.lng,
          finalUrl: e.finalUrl,
          source: 'nominatim',
          placeText: place.text,
          precision: hit.precision,
          ...(hit.unverified ? { unverified: true } : {}),
        })
      }
    }
    const status = code === 'invalid_url' || code === 'blocked_redirect' ? 400
      : code === 'no_coords' ? 422
      : 502
    return NextResponse.json({ error: code }, { status })
  }
}
