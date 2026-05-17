import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '../../../lib/supabase'

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-') +
    '-' + Date.now().toString(36)
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { name, bio, logo_url, cover_url, instagram, facebook, soundcloud } = body

  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  const slug = slugify(name.trim())
  const social_links = {
    ...(instagram ? { instagram } : {}),
    ...(facebook ? { facebook } : {}),
    ...(soundcloud ? { soundcloud } : {}),
  }

  try {
    const supabase = getSupabase()
    const { error } = await supabase.from('organizers').insert({
      name: name.trim(),
      slug,
      bio: bio || null,
      logo_url: logo_url || null,
      cover_url: cover_url || null,
      social_links,
      status: 'pending',
    })

    if (error) {
      console.error('[organizers/apply]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[organizers/apply] exception:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
