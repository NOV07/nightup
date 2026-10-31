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
// Goes through username_taken(): other users' rows are invisible to a session
// client, so a plain select could not see a clash with them.
export async function usernameProblem(
  supabase: { rpc: (fn: string, args: Record<string, unknown>) => any },
  value: unknown,
  excludeId?: string,
): Promise<string | null> {
  const invalid = validateUsername(value)
  if (invalid) return invalid
  const { data, error } = await supabase.rpc('username_taken', {
    p_username: value as string,
    p_exclude: excludeId ?? null,
  })
  // Fail closed: an unverifiable name is not accepted.
  if (error) return 'Could not check the username, try again'
  return data === true ? 'Username already taken' : null
}
