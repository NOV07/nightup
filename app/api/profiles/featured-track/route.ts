import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase-server'
import { resolveSoundcloudUrl, takeRateLimit, SoundcloudError } from '@/app/lib/soundcloud'

// POST { url } — validates a Featured Track URL before it is saved and expands
// on.soundcloud.com short links to the canonical soundcloud.com/artist/track
// URL. It fetches a user-supplied URL, so it is authenticated, rate limited,
// and restricted to an exact-hostname allowlist on every redirect hop.
// Returns { url } or { error: <code> }; no upstream body is ever returned.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!takeRateLimit(user.id)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  }

  let body: { url?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_url' }, { status: 400 })
  }
  const input = typeof body.url === 'string' ? body.url.trim() : ''
  if (!input || input.length > 2048) {
    return NextResponse.json({ error: 'invalid_url' }, { status: 400 })
  }

  try {
    const url = await resolveSoundcloudUrl(input)
    return NextResponse.json({ url })
  } catch (e) {
    const code = e instanceof SoundcloudError ? e.code : 'fetch_failed'
    const status = code === 'fetch_failed' || code === 'too_many_redirects' ? 502 : 400
    return NextResponse.json({ error: code }, { status })
  }
}
