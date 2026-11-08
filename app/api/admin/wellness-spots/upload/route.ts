import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '../../../../lib/supabase'
import { verifyAdminToken } from '@/app/lib/adminAuth'
import { isValidSlug, WELLNESS_BUCKET } from '@/app/lib/wellnessSpots'

const EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
}
const MAX_BYTES = 8 * 1024 * 1024 // same ceiling as the other upload routes

export async function POST(req: NextRequest) {
  if (!verifyAdminToken(req.cookies.get('admin_auth')?.value)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let form: FormData
  try { form = await req.formData() } catch {
    return NextResponse.json({ error: 'Μη έγκυρη φόρμα.' }, { status: 400 })
  }

  const file = form.get('file')
  const slug = form.get('slug')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Λείπει το αρχείο.' }, { status: 400 })
  if (!isValidSlug(slug)) return NextResponse.json({ error: 'Μη έγκυρο slug.' }, { status: 400 })

  const ext = EXT_BY_TYPE[file.type]
  if (!ext) return NextResponse.json({ error: 'Μόνο JPG, PNG ή WebP.' }, { status: 400 })
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'Το αρχείο είναι πολύ μεγάλο (max 8MB).' }, { status: 400 })

  const path = `${slug}/${randomUUID()}.${ext}`
  const admin = getSupabaseAdmin()
  const { error } = await admin.storage
    .from(WELLNESS_BUCKET)
    .upload(path, Buffer.from(await file.arrayBuffer()), {
      contentType: file.type, cacheControl: '31536000', upsert: false,
    })
  if (error) {
    console.error('[admin/wellness-spots upload]', error)
    return NextResponse.json({ error: 'Δεν ανέβηκε η φωτογραφία.' }, { status: 500 })
  }
  const { data: { publicUrl } } = admin.storage.from(WELLNESS_BUCKET).getPublicUrl(path)
  return NextResponse.json({ url: publicUrl })
}
