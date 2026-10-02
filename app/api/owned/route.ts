import { NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase-server'

// GET — ids of the events and spots the current user owns/hosts. Cards use it
// to hide Save / Going / Interested on your own content. Logged-out visitors
// get empty lists rather than a 401, so any page can call this unconditionally.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ events: [], spots: [] })

  const [events, spots] = await Promise.all([
    supabase.from('events').select('id').eq('profile_id', user.id),
    supabase.from('spots').select('id').or(`owner_id.eq.${user.id},claimed_by_profile_id.eq.${user.id}`),
  ])

  return NextResponse.json({
    events: (events.data ?? []).map((r: { id: string }) => r.id),
    spots: (spots.data ?? []).map((r: { id: string | number }) => String(r.id)),
  })
}
