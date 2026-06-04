import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase-server'

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
  if (profile.profile_type !== 'organizer') return NextResponse.json({ error: 'Only organizers can edit events' }, { status: 403 })

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

  const allowed = [
    'title', 'genres', 'type', 'short_description', 'full_description',
    'date', 'time', 'end_time', 'venue', 'city', 'address', 'maps_url', 'image_url',
    'ticket_url', 'price', 'age_restriction', 'dress_code', 'lineup',
    'instagram', 'facebook', 'tiktok', 'contact_email',
    // legacy fields kept for backwards compat
    'genre', 'description', 'min_age',
  ]
  const payload: Record<string, unknown> = {}
  allowed.forEach(k => { if (k in body) payload[k] = body[k] })

  const rawPrice = body.price
  const price = rawPrice ? parseFloat(String(rawPrice).replace(/[^0-9.]/g, '')) || null : null
  payload.price = price

  const { data, error } = await supabase
    .from('events')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
