import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '../../../lib/supabase'
import { verifyAdminToken } from '@/app/lib/adminAuth'
import { revalidatePublicPaths } from '@/app/lib/revalidateContent'
import { withIngestedEventImage } from '@/app/lib/ingestImage'
import { spotCoordsError } from '@/app/lib/mapsCoords'
import { withSpotTaxonomy, spotAddressLinkError, ADDRESS_IS_LINK, ADDRESS_IS_LINK_MESSAGE } from '@/app/lib/spotInput'

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

    // The admin edit form posts the whole row back, so only a changed address
    // counts. The stored one is read only when the new text holds a link.
    if (typeof row.address === 'string' && spotAddressLinkError(row.address)) {
      const { data: stored } = await admin.from('spots').select('address').eq('id', id).maybeSingle()
      if (spotAddressLinkError(row.address, stored?.address)) {
        return NextResponse.json({ error: ADDRESS_IS_LINK_MESSAGE, code: ADDRESS_IS_LINK }, { status: 400 })
      }
    }

    // Category/subcategory go through the same validator as every other spot
    // write; a payload without them (e.g. the featured star) is left alone.
    let existingCategories: string[] = []
    if (row.subcategories !== undefined || row.subcategory !== undefined) {
      const { data: stored } = await admin.from('spots').select('categories').eq('id', id).maybeSingle()
      existingCategories = stored?.categories ?? []
    }
    const taxonomy = withSpotTaxonomy(row, { required: false, existingCategories })
    if (!taxonomy.ok) return NextResponse.json({ error: taxonomy.error }, { status: 400 })
    row = taxonomy.row
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
