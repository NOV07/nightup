import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase-server'
import { CURRENCIES, parsePriceInput } from '@/app/lib/formatPrice'
import { parseEventGenres } from '@/app/lib/genres'
import { eventCoordsError } from '@/app/lib/mapsCoords'

// Kept in sync with AGE_LEVELS in components/events/EventFormSteps.tsx.
// Duplicated rather than imported: that module is a client component.
const AGE_LEVELS = ['none', '18+', '21+']

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: event, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !event) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (event.profile_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  return NextResponse.json(event)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, profile_type')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'No profile found' }, { status: 400 })
  if (!['organizer', 'professional', 'spot', 'venue', 'artist'].includes(profile.profile_type)) {
    return NextResponse.json({ error: 'Only organizers, artists, professionals, spots and venues can edit events' }, { status: 403 })
  }

  const { data: existing } = await supabase
    .from('events')
    .select('profile_id, maps_url')
    .eq('id', id)
    .single()

  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (existing.profile_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if ('age_restriction_level' in body && !AGE_LEVELS.includes(String(body.age_restriction_level))) {
    return NextResponse.json({ error: `age_restriction_level must be one of: ${AGE_LEVELS.join(', ')}` }, { status: 400 })
  }

  if ('currency' in body && !(CURRENCIES as readonly string[]).includes(String(body.currency))) {
    return NextResponse.json({ error: `currency must be one of: ${CURRENCIES.join(', ')}` }, { status: 400 })
  }

  const coordsError = eventCoordsError(body)
  if (coordsError) return NextResponse.json({ error: coordsError }, { status: 400 })

  const allowed = [
    'title', 'genres', 'type', 'short_description', 'full_description',
    'date', 'time', 'end_time', 'venue', 'city', 'address', 'maps_url', 'image_url',
    'gallery', 'ticket_url', 'price', 'currency', 'age_restriction_level', 'dress_code', 'lineup', 'contributors',
    'instagram', 'facebook', 'tiktok', 'contact_email',
    'lat', 'lng',
    // legacy fields kept for backwards compat
    'genre', 'description', 'min_age',
  ]
  const payload: Record<string, unknown> = {}
  allowed.forEach(k => { if (k in body) payload[k] = body[k] })

  // A new link without a new pin (an API client, not the form) would leave the old
  // place on the map: clear it. The form always sends lat/lng together with maps_url.
  if ('maps_url' in body && !('lat' in body) && !('lng' in body)) {
    const next = typeof body.maps_url === 'string' ? body.maps_url.trim() : ''
    if (next !== String(existing.maps_url ?? '').trim()) { payload.lat = null; payload.lng = null }
  }

  // Keys only; the legacy singular `genre` always mirrors genres[0].
  if ('genres' in body || 'genre' in body) {
    const parsedGenres = parseEventGenres('genres' in body ? body.genres : (body.genre ? [body.genre] : []))
    if (!parsedGenres.ok) return NextResponse.json({ error: parsedGenres.error }, { status: 400 })
    payload.genres = parsedGenres.genres
    payload.genre = parsedGenres.genre
  }

  // Free-text organiser is an artist-only field; it must stay non-empty.
  if (profile.profile_type === 'artist' && 'editorial_owner_name' in body) {
    const organizerName = typeof body.editorial_owner_name === 'string' ? body.editorial_owner_name.trim() : ''
    if (!organizerName) {
      return NextResponse.json({ error: 'editorial_owner_name cannot be empty' }, { status: 400 })
    }
    payload.editorial_owner_name = organizerName
  }

  // Only when the caller actually sent a price: the unconditional assignment
  // this replaces wiped the stored price on any partial PATCH.
  if ('price' in payload) payload.price = parsePriceInput(payload.price as string | number | null)

  const { data, error } = await supabase
    .from('events')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
