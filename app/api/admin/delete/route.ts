import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '../../../lib/supabase'
import { verifyAdminToken } from '@/app/lib/adminAuth'

function isAdmin(req: NextRequest) {
  return verifyAdminToken(req.cookies.get('admin_auth')?.value)
}

const VALID_TABLES = ['events', 'articles', 'music_releases', 'mixes', 'playlists', 'artists', 'spots', 'profiles']

// Content a profile owns. Deleting the profile must not take these with it, so
// the delete is refused while any of them still point at it — the operator
// reassigns or removes the content first. The remaining profiles FKs are
// join/activity rows (follows, listing_interests, featured_event_requests,
// spot_claims) that cascade by design, or notifications.actor_id which nulls.
const PROFILE_CONTENT: Array<{ table: string; column: string; label: string }> = [
  { table: 'events',          column: 'profile_id',              label: 'event' },
  { table: 'music_releases',  column: 'profile_id',              label: 'release' },
  { table: 'artists',         column: 'profile_id',              label: 'artist entry' },
  { table: 'spots',           column: 'owner_id',                label: 'owned spot' },
  { table: 'spots',           column: 'claimed_by_profile_id',   label: 'claimed spot' },
  { table: 'listings',        column: 'profile_id',              label: 'listing' },
  { table: 'creator_gallery', column: 'profile_id',              label: 'gallery item' },
]

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { table, id } = await req.json()

  if (!VALID_TABLES.includes(table) || !id) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()

  if (table === 'profiles') {
    const counts = await Promise.all(
      PROFILE_CONTENT.map(async ({ table: t, column, label }) => {
        const { count, error } = await admin.from(t).select('id', { count: 'exact', head: true }).eq(column, id)
        // A broken check must not read as "nothing to protect" — treat it as blocking.
        if (error) return `${label}s: check failed (${error.message})`
        return count && count > 0 ? `${count} ${label}${count === 1 ? '' : 's'}` : null
      })
    )
    const blocking = counts.filter(Boolean)
    if (blocking.length) {
      return NextResponse.json(
        { error: `This profile still owns content: ${blocking.join(', ')}. Reassign or delete that first — deleting the profile would orphan or destroy it.` },
        { status: 409 }
      )
    }
  }

  const { error } = await admin.from(table).delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
