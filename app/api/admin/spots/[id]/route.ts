import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/app/lib/supabase'
import { verifyAdminToken } from '@/app/lib/adminAuth'
import { revalidatePublicPaths } from '@/app/lib/revalidateContent'
import { buildSpotUpdates, checkAdminSpotExtras } from '@/app/lib/spotInput'

/**
 * Admin edit of any spot, with the same validation as the owner route
 * (PATCH /api/spots/[id]) but no owner_id check. On top of the owner columns
 * it accepts slug, featured, is_sponsored, rating and is_published.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!verifyAdminToken(req.cookies.get('admin_auth')?.value)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const admin = getSupabaseAdmin()

  const { data: existing } = await admin
    .from('spots')
    .select('categories, address')
    .eq('id', id)
    .maybeSingle()
  if (!existing) {
    return NextResponse.json({ error: 'Spot not found' }, { status: 404 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // An old spot with no pin can still be edited (both null), like /api/admin/update.
  const built = buildSpotUpdates(body, existing, { allowEmptyPin: true })
  if (!built.ok) {
    return NextResponse.json({ error: built.error, ...(built.code ? { code: built.code } : {}) }, { status: 400 })
  }
  const checked = checkAdminSpotExtras(body)
  if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 400 })

  const updates: Record<string, unknown> = { ...built.updates, ...checked.extras }

  if (typeof updates.slug === 'string') {
    const { data: clash } = await admin
      .from('spots').select('id').eq('slug', updates.slug).neq('id', id).limit(1)
    if (clash && clash.length) {
      return NextResponse.json({ error: `Slug "${updates.slug}" is already used by another spot` }, { status: 409 })
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { data, error } = await admin
    .from('spots')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  revalidatePublicPaths('spots')
  return NextResponse.json(data)
}
