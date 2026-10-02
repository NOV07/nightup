import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/app/lib/supabase-server'
import { getSupabaseAdmin } from '@/app/lib/supabase'
import { revalidatePublicPaths } from '@/app/lib/revalidateContent'

// Self-service account deletion. The admin force delete
// (app/api/admin/delete/route.ts) is a different action with different rules
// (it detaches spots); this route only ever acts on the signed-in user.
//
// Every query here uses the service role, because RLS hides some of these rows
// even from their owner, but every filter is the user id from the verified
// session. Nothing from the request decides whose data is read or deleted.

/** Storage prefixes that hold files a user uploaded. article-images is admin
 *  only, and events/external/ holds admin-ingested posters, not user files. */
function storagePrefixes(uid: string) {
  return [
    { bucket: 'uploads', prefix: uid },               // components/ui/ImageUpload: {uid}/{folder}/...
    { bucket: 'events', prefix: uid },                // app/api/events/upload
    { bucket: 'gallery-media', prefix: `profile/${uid}` }, // app/api/gallery/upload
    { bucket: 'gallery-media', prefix: `spot/${uid}` },
    // Legacy bucket from 20260722000000_creator_gallery.sql ({uid}/...). Nothing
    // writes to it any more, but older gallery files can still live there.
    { bucket: 'creator-gallery', prefix: uid },
  ]
}

/** Every file path under `prefix`, descending into folders. Storage returns a
 *  folder as an entry with no id. */
async function listFilesRecursive(admin: SupabaseClient, bucket: string, prefix: string): Promise<string[]> {
  const files: string[] = []
  const PAGE = 1000
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await admin.storage.from(bucket).list(prefix, { limit: PAGE, offset })
    if (error) throw new Error(`${bucket}/${prefix}: ${error.message}`)
    for (const entry of data ?? []) {
      const path = `${prefix}/${entry.name}`
      if (entry.id) files.push(path)
      else files.push(...await listFilesRecursive(admin, bucket, path))
    }
    if (!data || data.length < PAGE) break
  }
  return files
}

async function countRows(admin: SupabaseClient, table: string, column: string, uid: string, extra?: [string, string]) {
  let q = admin.from(table).select('id', { count: 'exact', head: true }).eq(column, uid)
  if (extra) q = q.eq(extra[0], extra[1])
  const { count, error } = await q
  if (error) throw new Error(`${table}: ${error.message}`)
  return count ?? 0
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin()
  const uid = user.id

  try {
    const [
      savedEvents, savedSpots, going, interested, follows, notifications,
      events, gallery, listings, releases, spotsRes,
    ] = await Promise.all([
      countRows(admin, 'saved_events', 'user_id', uid),
      countRows(admin, 'saved_spots', 'user_id', uid),
      countRows(admin, 'event_reactions', 'user_id', uid, ['reaction_type', 'going']),
      countRows(admin, 'event_reactions', 'user_id', uid, ['reaction_type', 'interested']),
      countRows(admin, 'follows', 'user_id', uid),
      countRows(admin, 'notifications', 'user_id', uid),
      countRows(admin, 'events', 'profile_id', uid),
      countRows(admin, 'creator_gallery', 'profile_id', uid),
      countRows(admin, 'listings', 'profile_id', uid),
      countRows(admin, 'music_releases', 'profile_id', uid),
      admin.from('spots').select('id, name').or(`owner_id.eq.${uid},claimed_by_profile_id.eq.${uid}`),
    ])
    if (spotsRes.error) throw new Error(`spots: ${spotsRes.error.message}`)

    return NextResponse.json({
      saved_events: savedEvents,
      saved_spots: savedSpots,
      going,
      interested,
      follows,
      notifications,
      spots: (spotsRes.data ?? []).map(s => ({ id: s.id, name: s.name })),
      events,
      creator_gallery: gallery,
      listings,
      music_releases: releases,
    })
  } catch (err) {
    console.error('[account] preview failed:', err)
    return NextResponse.json({ error: 'preview_failed' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let password = ''
  try {
    const body = await req.json()
    password = typeof body?.password === 'string' ? body.password : ''
  } catch {
    // fall through to the empty-password check
  }
  if (!password || !user.email) {
    return NextResponse.json({ error: 'wrong_password' }, { status: 403 })
  }

  // Re-authenticate on a throwaway client so the session cookies are untouched.
  const verifier = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
  const { data: signIn, error: signInError } = await verifier.auth.signInWithPassword({ email: user.email, password })
  if (signInError || signIn.user?.id !== user.id) {
    return NextResponse.json({ error: 'wrong_password' }, { status: 403 })
  }
  await verifier.auth.signOut().catch(() => {})

  const admin = getSupabaseAdmin()
  const uid = user.id

  // File list first: once the rows are gone nothing else records which files
  // were this user's. A listing failure must not block the deletion itself.
  const files: { bucket: string; path: string }[] = []
  const storageWarnings: string[] = []
  for (const { bucket, prefix } of storagePrefixes(uid)) {
    try {
      for (const path of await listFilesRecursive(admin, bucket, prefix)) files.push({ bucket, path })
    } catch (err) {
      storageWarnings.push(`list ${(err as Error).message}`)
    }
  }

  const { data: deleted, error: rpcError } = await admin.rpc('delete_account', { target: uid })
  if (rpcError) {
    // One transaction in the database: nothing was deleted.
    console.error('[account] delete_account failed:', rpcError)
    return NextResponse.json({ error: 'delete_failed' }, { status: 500 })
  }
  console.log('[account] delete_account', uid, deleted)

  // Best effort from here on: the account data is already gone.
  const byBucket = new Map<string, string[]>()
  for (const f of files) byBucket.set(f.bucket, [...(byBucket.get(f.bucket) ?? []), f.path])
  for (const [bucket, paths] of byBucket) {
    for (let i = 0; i < paths.length; i += 100) {
      const { error } = await admin.storage.from(bucket).remove(paths.slice(i, i + 100))
      if (error) storageWarnings.push(`remove ${bucket}: ${error.message}`)
    }
  }
  if (storageWarnings.length) console.error('[account] storage cleanup incomplete:', uid, storageWarnings)

  let authUser: 'deleted' | 'failed' = 'deleted'
  const { error: authError } = await admin.auth.admin.deleteUser(uid)
  if (authError) {
    authUser = 'failed'
    console.error('[account] auth user delete failed:', uid, authError)
  }

  const counts = (deleted ?? {}) as Record<string, number>
  revalidatePublicPaths('profiles')
  if (counts.events > 0) revalidatePublicPaths('events')
  if (counts.spots > 0) revalidatePublicPaths('spots')
  if (counts.listings > 0) revalidatePublicPaths('listings')
  if (counts.music_releases > 0) revalidatePublicPaths('music_releases')

  return NextResponse.json({
    ok: true,
    authUser,
    files: files.length,
    storage_warnings: storageWarnings.length,
  })
}
