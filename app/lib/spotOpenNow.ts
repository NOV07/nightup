// "Open now · until HH:MM" for the spot page. Pure (the caller passes the
// moment), built on the opening-hours reader so every format it understands,
// the midnight crossing included, behaves the same here as on the map.
// Anything not certainly open returns null: nothing is shown, never a guess.
import { spotStatusAt, minutesUntilClose, DAY_NAMES } from './openingHours.ts'

const ATHENS = 'Europe/Athens'

/** Calendar date (YYYY-MM-DD), minutes since 00:00 and weekday index (Monday = 0) in Athens. */
export function athensClock(now: Date): { date: string; minutes: number; dayIndex: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ATHENS, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now)
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? '0'
  const date = `${get('year')}-${get('month')}-${get('day')}`
  const minutes = Number(get('hour')) * 60 + Number(get('minute'))
  const dayIndex = (new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7
  return { date, minutes, dayIndex }
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Greek day name of today in Athens, to match the keys of opening_hours. */
export function athensDayName(now: Date): string {
  return DAY_NAMES[athensClock(now).dayIndex]
}

/**
 * null = show nothing. Otherwise `until` is the closing time as HH:MM, or null
 * when the spot is open but never closes (24 h) or the end cannot be worked out.
 */
export function openNowInfo(
  hours: Record<string, unknown> | null | undefined,
  now: Date,
): { until: string | null } | null {
  const { date, minutes } = athensClock(now)
  if (spotStatusAt(hours, date, minutes) !== 'open') return null
  const left = minutesUntilClose(hours, date, minutes)
  if (left === null) return { until: null }
  const end = (minutes + left) % 1440
  return { until: `${pad(Math.floor(end / 60))}:${pad(end % 60)}` }
}
