import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase-server'
import { CURRENCIES, parsePriceInput } from '@/app/lib/formatPrice'

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
  if (!['organizer', 'professional', 'spot', 'venue'].includes(profile.profile_type)) {
    return NextResponse.json({ error: 'Only organizers, professionals, spots and venues can edit events' }, { status: 403 })
  }

  const { data: existing } = await supabase
    .from('events')
    .select('profile_id')
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

  const allowed = [
    'title', 'genres', 'type', 'short_description', 'full_description',
    'date', 'time', 'end_time', 'venue', 'city', 'address', 'maps_url', 'image_url',
    'gallery', 'ticket_url', 'price', 'currency', 'age_restriction_level', 'dress_code', 'lineup', 'contributors',
    'instagram', 'facebook', 'tiktok', 'contact_email',
    // legacy fields kept for backwards compat
    'genre', 'description', 'min_age',
  ]
  const payload: Record<string, unknown> = {}
  allowed.forEach(k => { if (k in body) payload[k] = body[k] })

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
