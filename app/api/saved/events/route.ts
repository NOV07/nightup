import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase-server'

// GET — returns all saved event IDs for the current user
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('saved_events')
    .select('event_id')
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data.map(r => r.event_id))
}

// POST { event_id } — save an event
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { event_id?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { event_id } = body
  if (!event_id) return NextResponse.json({ error: 'event_id required' }, { status: 400 })

  const { error } = await supabase
    .from('saved_events')
    .insert({ user_id: user.id, event_id })

  if (error) {
    // unique violation — already saved, treat as success
    if (error.code === '23505') return NextResponse.json({ ok: true })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

// DELETE ?event_id=xxx — unsave an event
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const event_id = req.nextUrl.searchParams.get('event_id')
  if (!event_id) return NextResponse.json({ error: 'event_id required' }, { status: 400 })

  const { error } = await supabase
    .from('saved_events')
    .delete()
    .eq('user_id', user.id)
    .eq('event_id', event_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
