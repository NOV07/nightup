import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase-server'
import { validateUsername, escapeLike } from '@/app/lib/username'

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Profile already exists' }, { status: 400 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // profile_type is deliberately not read from the body: every account starts
  // as a plain 'user' and is promoted by /api/admin/approve-upgrade.
  const { username, display_name, bio, instagram, website, avatar_url } = body

  if (!username || !display_name) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const usernameError = validateUsername(username)
  if (usernameError) {
    return NextResponse.json({ error: usernameError }, { status: 400 })
  }

  const { data: taken } = await supabase
    .from('profiles')
    .select('id')
    .ilike('username', escapeLike(username as string))
    .limit(1)
  if (taken && taken.length > 0) {
    return NextResponse.json({ error: 'Username already taken' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      username,
      display_name,
      profile_type: 'user',
      bio: bio || null,
      instagram: instagram || null,
      website: website || null,
      avatar_url: avatar_url || null,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Username already taken' }, { status: 400 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function GET() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  return NextResponse.json(data)
}
