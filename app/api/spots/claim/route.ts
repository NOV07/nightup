import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase-server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile required' }, { status: 400 })

  let body: { spotId?: string; note?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { spotId, note } = body
  if (!spotId) return NextResponse.json({ error: 'spotId required' }, { status: 400 })

  const { error } = await supabase
    .from('spot_claims')
    .insert({ spot_id: spotId, profile_id: profile.id, note: note ?? null })

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'already requested' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
