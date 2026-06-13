import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase-server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = req.nextUrl
  const city  = searchParams.get('city')
  const role  = searchParams.get('role')
  const type  = searchParams.get('type')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100)

  let query = supabase
    .from('listings')
    .select('*, profiles(display_name, username, avatar_url)')
    .eq('is_active', true)
    .order('is_sponsored', { ascending: false })
    .order('created_at',   { ascending: false })
    .limit(limit)

  if (city) query = query.eq('city', city)
  if (role) query = query.eq('role', role)
  if (type) query = query.eq('type', type)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, profile_type')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'No profile found' }, { status: 400 })
  if (profile.profile_type === 'user') return NextResponse.json({ error: 'Creator account required' }, { status: 403 })

  let body: Record<string, unknown>
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.type || !body.role || !body.title) {
    return NextResponse.json({ error: 'Missing required fields: type, role, title' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('listings')
    .insert({
      profile_id:  profile.id,
      type:        body.type,
      role:        body.role,
      title:       body.title,
      description: body.description ?? null,
      city:        body.city        ?? null,
      date_needed: body.date_needed ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
