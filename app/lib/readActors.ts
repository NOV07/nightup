import { getSupabaseAdmin } from './supabase'

// Plain 'user' profile rows are hidden from other sessions by RLS, but a creator
// still has to see who followed them or showed interest in a listing. This reads
// those people with the service role and hands back the public card fields only.
//
// Server-only. The ids must come from rows the caller's own session already
// returned (their notifications, the interests on their listings), never from
// request input, so a caller can only look up people who acted on them.
const ACTOR_COLUMNS =
  'id, username, display_name, avatar_url, avatar_crop_x, avatar_crop_y, avatar_crop_width, avatar_crop_height'

export interface Actor {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  avatar_crop_x: number | null
  avatar_crop_y: number | null
  avatar_crop_width: number | null
  avatar_crop_height: number | null
}

export async function readActors(ids: Array<string | null | undefined>): Promise<Map<string, Actor>> {
  const unique = [...new Set(ids.filter((id): id is string => !!id))]
  const actors = new Map<string, Actor>()
  if (unique.length === 0) return actors

  const { data, error } = await getSupabaseAdmin().from('profiles').select(ACTOR_COLUMNS).in('id', unique)
  if (error) {
    console.error('[readActors]', error.message)
    return actors
  }
  for (const row of (data ?? []) as Actor[]) actors.set(row.id, row)
  return actors
}
