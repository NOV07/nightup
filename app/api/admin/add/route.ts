import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '../../../lib/supabase'
import { verifyAdminToken } from '@/app/lib/adminAuth'
import { revalidatePublicPaths } from '@/app/lib/revalidateContent'
import { withIngestedEventImage } from '@/app/lib/ingestImage'
import { checkAdminSpotInput } from '@/app/lib/spotInput'
import { uniqueSlug } from '@/app/lib/slug'

function isAdmin(req: NextRequest) {
  return verifyAdminToken(req.cookies.get('admin_auth')?.value)
}

const VALID_TABLES = ['events', 'articles', 'music_releases', 'mixes', 'playlists', 'artists', 'spots']

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let table: string, data: unknown
  try {
    ({ table, data } = await req.json())
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!VALID_TABLES.includes(table) || !data) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  if (table === 'spots') return addSpot(data)

  // An external poster URL gets pulled into our own Storage bucket, so the row
  // stops depending on a venue site that will delete the file once the event is
  // over. Falls back to the URL as given if that does not work out.
  let row = data as Record<string, unknown>
  let imageWarning: string | undefined
  if (table === 'events') {
    const ingested = await withIngestedEventImage(row, !!row.has_copyright_restriction)
    row = ingested.row
    imageWarning = ingested.warning
  }

  const admin = getSupabaseAdmin()
  const { data: inserted, error } = await admin
    .from(table)
    .insert({ ...row, status: 'approved' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Rows land as 'approved', so they are public straight away and the cached
  // listings need to pick them up.
  revalidatePublicPaths(table)
  return NextResponse.json({ ok: true, data: inserted, imageWarning })
}

const UNIQUE_VIOLATION = '23505'

/**
 * spots has neither `status` nor `profile_id`, so it cannot take the generic
 * insert above. Only whitelisted columns are written, the slug follows the
 * same rule as POST /api/spots, the spot has no owner (a venue takes it over
 * through the claim flow) and is_published is always set explicitly.
 */
async function addSpot(data: unknown) {
  const check = checkAdminSpotInput(data)
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 })

  const admin = getSupabaseAdmin()
  // A slug taken between the read and the insert gets the next suffix instead
  // of a 500, if the column is unique.
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: existing, error: slugError } = await admin
      .from('spots').select('slug').ilike('slug', `${check.slugRoot}%`)
    if (slugError) {
      console.error('[admin/add spots] slug lookup failed:', slugError)
      return NextResponse.json({ error: 'Could not save the spot. Try again.' }, { status: 500 })
    }
    const slug = uniqueSlug(
      check.slugRoot,
      new Set((existing ?? []).map(r => r.slug).filter(Boolean) as string[]),
    )

    const { data: inserted, error } = await admin
      .from('spots')
      .insert({ ...check.row, slug })
      .select()
      .single()

    if (error?.code === UNIQUE_VIOLATION && error.message.includes('slug')) continue
    if (error) {
      console.error('[admin/add spots] insert failed:', error)
      return NextResponse.json({ error: 'Could not save the spot. Try again.' }, { status: 500 })
    }

    if (inserted.is_published) revalidatePublicPaths('spots')
    return NextResponse.json({ ok: true, data: inserted })
  }

  console.error('[admin/add spots] slug still taken after retries:', check.slugRoot)
  return NextResponse.json({ error: 'Could not find a free slug. Try another name or slug.' }, { status: 409 })
}
