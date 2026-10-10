import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '../../../lib/supabase'
import { verifyAdminToken } from '@/app/lib/adminAuth'
import { revalidatePublicPaths } from '@/app/lib/revalidateContent'
import { withIngestedEventImage } from '@/app/lib/ingestImage'
import { spotCoordsError } from '@/app/lib/mapsCoords'

function isAdmin(req: NextRequest) {
  return verifyAdminToken(req.cookies.get('admin_auth')?.value)
}

const VALID_TABLES = ['events', 'articles', 'music_releases', 'mixes', 'playlists', 'artists', 'spots', 'listings']

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { table, id, data } = await req.json()

  if (!VALID_TABLES.includes(table) || !id || !data) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()

  // Same Storage ingest as /api/admin/add. An already-ingested URL classifies as
  // ours and is skipped, so re-saving an event does not re-upload its cover.
  let row = data as Record<string, unknown>
  let imageWarning: string | undefined
  // Same rule as PATCH /api/spots/[id], except that an old spot with no pin
  // can still be edited (both null) instead of being blocked on the map.
  if (table === 'spots') {
    const coordsError = spotCoordsError(row, { allowEmpty: true })
    if (coordsError) return NextResponse.json({ error: coordsError }, { status: 400 })
  }
  if (table === 'events' && typeof row.image_url === 'string' && row.image_url.trim()) {
    // The edit forms normally send the flag along, but a partial payload has to
    // be checked against the stored row rather than assumed false.
    let restricted = row.has_copyright_restriction
    if (restricted === undefined) {
      const { data: existing } = await admin
        .from('events')
        .select('has_copyright_restriction')
        .eq('id', id)
        .single()
      restricted = existing?.has_copyright_restriction
    }
    const ingested = await withIngestedEventImage(row, !!restricted)
    row = ingested.row
    imageWarning = ingested.warning
  }

  const { error } = await admin.from(table).update(row).eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  revalidatePublicPaths(table)
  return NextResponse.json({ ok: true, imageWarning })
}
