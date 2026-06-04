import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase-server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: existing } = await supabase
    .from('music_releases')
    .select('profile_id')
    .eq('id', id)
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'Release not found' }, { status: 404 })
  }

  if (existing.profile_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const allowed = [
    'title', 'artist', 'type', 'primary_genre', 'secondary_genres',
    'label', 'release_date', 'description', 'cover_image',
    'soundcloud_url', 'spotify_url', 'apple_music_url',
    'youtube_url', 'bandcamp_url', 'beatport_url', 'deezer_url',
    'producers', 'composers', 'featuring_artists',
    'mastering_engineer', 'artwork_by',
  ]

  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  const { data, error } = await supabase
    .from('music_releases')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
