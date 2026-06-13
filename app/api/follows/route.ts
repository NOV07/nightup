import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase-server'

// GET ?profile_id=xxx — check if current user follows this profile
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ following: false })

  const profile_id = req.nextUrl.searchParams.get('profile_id')
  if (!profile_id) return NextResponse.json({ error: 'profile_id required' }, { status: 400 })

  const { data } = await supabase
    .from('follows')
    .select('id')
    .eq('user_id', user.id)
    .eq('profile_id', profile_id)
    .maybeSingle()

  return NextResponse.json({ following: !!data })
}

// POST { profile_id } — follow
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { profile_id?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { profile_id } = body
  if (!profile_id) return NextResponse.json({ error: 'profile_id required' }, { status: 400 })

  const { error } = await supabase
    .from('follows')
    .insert({ user_id: user.id, profile_id })

  if (error) {
    if (error.code === '23505') return NextResponse.json({ ok: true })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Notify the followed user — best effort, don't fail the request
  const { data: actor } = await supabase
    .from('profiles')
    .select('id, display_name, username')
    .eq('id', user.id)
    .single()

  if (actor) {
    await supabase.from('notifications').insert({
      user_id:  profile_id,
      type:     'new_follow',
      title:    `${actor.display_name} σε ακολούθησε`,
      link:     `/profile/${actor.username}`,
      actor_id: actor.id,
    })
  }

  return NextResponse.json({ ok: true })
}

// DELETE ?profile_id=xxx — unfollow
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile_id = req.nextUrl.searchParams.get('profile_id')
  if (!profile_id) return NextResponse.json({ error: 'profile_id required' }, { status: 400 })

  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('user_id', user.id)
    .eq('profile_id', profile_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
