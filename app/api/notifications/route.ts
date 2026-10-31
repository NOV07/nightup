import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase-server'
import { readActors } from '@/app/lib/readActors'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // The actor is often a plain user, whose profile row other sessions cannot
  // read. The ids come from this user's own notifications (RLS-scoped above).
  const actors = await readActors((data ?? []).map((n: any) => n.actor_id))
  const notifications = (data ?? []).map((n: any) => ({ ...n, actor: actors.get(n.actor_id) ?? null }))
  const unread_count = notifications.filter((n: any) => !n.read).length

  return NextResponse.json({ notifications, unread_count })
}

export async function PATCH(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', user.id)
    .eq('read', false)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
