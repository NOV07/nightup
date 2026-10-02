import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase-server'
import { sendNotification } from '@/app/lib/notify'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name, username')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'No profile found' }, { status: 400 })

  // The listing, and with it the recipient, is read from the database.
  const { data: listing } = await supabase
    .from('listings')
    .select('title, profile_id')
    .eq('id', id)
    .maybeSingle()
  if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })

  // Nobody expresses interest in their own listing.
  if (listing.profile_id === profile.id) return NextResponse.json({ error: 'Cannot express interest in your own listing' }, { status: 403 })

  const { error } = await supabase
    .from('listing_interests')
    .insert({ listing_id: id, profile_id: profile.id })

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Already expressed interest' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Notify the listing owner — best effort, don't fail the request. Written
  // server-side with the verified session user as actor.
  await sendNotification({
    type:        'listing_interest',
    recipientId: listing.profile_id,
    actorId:     user.id,
    title:       `${profile.display_name} ενδιαφέρθηκε για «${listing.title}»`,
    body:        'Δες το προφίλ τους για να αποφασίσεις αν ταιριάζουν.',
    link:        `/profile/${encodeURIComponent(profile.username)}`,
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'No profile found' }, { status: 400 })

  const { error } = await supabase
    .from('listing_interests')
    .delete()
    .eq('listing_id', id)
    .eq('profile_id', profile.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
