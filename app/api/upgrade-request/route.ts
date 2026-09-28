import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase-server'
import { sendEmail, escapeHtml } from '@/app/lib/email'

// Keep in sync with the tile ids in components/auth/UpgradeModal.tsx and with
// ProfileType in app/lib/types.ts. Rejecting anything else keeps stale clients
// (which sent the old 'organiser' spelling) from poisoning the column.
const REQUESTABLE_TYPES = ['organizer', 'artist', 'spot', 'professional'] as const

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { specialty, bio, requested_type } = await req.json()
  if (!specialty || !bio) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }
  if (!REQUESTABLE_TYPES.includes(requested_type)) {
    return NextResponse.json({ error: 'Invalid creator type' }, { status: 400 })
  }

  // Get profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('username, plan_tier')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  if (profile.plan_tier !== 'free') {
    return NextResponse.json({ error: 'Already upgraded' }, { status: 400 })
  }

  // Check for existing pending request
  const { data: existing } = await supabase
    .from('upgrade_requests')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Αίτηση ήδη σε εκκρεμότητα' }, { status: 400 })
  }

  // Insert request
  const { error: insertError } = await supabase
    .from('upgrade_requests')
    .insert({
      user_id: user.id,
      username: profile.username,
      email: user.email,
      specialty,
      bio,
      requested_type,
    })

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // Notify the admin. A failed send is logged inside sendEmail and does not
  // fail the request: the row is already in and shows up in the admin panel.
  await sendEmail({
    route: 'upgrade-request',
    recipientType: 'admin',
    to: 'nightupsocial@gmail.com',
    subject: `🎯 Νέο Creator Request — @${profile.username}`,
    html: `
      <h2>Νέο Creator Upgrade Request</h2>
      <p><strong>Username:</strong> @${escapeHtml(profile.username)}</p>
      <p><strong>Email:</strong> ${escapeHtml(user.email)}</p>
      <p><strong>Τύπος:</strong> ${escapeHtml(requested_type)}</p>
      <p><strong>Ειδικότητα:</strong> ${escapeHtml(specialty)}</p>
      <p><strong>Bio:</strong> ${escapeHtml(bio)}</p>
      <hr/>
      <p>Για έγκριση ή απόρριψη: <a href="https://nightup.gr/admin">nightup.gr/admin</a>, ενότητα αιτήσεων creator.</p>
    `,
    text: [
      'Νέο Creator Upgrade Request',
      '',
      `Username: @${profile.username}`,
      `Email: ${user.email}`,
      `Τύπος: ${requested_type}`,
      `Ειδικότητα: ${specialty}`,
      `Bio: ${bio}`,
      '',
      'Για έγκριση ή απόρριψη: https://nightup.gr/admin, ενότητα αιτήσεων creator.',
    ].join('\n'),
  })

  return NextResponse.json({ success: true })
}
