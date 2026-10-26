import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase-server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, profile_type')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'No profile found. Complete onboarding first.' }, { status: 400 })
  }

  if (profile.profile_type !== 'artist') {
    return NextResponse.json({ error: 'Only artists can submit releases' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.title || !body.artist) {
    return NextResponse.json({ error: 'Missing required fields: title, artist' }, { status: 400 })
  }

  // Same columns an owner may edit in PATCH /api/releases/[id]; status,
  // is_promoted and profile_id are never taken from the client.
  const allowed = [
    'title', 'artist', 'type', 'primary_genre', 'secondary_genres',
    'label', 'release_date', 'description', 'cover_image',
    'soundcloud_url', 'spotify_url', 'apple_music_url',
    'youtube_url', 'bandcamp_url', 'beatport_url', 'deezer_url',
    'producers', 'composers', 'featuring_artists',
    'mastering_engineer', 'artwork_by',
  ]
  const payload: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) payload[key] = body[key]
  }

  const { data, error } = await supabase
    .from('music_releases')
    .insert({
      ...payload,
      profile_id: profile.id,
      status: 'pending',
    })
    .select()
    .single()

  if (error) {
    console.error('[releases] Supabase error:', error)
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'No profile found' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('music_releases')
    .select('*')
    .eq('profile_id', profile.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
