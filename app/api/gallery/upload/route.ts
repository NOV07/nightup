import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase-server'
import { getSupabaseAdmin } from '../../../lib/supabase'

/** Storage subfolder per gallery surface. There are only two: `spots.gallery`
 *  (the array column) and `creator_gallery` (the row-per-item table that backs
 *  every artist / organizer / venue / professional profile). */
const CONTEXTS = ['spot', 'profile'] as const
type Context = (typeof CONTEXTS)[number]

const IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm']

const MAX_IMAGE = 8 * 1024 * 1024   // same ceiling as the events route
const MAX_VIDEO = 60 * 1024 * 1024

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const rawContext = String(formData.get('context') ?? 'profile')
  const context: Context = (CONTEXTS as readonly string[]).includes(rawContext)
    ? (rawContext as Context)
    : 'profile'

  const isImage = IMAGE_TYPES.includes(file.type)
  const isVideo = VIDEO_TYPES.includes(file.type)

  if (!isImage && !isVideo) {
    return NextResponse.json(
      { error: 'Only JPG, PNG, WebP images or MP4, MOV, WebM video allowed' },
      { status: 400 },
    )
  }

  if (isImage && file.size > MAX_IMAGE) {
    return NextResponse.json({ error: 'Image too large — max 8MB' }, { status: 400 })
  }
  if (isVideo && file.size > MAX_VIDEO) {
    return NextResponse.json({ error: 'Video too large — max 60MB' }, { status: 400 })
  }

  // Duration is checked client-side before the request is sent: reading it here
  // would mean shipping ffmpeg just to parse a container header.

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${context}/${user.id}/${Date.now()}-${safeName}`

  const buffer = Buffer.from(await file.arrayBuffer())
  const admin = getSupabaseAdmin()

  const { data, error } = await admin.storage
    .from('gallery-media')
    .upload(path, buffer, { contentType: file.type, cacheControl: '31536000', upsert: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: { publicUrl } } = admin.storage.from('gallery-media').getPublicUrl(data.path)
  return NextResponse.json({ url: publicUrl, type: isVideo ? 'video' : 'image' })
}
