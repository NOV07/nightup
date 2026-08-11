import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '../../../lib/supabase'
import { verifyAdminToken } from '@/app/lib/adminAuth'
import { revalidatePublicPaths } from '@/app/lib/revalidateContent'

function isAdmin(req: NextRequest) {
  return verifyAdminToken(req.cookies.get('admin_auth')?.value)
}

const VALID_TABLES = ['events', 'articles', 'music_releases', 'mixes', 'playlists', 'artists', 'spots', 'profiles', 'listings']

// Content a profile owns. A normal delete is refused while any of these still
// point at it — the operator reassigns or removes the content first. The
// remaining profiles FKs are join/activity rows (follows, listing_interests,
// featured_event_requests, spot_claims) that cascade by design, or
// notifications.actor_id which nulls.
//
// `mode` is what a force delete does with each one:
//   'delete' — the row belongs to the profile and goes with it. Everything
//              downstream of these (saved_events, featured_event_requests,
//              listing_interests) is ON DELETE CASCADE, so they clear too.
//   'detach' — the row is independent editorial content that merely records
//              this profile as owner/claimant. Force delete gives up the
//              ownership link, it does not destroy the spot.
const PROFILE_CONTENT: Array<{
  table: string; column: string; label: string; mode: 'delete' | 'detach'
}> = [
  { table: 'creator_gallery', column: 'profile_id',            label: 'gallery item', mode: 'delete' },
  { table: 'listings',        column: 'profile_id',            label: 'listing',      mode: 'delete' },
  { table: 'music_releases',  column: 'profile_id',            label: 'release',      mode: 'delete' },
  { table: 'artists',         column: 'profile_id',            label: 'artist entry', mode: 'delete' },
  { table: 'events',          column: 'profile_id',            label: 'event',        mode: 'delete' },
  { table: 'spots',           column: 'owner_id',              label: 'owned spot',   mode: 'detach' },
  { table: 'spots',           column: 'claimed_by_profile_id', label: 'claimed spot', mode: 'detach' },
]

const plural = (n: number, label: string) => `${n} ${label}${n === 1 ? '' : 's'}`

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { table, id, force, deleteAuthUser } = await req.json()

  if (!VALID_TABLES.includes(table) || !id) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  // force/deleteAuthUser only mean anything for profiles; refuse rather than
  // silently ignore them, so a miswired caller is loud instead of surprising.
  if ((force || deleteAuthUser) && table !== 'profiles') {
    return NextResponse.json({ error: 'force and deleteAuthUser apply to profiles only' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()
  const steps: string[] = []

  if (table === 'profiles') {
    const counts = await Promise.all(
      PROFILE_CONTENT.map(async (entry) => {
        const { count, error } = await admin.from(entry.table).select('id', { count: 'exact', head: true }).eq(entry.column, id)
        // A broken check must not read as "nothing to protect".
        if (error) return { entry, count: 0, error: error.message }
        return { entry, count: count ?? 0, error: null }
      })
    )

    const blocking = counts.filter(c => c.error || c.count > 0)

    if (blocking.length && !force) {
      const described = blocking.map(c =>
        c.error ? `${c.entry.label}s: check failed (${c.error})` : plural(c.count, c.entry.label)
      )
      return NextResponse.json(
        { error: `This profile still owns content: ${described.join(', ')}. Reassign or delete that first, or use Force Delete.` },
        { status: 409 }
      )
    }

    if (force) {
      // A failed check means we do not know what is there, so we must not
      // barrel through it.
      const broken = counts.find(c => c.error)
      if (broken) {
        return NextResponse.json(
          { error: `Cannot force delete: could not read ${broken.entry.table}.${broken.entry.column} (${broken.error}). Nothing was deleted.`, steps },
          { status: 500 }
        )
      }

      // No transaction is available over PostgREST, so this runs as a sequence
      // and stops at the first failure, reporting exactly how far it got.
      for (const { entry, count } of counts) {
        if (count === 0) continue
        const q = admin.from(entry.table)
        const { error } = entry.mode === 'detach'
          ? await q.update({ [entry.column]: null }).eq(entry.column, id)
          : await q.delete().eq(entry.column, id)

        if (error) {
          return NextResponse.json({
            error: `Force delete stopped at ${entry.table}.${entry.column}: ${error.message}. The profile was NOT deleted. Completed before this: ${steps.length ? steps.join('; ') : 'nothing'}.`,
            steps,
          }, { status: 500 })
        }
        steps.push(`${entry.mode === 'detach' ? 'detached' : 'deleted'} ${plural(count, entry.label)}`)
      }
    }
  }

  const { error } = await admin.from(table).delete().eq('id', id)
  if (error) {
    return NextResponse.json({
      error: `${steps.length ? `Owned content was already removed (${steps.join('; ')}), but the ` : 'The '}${table} row failed to delete: ${error.message}`,
      steps,
    }, { status: 500 })
  }
  steps.push(`deleted the ${table === 'profiles' ? 'profile' : table} row`)

  // Without this the row lingers on the live site until the page's revalidate
  // window expires. A force delete also touched the tables in PROFILE_CONTENT,
  // so those pages need clearing too.
  revalidatePublicPaths(table)
  if (table === 'profiles' && force) {
    for (const owned of new Set(PROFILE_CONTENT.map(e => e.table))) {
      revalidatePublicPaths(owned)
    }
  }

  // The auth account is deliberately separate: profiles.id is the auth user id,
  // but removing the login is a bigger action than removing the profile, so it
  // only happens when explicitly asked for. Done last — deleting the auth user
  // first could cascade the profile away underneath us.
  let authUser: 'deleted' | 'skipped' | string = 'skipped'
  if (deleteAuthUser) {
    const { error: authError } = await admin.auth.admin.deleteUser(id)
    authUser = authError ? `failed: ${authError.message}` : 'deleted'
  }

  return NextResponse.json({ ok: true, steps, authUser })
}
