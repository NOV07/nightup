// Calendar-date helpers on plain "YYYY-MM-DD" strings. No time zone is involved:
// the string is the calendar date as written, and arithmetic goes through UTC
// so a daylight-saving change can never skip or repeat a day. No imports and
// only erasable TS syntax, so the offline test scripts can load it in plain Node.

const KEY = /^(\d{4})-(\d{2})-(\d{2})$/

/** True for a real calendar date written as YYYY-MM-DD (no 2026-02-30). */
export function isDateKey(s: unknown): s is string {
  if (typeof s !== 'string') return false
  const m = s.match(KEY)
  if (!m) return false
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const t = new Date(Date.UTC(y, mo - 1, d))
  return t.getUTCFullYear() === y && t.getUTCMonth() === mo - 1 && t.getUTCDate() === d
}

/** The date `n` days after (or before, if negative) `key`. */
export function addDaysKey(key: string, n: number): string {
  const m = key.match(KEY)
  if (!m) return key
  const t = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + n))
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')}`
}

/** 0 = Monday … 6 = Sunday, like the day names of the opening hours. -1 for a bad key. */
export function weekdayIndex(key: string): number {
  if (!isDateKey(key)) return -1
  const m = key.match(KEY)!
  const sun0 = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))).getUTCDay()
  return (sun0 + 6) % 7
}

/** Whole days from `a` to `b` (positive when b is later). */
export function daysBetween(a: string, b: string): number {
  const pa = a.match(KEY), pb = b.match(KEY)
  if (!pa || !pb) return NaN
  const ta = Date.UTC(Number(pa[1]), Number(pa[2]) - 1, Number(pa[3]))
  const tb = Date.UTC(Number(pb[1]), Number(pb[2]) - 1, Number(pb[3]))
  return Math.round((tb - ta) / 86_400_000)
}
