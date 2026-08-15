import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase-server'

// One row per (event, user, reaction_type) — see
// supabase/migrations/20260815010000_event_reactions.sql. The aggregate
// events.interested_count/going_count columns are kept in sync by a trigger
// on that table, not written here, so this route never touches them and
// never needs the service-role client.
const REACTION_TYPES = ['interested', 'going'] as const
type ReactionType = (typeof REACTION_TYPES)[number]

function isReactionType(v: unknown): v is ReactionType {
  return typeof v === 'string' && (REACTION_TYPES as readonly string[]).includes(v)
}

// POST { eventId, reactionType } — react to an event
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { eventId?: string; reactionType?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { eventId, reactionType } = body
  if (!eventId || !isReactionType(reactionType)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { error } = await supabase
    .from('event_reactions')
    .insert({ event_id: eventId, user_id: user.id, reaction_type: reactionType })

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Already reacted' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

// DELETE ?eventId=xxx&reactionType=yyy — remove a reaction
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const eventId = req.nextUrl.searchParams.get('eventId')
  const reactionType = req.nextUrl.searchParams.get('reactionType')
  if (!eventId || !isReactionType(reactionType)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { error } = await supabase
    .from('event_reactions')
    .delete()
    .eq('event_id', eventId)
    .eq('user_id', user.id)
    .eq('reaction_type', reactionType)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
