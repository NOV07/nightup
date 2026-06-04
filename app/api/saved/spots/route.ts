import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase-server'

// GET — returns all saved spot IDs for the current user
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('saved_spots')
    .select('spot_id')
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data.map(r => r.spot_id))
}

// POST { spot_id } — save a spot
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { spot_id?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { spot_id } = body
  if (!spot_id) return NextResponse.json({ error: 'spot_id required' }, { status: 400 })

  const { error } = await supabase
    .from('saved_spots')
    .insert({ user_id: user.id, spot_id })

  if (error) {
    // unique violation — already saved, treat as success
    if (error.code === '23505') return NextResponse.json({ ok: true })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

// DELETE ?spot_id=xxx — unsave a spot
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const spot_id = req.nextUrl.searchParams.get('spot_id')
  if (!spot_id) return NextResponse.json({ error: 'spot_id required' }, { status: 400 })

  const { error } = await supabase
    .from('saved_spots')
    .delete()
    .eq('user_id', user.id)
    .eq('spot_id', spot_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
