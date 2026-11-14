import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase-server'
import { getSupabaseAdmin } from '../../../lib/supabase'
import { verifyAdminToken } from '@/app/lib/adminAuth'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  // The admin panel logs in with the admin_auth cookie only (no Supabase session).
  const isAdmin = !user && verifyAdminToken(req.cookies.get('admin_auth')?.value)
  if (!user && !isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: 'Only JPG, PNG, WebP or GIF allowed' }, { status: 400 })
  }

  if (file.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large — max 8MB' }, { status: 400 })
  }

  const ext = file.name.split('.').pop() || 'jpg'
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${user ? user.id : 'admin'}/${Date.now()}-${safeName}`

  const buffer = Buffer.from(await file.arrayBuffer())
  const admin = getSupabaseAdmin()

  const { data, error } = await admin.storage
    .from('events')
    .upload(path, buffer, { contentType: file.type, cacheControl: '31536000', upsert: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: { publicUrl } } = admin.storage.from('events').getPublicUrl(data.path)
  return NextResponse.json({ url: publicUrl })
}
