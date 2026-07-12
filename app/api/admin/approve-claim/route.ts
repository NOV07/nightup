import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '../../../lib/supabase'
import { verifyAdminToken } from '@/app/lib/adminAuth'

export async function POST(req: NextRequest) {
  if (!verifyAdminToken(req.cookies.get('admin_auth')?.value)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { claimId, action } = await req.json()
  if (!claimId || !action || !['approved', 'rejected'].includes(action)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()

  const { data: claim, error: fetchError } = await supabase
    .from('spot_claims')
    .select('*')
    .eq('id', claimId)
    .single()

  if (fetchError || !claim) {
    return NextResponse.json({ error: 'Claim not found' }, { status: 404 })
  }

  await supabase
    .from('spot_claims')
    .update({ status: action })
    .eq('id', claimId)

  if (action === 'approved') {
    await supabase
      .from('spots')
      .update({ claimed_by_profile_id: claim.profile_id })
      .eq('id', claim.spot_id)
  }

  return NextResponse.json({ ok: true })
}
