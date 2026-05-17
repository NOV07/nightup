import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const adminAuth = cookieStore.get('admin_auth')
  if (!adminAuth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabase()

  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const allowed = ['image/jpeg','image/jpg','image/png','image/webp','image/gif']
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: 'Only JPG, PNG, WebP or GIF allowed' }, { status: 400 })
  }

  if (file.size > 4 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large — max 4MB' }, { status: 400 })
  }

  const ext    = file.name.split('.').pop() || 'jpg'
  const ts     = Date.now()
  const random = Math.random().toString(36).slice(2, 8)
  const path   = `articles/${ts}-${random}.${ext}`

  const buffer = Buffer.from(await file.arrayBuffer())

  const { data, error } = await supabase.storage
    .from('article-images')
    .upload(path, buffer, {
      contentType: file.type,
      cacheControl: '31536000',
      upsert: false,
    })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: { publicUrl } } = supabase.storage
    .from('article-images')
    .getPublicUrl(data.path)

  return NextResponse.json({ url: publicUrl, path: data.path })
}
