import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '../../lib/supabase'

// 'professionals' was here for the About page's profile form, which is gone —
// profiles are created through /upgrade, and the table itself is being dropped.
const VALID_TABLES = ['events'] as const

// Same allowlist app/api/events/route.ts enforces on its (authenticated)
// insert — this endpoint is unauthenticated, so without it a caller could
// set columns like nightup_pick, is_radar_pick, interested_count or
// featured_until directly (mass assignment), bypassing the admin curation
// those fields are meant to gate.
const EVENT_FIELDS = [
  'title', 'genres', 'type', 'short_description', 'full_description',
  'date', 'time', 'end_time', 'venue', 'city', 'address', 'maps_url', 'image_url',
  'gallery', 'ticket_url', 'price', 'age_restriction_level', 'dress_code', 'lineup', 'contributors',
  'instagram', 'facebook', 'tiktok', 'contact_email',
]

export async function POST(req: NextRequest) {
  let body: { table: string; data: Record<string, unknown> }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { table, data } = body

  if (!VALID_TABLES.includes(table as (typeof VALID_TABLES)[number]) || !data) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  // Minimum required fields only
  if (table === 'events' && (!data.title || !data.date)) {
    return NextResponse.json({ error: 'Missing required fields: title, date' }, { status: 400 })
  }

  const payload: Record<string, unknown> = {}
  EVENT_FIELDS.forEach((k) => { if (k in data) payload[k] = data[k] })

  try {
    const supabase = getSupabase()
    const { error } = await supabase
      .from(table)
      .insert({ ...payload, status: 'pending' })

    if (error) {
      console.error('[submit] Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[submit] Exception:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
