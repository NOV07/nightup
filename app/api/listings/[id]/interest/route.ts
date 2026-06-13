import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase-server'

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

  const { error } = await supabase
    .from('listing_interests')
    .insert({ listing_id: id, profile_id: profile.id })

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Already expressed interest' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Notify listing owner — best effort, don't fail the request
  const { data: listing } = await supabase
    .from('listings')
    .select('title, profile_id')
    .eq('id', id)
    .single()

  if (listing) {
    await supabase.from('notifications').insert({
      user_id:  listing.profile_id,
      type:     'listing_interest',
      title:    `${profile.display_name} ενδιαφέρθηκε για «${listing.title}»`,
      body:     'Δες το προφίλ τους για να αποφασίσεις αν ταιριάζουν.',
      link:     `/profile/${profile.username}`,
      actor_id: profile.id,
    })
  }

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
