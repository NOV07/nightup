import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

async function getSupabaseClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}

export async function POST(req: NextRequest) {
  const supabase = await getSupabaseClient()

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

  if (profile.profile_type !== 'organizer') {
    return NextResponse.json({ error: 'Only organizers can submit events' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.title || !body.date) {
    return NextResponse.json({ error: 'Missing required fields: title, date' }, { status: 400 })
  }

  const allowed = [
    'title', 'genres', 'type', 'short_description', 'full_description',
    'date', 'time', 'end_time', 'venue', 'city', 'address', 'maps_url', 'image_url',
    'ticket_url', 'price', 'age_restriction', 'dress_code', 'lineup',
    'instagram', 'facebook', 'tiktok', 'contact_email',
  ]
  const payload: Record<string, unknown> = {}
  allowed.forEach(k => { if (k in body) payload[k] = body[k] })

  const rawPrice = body.price
  const price = rawPrice ? parseFloat(String(rawPrice).replace(/[^0-9.]/g, '')) || null : null
  payload.price = price

  const { data, error } = await supabase
    .from('events')
    .insert({
      ...payload,
      genres: (body as any).genres ?? [],
      profile_id: profile.id,
      status: 'pending',
    })
    .select()
    .single()

  if (error) {
    console.error('[events] Supabase error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function GET() {
  const supabase = await getSupabaseClient()

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
    .from('events')
    .select('*')
    .eq('profile_id', profile.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
