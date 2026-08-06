import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '../../../lib/supabase'
import { verifyAdminToken } from '@/app/lib/adminAuth'
import { isEventFeatured } from '@/app/lib/eventFeatured'

function isAdmin(req: NextRequest) {
  return verifyAdminToken(req.cookies.get('admin_auth')?.value)
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('events')
    .select('id, title, venue, city, date, featured_until')
    .eq('status', 'approved')
    .order('date', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  // Callers expect a plain boolean; the column is a window, not a flag.
  return NextResponse.json((data ?? []).map(e => ({ ...e, featured: isEventFeatured(e) })))
}
