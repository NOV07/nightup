// Server-side visibility for failed Supabase queries.
//
// A failed query resolves to `{ data: null, error }`, and the pages fall back
// to an empty array so the UI degrades instead of crashing. Without a log line
// that failure is indistinguishable from "no rows" — a missing column silently
// emptied the whole /network area once. Call this next to every fallback.
export function logQueryError(
  route: string,
  label: string,
  error: { message: string; code?: string } | null,
) {
  if (!error) return
  // PGRST116 is `.single()` finding no row — an ordinary empty result that the
  // callers already handle (notFound, null fallback), not a failure.
  if (error.code === 'PGRST116') return
  console.error(`[${route}] ${label} query failed:`, error.message)
}
