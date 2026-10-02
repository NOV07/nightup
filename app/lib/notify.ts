import { getSupabaseAdmin } from './supabase'
import { isSafeInternalPath } from './safeLink'

// Free text in a notification comes from user-controlled fields (display names,
// listing titles), so it is capped and stripped of control characters.
const MAX_TEXT = 200
const DEDUPE_WINDOW_MS = 24 * 60 * 60 * 1000

export type NotificationType = 'new_follow' | 'listing_interest'

interface Notify {
  type: NotificationType
  /** The person being notified. Must come from rows already read from the
   *  database (an existing profile, a listing), never from a request body. */
  recipientId: string
  /** The server-verified session user (`user.id`), never a request value. */
  actorId: string
  title: string
  body?: string | null
  link?: string | null
}

const clean = (s: string) => s.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, MAX_TEXT)

/**
 * Writes a notification with the service-role client. notifications has no
 * INSERT policy for anon/authenticated, so this is the only way in, and it runs
 * only after the calling route has verified the session and the action that
 * justifies the notification.
 *
 * Best-effort: it never throws, so a notification problem cannot fail the
 * action that triggered it. Returns whether a row was written.
 */
export async function sendNotification(n: Notify): Promise<boolean> {
  try {
    if (!n.recipientId || !n.actorId || n.recipientId === n.actorId) return false

    const title = clean(n.title)
    if (!title) return false
    const body = n.body ? clean(n.body) : null
    // An unsafe link is dropped, the notification itself is still sent.
    const link = isSafeInternalPath(n.link) ? n.link : null

    const admin = getSupabaseAdmin()

    // Anti-spam: one notification per (type, actor, recipient) per 24 hours,
    // so follow/unfollow loops cannot flood someone's bell.
    const since = new Date(Date.now() - DEDUPE_WINDOW_MS).toISOString()
    const { data: recent, error: lookupError } = await admin
      .from('notifications')
      .select('id')
      .eq('user_id', n.recipientId)
      .eq('actor_id', n.actorId)
      .eq('type', n.type)
      .gte('created_at', since)
      .limit(1)
    if (lookupError) {
      console.warn('[notify] dedupe lookup failed:', lookupError.message)
      return false
    }
    if (recent && recent.length > 0) return false

    const { error } = await admin.from('notifications').insert({
      user_id: n.recipientId,
      actor_id: n.actorId,
      type: n.type,
      title,
      body,
      link,
    })
    if (error) {
      console.warn('[notify] insert failed:', error.message)
      return false
    }
    return true
  } catch (err) {
    console.warn('[notify] unexpected error:', err)
    return false
  }
}
