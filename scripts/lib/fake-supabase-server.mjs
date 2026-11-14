import { db } from './fake-state.mjs'
import { getSupabaseAdmin } from './fake-supabase.mjs'

// The owner client: same data, but the update is only allowed through RLS in
// production; the fake just records it like the admin one.
export async function createClient() {
  return { ...getSupabaseAdmin(), auth: { getUser: async () => ({ data: { user: db.user }, error: null }) } }
}
