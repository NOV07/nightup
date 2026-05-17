import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function slugify(s: string): string {
  return (s || '').toLowerCase()
    .replace(/[αά]/g,'a').replace(/[εέ]/g,'e').replace(/[ηή]/g,'i')
    .replace(/[ιί]/g,'i').replace(/[οό]/g,'o').replace(/[υύ]/g,'y')
    .replace(/[ωώ]/g,'o')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')
}

function calcStats(body: any) {
  const wordCount = ((body.blocks || []) as any[]).reduce((n, b) => {
    return n + ((b.text || '') + ' ' + (b.attr || '')).split(/\s+/).filter(Boolean).length
  }, (body.title || '').split(/\s+/).filter(Boolean).length)
  return { wordCount, readTime: Math.max(1, Math.round(wordCount / 220)) }
}

export async function GET(req: NextRequest) {
  const cookieStore = await cookies()
  const adminAuth = cookieStore.get('admin_auth')
  if (!adminAuth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = getSupabase()

  const sp = new URL(req.url).searchParams
  let q = supabase
    .from('articles')
    .select('id,title,subtitle,slug,category,series,status,featured,published_at,created_at,updated_at,word_count,read_time,tags,hero_image')
    .order('updated_at', { ascending: false })
    .limit(parseInt(sp.get('limit') || '100'))

  if (sp.get('status'))   q = q.eq('status', sp.get('status')!)
  if (sp.get('category')) q = q.eq('category', sp.get('category')!)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ articles: data })
}

export async function POST(req: NextRequest) {
  const supabase = getSupabase()
  const cookieStore = await cookies()
  const adminAuth = cookieStore.get('admin_auth')
  if (!adminAuth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { wordCount, readTime } = calcStats(body)
  const slug = (body.slug || slugify(body.title || '')).trim()
  if (!slug) return NextResponse.json({ error: 'Title is required' }, { status: 400 })

  const { data, error } = await supabase.from('articles').insert({
    title:        body.title,
    subtitle:     body.subtitle || null,
    excerpt:      body.excerpt  || null,
    slug,
    category:     body.category || 'Feature',
    series:       body.series   || null,
    tags:         body.tags     || [],
    blocks:       body.blocks   || [],
    hero_image:   body.hero_image || null,
    status:       body.status    || 'draft',
    word_count:   wordCount,
    read_time:    readTime,
  }).select().single()

  if (error) {
    console.error('Supabase insert error:', error)
    if (error.code === '23505') return NextResponse.json({ error: 'Slug already exists — change the URL slug' }, { status: 409 })
    return NextResponse.json({ error: error.message || 'Database error' }, { status: 500 })
  }
  if (!data) return NextResponse.json({ error: 'No data returned from database' }, { status: 500 })
  return NextResponse.json({ article: data }, { status: 201 })
}
