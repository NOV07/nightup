import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '../../../lib/supabase'
import { verifyAdminToken } from '@/app/lib/adminAuth'
import { featuredUntilFor } from '@/app/lib/eventFeatured'

function isAdmin(req: NextRequest) {
  return verifyAdminToken(req.cookies.get('admin_auth')?.value)
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id, featured } = await req.json()
  if (!id || typeof featured !== 'boolean') {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()
  // events has no `featured` column — featuring opens a featured_until window.
  const { error } = await admin
    .from('events')
    .update({ featured_until: featuredUntilFor(featured) })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
