import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase-server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { specialty, bio } = await req.json()
  if (!specialty || !bio) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
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
    })

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // Send email to admin
  await resend.emails.send({
    from: 'onboarding@resend.dev',
    to: 'nightupsocial@gmail.com',
    subject: `🎯 Νέο Creator Request — @${profile.username}`,
    html: `
      <h2>Νέο Creator Upgrade Request</h2>
      <p><strong>Username:</strong> @${profile.username}</p>
      <p><strong>Email:</strong> ${user.email}</p>
      <p><strong>Ειδικότητα:</strong> ${specialty}</p>
      <p><strong>Bio:</strong> ${bio}</p>
      <hr/>
      <p>Για να εγκρίνεις, πήγαινε Supabase → profiles → βρες τον user → βάλε <code>plan_tier = 'creator'</code></p>
    `,
  })

  return NextResponse.json({ success: true })
}
