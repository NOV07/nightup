import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase-server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { event_id } = await req.json()
  if (!event_id) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // Confirm the event belongs to the authenticated profile
  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('id', event_id)
    .eq('profile_id', user.id)
    .single()

  if (!event) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Check for existing pending request
  const { data: existing } = await supabase
    .from('featured_event_requests')
    .select('id')
    .eq('event_id', event_id)
    .eq('status', 'pending')
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Αίτηση ήδη σε εκκρεμότητα' }, { status: 409 })
  }

  // Insert request
  const { error: insertError } = await supabase
    .from('featured_event_requests')
    .insert({
      event_id,
      profile_id: user.id,
      status: 'pending',
    })

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
