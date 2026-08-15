import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase-server'
import { slugify, uniqueSlug } from '@/app/lib/slug'

// Kept in sync with the spot_category enum in Postgres.
const CATEGORIES = ['food', 'drink', 'nightlife', 'show', 'chill', 'activity', 'art', 'wellness']

export const SPOT_FIELDS = [
  'name', 'category', 'subcategory', 'city', 'neighborhood', 'address',
  'lat', 'lng', 'description', 'cover_image',
  'crop_x', 'crop_y', 'crop_width', 'crop_height',
  'gallery', 'price_level', 'phone', 'website', 'instagram', 'opening_hours',
]

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

  if (profile.profile_type !== 'spot') {
    return NextResponse.json({ error: 'Only spot accounts can create a spot' }, { status: 403 })
  }

  // One spot per account.
  const { data: owned } = await supabase
    .from('spots')
    .select('id, slug')
    .eq('owner_id', profile.id)
    .maybeSingle()

  if (owned) {
    return NextResponse.json(
      { error: 'This account already has a spot. Edit the existing one instead.', spot_id: owned.id },
      { status: 409 },
    )
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

  if (!CATEGORIES.includes(String(body.category))) {
    return NextResponse.json({ error: `category must be one of: ${CATEGORIES.join(', ')}` }, { status: 400 })
  }

  // lat/lng back the generated `geo` column that powers proximity search, so a
  // spot without them would be invisible to TonightModal.
  if (body.lat == null || body.lng == null) {
    return NextResponse.json({ error: 'Missing coordinates. Paste a Google Maps URL that contains @lat,lng' }, { status: 400 })
  }

  const payload: Record<string, unknown> = {}
  SPOT_FIELDS.forEach(k => { if (k in body) payload[k] = body[k] })

  // Only slugs that share the candidate's root can possibly collide with it
  // (root, root-2, root-3, …) — no need to pull the whole table.
  const slugRoot = slugify(String(body.name)) || 'spot'
  const { data: existingSlugs } = await supabase.from('spots').select('slug').ilike('slug', `${slugRoot}%`)
  const slug = uniqueSlug(
    slugRoot,
    new Set((existingSlugs ?? []).map(r => r.slug).filter(Boolean) as string[]),
  )

  const { data, error } = await supabase
    .from('spots')
    .insert({
      ...payload,
      slug,
      owner_id: profile.id,
      // spots has no status column — is_published is the gate every public
      // read filters on, and admin flips it from the pending queue.
      is_published: false,
    })
    .select()
    .single()

  if (error) {
    console.error('[spots] Supabase error:', error)
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
    .from('spots')
    .select('*')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
