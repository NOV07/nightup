import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '../../../lib/supabase'
import { verifyAdminToken } from '@/app/lib/adminAuth'

export async function POST(req: NextRequest) {
  if (!verifyAdminToken(req.cookies.get('admin_auth')?.value)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { request_id, action } = await req.json()
  if (!request_id || !action || !['approved', 'rejected'].includes(action)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()

  // Get the featured request
  const { data: request, error: fetchError } = await supabase
    .from('featured_event_requests')
    .select('*')
    .eq('id', request_id)
    .single()

  if (fetchError || !request) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  }

  // Update request status
  await supabase
    .from('featured_event_requests')
    .update({ status: action })
    .eq('id', request_id)

  if (action === 'approved') {
    // Mark the event as featured
    await supabase
      .from('events')
      .update({ featured: true })
      .eq('id', request.event_id)
  }

  return NextResponse.json({ success: true })
}
