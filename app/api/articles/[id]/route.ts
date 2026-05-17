import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('articles').select('*').eq('id', id).single()
  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ article: data })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const cookieStore = await cookies()
  const adminAuth = cookieStore.get('admin_auth')
  if (!adminAuth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabase()
  const body = await req.json()
  const wordCount = ((body.blocks || []) as any[]).reduce((n, b) => {
    return n + ((b.text || '') + ' ' + (b.attr || '')).split(/\s+/).filter(Boolean).length
  }, 0)

  const payload: Record<string, any> = {}
  const fields = ['title','subtitle','excerpt','slug','category','series','tags','blocks',
    'hero_image','hero_alt','seo_title','meta_desc','canonical','status',
    'scheduled_at','visibility','featured','allow_comments','show_related']
  fields.forEach(k => { if (k in body) payload[k] = body[k] })

  if ('author'          in body) payload.author_name     = body.author
  if ('author_role'     in body) payload.author_role     = body.author_role
  if ('author_bio'      in body) payload.author_bio      = body.author_bio
  if ('author_initials' in body) payload.author_initials = body.author_initials

  if (body.toggles) {
    if ('feat' in body.toggles) payload.featured       = body.toggles.feat
    if ('com'  in body.toggles) payload.allow_comments = body.toggles.com
    if ('rel'  in body.toggles) payload.show_related   = body.toggles.rel
  }

  payload.word_count = wordCount
  payload.read_time  = Math.max(1, Math.round(wordCount / 220))

  if (body.status === 'published') {
    const existing = await supabase.from('articles').select('published_at').eq('id', id).single()
    if (!existing.data?.published_at) payload.published_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('articles').update(payload).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ article: data })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const cookieStore = await cookies()
  const adminAuth = cookieStore.get('admin_auth')
  if (!adminAuth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabase()
  const { error } = await supabase.from('articles').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
