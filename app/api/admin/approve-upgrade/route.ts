import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '../../../lib/supabase'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  const adminCookie = req.cookies.get('admin_auth')
  if (adminCookie?.value !== process.env.ADMIN_PASSWORD) {
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

  // Update request status
  await supabase
    .from('upgrade_requests')
    .update({ status: action })
    .eq('id', request_id)

  if (action === 'approved') {
    // Update profile plan_tier
    await supabase
      .from('profiles')
      .update({ plan_tier: 'creator' })
      .eq('id', request.user_id)

    // Email the user
    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: request.email,
      subject: '🎉 Έγινες Creator στο Nightup!',
      html: `
        <h2>Καλωσήρθες στο Nightup ως Creator!</h2>
        <p>Γεια σου <strong>@${request.username}</strong>,</p>
        <p>Η αίτησή σου εγκρίθηκε. Από τώρα έχεις πρόσβαση σε:</p>
        <ul>
          <li>Ανέβασμα events</li>
          <li>Network profile</li>
          <li>Music releases</li>
        </ul>
        <p>Μπες στο dashboard σου και ξεκίνα: <a href="https://nightup.gr/dashboard">nightup.gr/dashboard</a></p>
        <p>— Η ομάδα του Nightup</p>
      `,
    })
  }

  return NextResponse.json({ success: true })
}
