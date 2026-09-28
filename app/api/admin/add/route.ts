import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '../../../lib/supabase'
import { verifyAdminToken } from '@/app/lib/adminAuth'
import { revalidatePublicPaths } from '@/app/lib/revalidateContent'
import { withIngestedEventImage } from '@/app/lib/ingestImage'

function isAdmin(req: NextRequest) {
  return verifyAdminToken(req.cookies.get('admin_auth')?.value)
}

const VALID_TABLES = ['events', 'articles', 'music_releases', 'mixes', 'playlists', 'artists', 'spots']

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { table, data } = await req.json()

  if (!VALID_TABLES.includes(table) || !data) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

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
