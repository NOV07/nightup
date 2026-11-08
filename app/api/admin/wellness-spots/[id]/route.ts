import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '../../../../lib/supabase'
import { verifyAdminToken } from '@/app/lib/adminAuth'
import { parseWellnessInput, photoPath, PUBLISH_NEEDS_PIN, WELLNESS_BUCKET } from '@/app/lib/wellnessSpots'

function isAdmin(req: NextRequest) {
  return verifyAdminToken(req.cookies.get('admin_auth')?.value)
}

const UNIQUE_VIOLATION = '23505'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Ctx) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Μη έγκυρο id.' }, { status: 400 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Μη έγκυρο JSON.' }, { status: 400 })
  }
  const parsed = parseWellnessInput(body)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const patch = parsed.row
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Δεν υπάρχουν πεδία για αλλαγή.' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()
  const { data: current, error: readError } = await admin
    .from('wellness_spots').select('published, lat, lng').eq('id', id).maybeSingle()
  if (readError) {
    console.error('[admin/wellness-spots PATCH read]', readError)
    return NextResponse.json({ error: 'Δεν διαβάστηκε το σημείο.' }, { status: 500 })
  }
  if (!current) return NextResponse.json({ error: 'Το σημείο δεν βρέθηκε.' }, { status: 404 })

  const merged = { ...current, ...patch } as { published: boolean; lat: number | null; lng: number | null }
  if (merged.published && (merged.lat == null || merged.lng == null)) {
    return NextResponse.json({ error: PUBLISH_NEEDS_PIN }, { status: 400 })
  }

  const { data, error } = await admin
    .from('wellness_spots').update(patch).eq('id', id).select().single()
  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return NextResponse.json({ error: 'Το slug υπάρχει ήδη.' }, { status: 409 })
    }
    console.error('[admin/wellness-spots PATCH]', error)
    return NextResponse.json({ error: 'Δεν αποθηκεύτηκαν οι αλλαγές.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true, spot: data })
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Μη έγκυρο id.' }, { status: 400 })

  const admin = getSupabaseAdmin()
  const { data: spot, error: readError } = await admin
    .from('wellness_spots').select('slug, photo_urls').eq('id', id).maybeSingle()
  if (readError) {
    console.error('[admin/wellness-spots DELETE read]', readError)
    return NextResponse.json({ error: 'Δεν διαβάστηκε το σημείο.' }, { status: 500 })
  }
  if (!spot) return NextResponse.json({ error: 'Το σημείο δεν βρέθηκε.' }, { status: 404 })

  const { error } = await admin.from('wellness_spots').delete().eq('id', id)
  if (error) {
    console.error('[admin/wellness-spots DELETE]', error)
    return NextResponse.json({ error: 'Δεν διαγράφηκε το σημείο.' }, { status: 500 })
  }

  // Best effort: the row is already gone, so a storage hiccup must not turn
  // this into an error. Covers the listed photos and any orphaned uploads in
  // the spot's folder.
  let filesRemoved = true
  try {
    const paths = new Set<string>()
    for (const u of (spot.photo_urls as string[] | null) ?? []) {
      const p = photoPath(u)
      if (p) paths.add(p)
    }
    const { data: listed } = await admin.storage.from(WELLNESS_BUCKET).list(spot.slug, { limit: 100 })
    for (const f of listed ?? []) paths.add(`${spot.slug}/${f.name}`)
    if (paths.size) {
      const { error: rmError } = await admin.storage.from(WELLNESS_BUCKET).remove([...paths])
      if (rmError) throw rmError
    }
  } catch (err) {
    filesRemoved = false
    console.error('[admin/wellness-spots DELETE files]', err)
  }
  return NextResponse.json({ ok: true, filesRemoved })
}
