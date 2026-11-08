import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '../../../lib/supabase'
import { verifyAdminToken } from '@/app/lib/adminAuth'
import { slugify } from '@/app/lib/slug'
import { parseWellnessInput, PUBLISH_NEEDS_PIN } from '@/app/lib/wellnessSpots'

function isAdmin(req: NextRequest) {
  return verifyAdminToken(req.cookies.get('admin_auth')?.value)
}

const UNIQUE_VIOLATION = '23505'

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await getSupabaseAdmin()
    .from('wellness_spots').select('*').order('created_at', { ascending: false })
  if (error) {
    console.error('[admin/wellness-spots GET]', error)
    return NextResponse.json({ error: 'Δεν φορτώθηκαν τα σημεία.' }, { status: 500 })
  }
  return NextResponse.json({ spots: data })
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Μη έγκυρο JSON.' }, { status: 400 })
  }

  const parsed = parseWellnessInput(body)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const row = parsed.row

  if (!row.name) return NextResponse.json({ error: 'Το όνομα είναι υποχρεωτικό.' }, { status: 400 })
  if (!row.slug) row.slug = slugify(String(row.name))
  if (!row.slug) {
    return NextResponse.json({ error: 'Δώσε slug, δεν μπόρεσε να βγει από το όνομα.' }, { status: 400 })
  }
  if (row.published && (row.lat == null || row.lng == null)) {
    return NextResponse.json({ error: PUBLISH_NEEDS_PIN }, { status: 400 })
  }

  const { data, error } = await getSupabaseAdmin()
    .from('wellness_spots').insert(row).select().single()
  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return NextResponse.json({ error: 'Το slug υπάρχει ήδη.' }, { status: 409 })
    }
    console.error('[admin/wellness-spots POST]', error)
    return NextResponse.json({ error: 'Δεν αποθηκεύτηκε το σημείο.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true, spot: data })
}
