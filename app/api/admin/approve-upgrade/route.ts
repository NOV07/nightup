import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '../../../lib/supabase'
import { verifyAdminToken } from '@/app/lib/adminAuth'
import { sendEmail, escapeHtml } from '@/app/lib/email'

export async function POST(req: NextRequest) {
  if (!verifyAdminToken(req.cookies.get('admin_auth')?.value)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { request_id, action } = await req.json()
  if (!request_id || !action || !['approved', 'rejected'].includes(action)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()

  // Get the upgrade request
  const { data: request, error: fetchError } = await supabase
    .from('upgrade_requests')
    .select('*')
    .eq('id', request_id)
    .single()

  if (fetchError || !request) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  }

  // Requests submitted before requested_type existed carry no structured type —
  // approve them as creator but leave profile_type alone and tell the admin.
  const needsManualType = action === 'approved' && !request.requested_type

  if (action === 'approved') {
    // Update profile plan_tier (and profile_type, when we know it). Do this before
    // flipping the request status so a failure leaves the request pending and retryable.
    const { error: profileError } = await supabase
      .from('profiles')
      .update(
        needsManualType
          ? { plan_tier: 'creator' }
          : { plan_tier: 'creator', profile_type: request.requested_type }
      )
      .eq('id', request.user_id)

    // Don't mark it approved or email the user if the profile never actually changed.
    if (profileError) {
      return NextResponse.json(
        { error: `Profile update failed: ${profileError.message}` },
        { status: 500 }
      )
    }
  }

  // Update request status
  await supabase
    .from('upgrade_requests')
    .update({ status: action })
    .eq('id', request_id)

  if (action === 'approved') {
    // Email the user. The approval itself is already committed, so a failed
    // send is logged inside sendEmail rather than turned into an error here.
    await sendEmail({
      route: 'approve-upgrade',
      recipientType: 'creator',
      to: request.email,
      subject: 'Έγινες Creator στο Nightup',
      html: `
        <h2>Καλωσήρθες στο Nightup ως Creator!</h2>
        <p>Γεια σου <strong>@${escapeHtml(request.username)}</strong>,</p>
        <p>Η αίτησή σου εγκρίθηκε. Από τώρα έχεις πρόσβαση σε:</p>
        <ul>
          <li>Ανέβασμα events</li>
          <li>Network profile</li>
          <li>Music releases</li>
        </ul>
        <p>Μπες στο dashboard σου και ξεκίνα: <a href="https://nightup.gr/dashboard">nightup.gr/dashboard</a></p>
        <p>— Η ομάδα του Nightup</p>
      `,
      text: [
        `Γεια σου @${request.username},`,
        '',
        'Η αίτησή σου εγκρίθηκε. Από τώρα έχεις πρόσβαση σε:',
        '- Ανέβασμα events',
        '- Network profile',
        '- Music releases',
        '',
        'Μπες στο dashboard σου και ξεκίνα: https://nightup.gr/dashboard',
        '',
        '— Η ομάδα του Nightup',
      ].join('\n'),
    })
  }

  return NextResponse.json({ success: true, needsManualType })
}
