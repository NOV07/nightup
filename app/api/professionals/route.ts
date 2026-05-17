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

  if (profile.profile_type !== 'professional' && profile.profile_type !== 'venue') {
    return NextResponse.json({ error: 'Only professionals and venues can submit listings' }, { status: 403 })
  }

  const { data: existing } = await supabase
    .from('professionals')
    .select('id')
    .eq('profile_id', profile.id)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Listing already exists. Use PATCH to update.' }, { status: 400 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.name || !body.category) {
    return NextResponse.json({ error: 'Missing required fields: name, category' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('professionals')
    .insert({
      ...body,
      profile_id: profile.id,
      is_published: false,
    })
    .select()
    .single()

  if (error) {
    console.error('[professionals] Supabase error:', error)
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
    .from('professionals')
    .select('*')
    .eq('profile_id', profile.id)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
