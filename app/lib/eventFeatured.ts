/**
 * The events table has no `featured` boolean — the "Hot" rail on /events reads
 * `featured_until` and treats the event as featured while that window is open
 * (see app/events/page.tsx). These helpers keep every writer on that column.
 *
 * `nightup_pick` (homepage Hot) and `is_radar_pick` (Radar) are separate flags
 * with their own admin toggles and are deliberately not touched here.
 */

export const FEATURED_WINDOW_DAYS = 30

export function isEventFeatured(event: { featured_until?: string | null } | null | undefined): boolean {
  if (!event?.featured_until) return false
  return new Date(event.featured_until) > new Date()
}

/** Opens a fresh featured window, or closes it when `featured` is false. */
export function featuredUntilFor(featured: boolean): string | null {
  if (!featured) return null
  const until = new Date()
  until.setDate(until.getDate() + FEATURED_WINDOW_DAYS)
  return until.toISOString()
}
