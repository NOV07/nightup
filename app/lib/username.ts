// ":" and other characters that merely need percent-encoding in a path are
// allowed on purpose; profileHref/decodeUsername round-trip them. Only
// characters that break URL parsing or the router are rejected here.

export const USERNAME_MIN = 2
export const USERNAME_MAX = 30

const RESERVED = new Set([
  'admin', 'administrator', 'api', 'auth', 'dashboard', 'settings', 'profile', 'profiles',
  'onboarding', 'login', 'logout', 'signin', 'signup', 'register', 'upgrade', 'submit',
  'events', 'event', 'spots', 'spot', 'network', 'nightwaves', 'magazine', 'about', 'search',
  'coming-soon', 'support', 'help', 'nightup', 'root', 'null', 'undefined',
])

export function validateUsername(value: unknown): string | null {
  if (typeof value !== 'string') return 'Invalid username'
  if (value !== value.trim()) return 'Username cannot start or end with spaces'
  const length = [...value].length
  if (length < USERNAME_MIN || length > USERNAME_MAX) {
    return `Username must be ${USERNAME_MIN}-${USERNAME_MAX} characters`
  }
  if (/[/\\?#%\u0000-\u001f\u007f]/.test(value)) return 'Username contains invalid characters'
  if (value === '.' || value === '..') return 'Invalid username'
  if (RESERVED.has(value.toLowerCase())) return 'Username is reserved'
  return null
}

// ilike treats % _ \ as pattern characters; escape them for an exact, case-insensitive match.
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, c => `\\${c}`)
}

// Shared by every route that writes profiles.username (create and change).
// Case-insensitive; `excludeId` lets a user keep or re-case their own name.
export async function usernameProblem(
  supabase: { from: (t: string) => any },
  value: unknown,
  excludeId?: string,
): Promise<string | null> {
  const invalid = validateUsername(value)
  if (invalid) return invalid
  let query = supabase.from('profiles').select('id').ilike('username', escapeLike(value as string)).limit(1)
  if (excludeId) query = query.neq('id', excludeId)
  const { data } = await query
  return data && data.length > 0 ? 'Username already taken' : null
}
