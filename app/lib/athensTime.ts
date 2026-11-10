// The map's idea of "tonight", always in Greek time (Europe/Athens), never the
// UTC of the server or the zone of the visitor's browser. Pure functions: the
// moment is an argument, so scripts/test-night.mjs can test exact instants.
//
// A night belongs to the date it starts on. The night of date D runs from D
// 06:00 to D+1 06:00: an event dated D at 22:00 and one dated D+1 at 01:00 are
// both "the night of D". Before 06:00 the current night is still yesterday's.

import { addDaysKey, daysBetween, isDateKey } from './dateKey.ts'

export const NIGHT_START_MINUTES = 6 * 60
/** The time a spot's open/closed status is checked at on any night but the current one. */
export const EVENING_CHECK_MINUTES = 21 * 60 + 30
/** How many nights ahead of tonight can be picked (and which events are loaded). */
export const MAX_NIGHTS_AHEAD = 60

export const ATHENS_TZ = 'Europe/Athens'

const fmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: ATHENS_TZ, hourCycle: 'h23',
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
})

/** The calendar date (YYYY-MM-DD) and the minutes since 00:00 in Athens at `now`. */
export function athensParts(now: Date): { date: string; minutes: number } {
  const p: Record<string, string> = {}
  for (const part of fmt.formatToParts(now)) p[part.type] = part.value
  return { date: `${p.year}-${p.month}-${p.day}`, minutes: Number(p.hour) * 60 + Number(p.minute) }
}

/** The date of the current night: today's date from 06:00, yesterday's before it. */
export function nightOf(now: Date): string {
  const { date, minutes } = athensParts(now)
  return minutes < NIGHT_START_MINUTES ? addDaysKey(date, -1) : date
}

/** "HH:MM" or "HH:MM:SS" as minutes since midnight; null when it is not a time. */
export function timeToMinutes(time: unknown): number | null {
  if (typeof time !== 'string') return null
  const m = time.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/)
  if (!m) return null
  const h = Number(m[1]), mi = Number(m[2])
  return h <= 23 && mi <= 59 ? h * 60 + mi : null
}

/**
 * Does the event belong to the night of `night`? Dated `night` from 06:00, or
 * dated the next day before 06:00. An event with no readable time counts on
 * its own date.
 */
export function eventInNight(event: { date: string; time?: string | null }, night: string): boolean {
  if (!isDateKey(night) || typeof event.date !== 'string') return false
  const date = event.date.slice(0, 10)
  const m = timeToMinutes(event.time)
  if (date === night) return m == null || m >= NIGHT_START_MINUTES
  if (date === addDaysKey(night, 1)) return m != null && m < NIGHT_START_MINUTES
  return false
}

/** The picked night, kept inside [tonight, tonight + 60]. Anything unusable becomes tonight. */
export function clampNight(picked: unknown, now: Date): string {
  const tonight = nightOf(now)
  if (!isDateKey(picked)) return tonight
  const d = daysBetween(tonight, picked)
  if (d < 0) return tonight
  return d > MAX_NIGHTS_AHEAD ? addDaysKey(tonight, MAX_NIGHTS_AHEAD) : picked
}

/**
 * The calendar date and minute at which a spot's open/closed status is read
 * for the picked night: the real current moment for the current night,
 * 21:30 of that date for every other night.
 */
export function statusMoment(night: string, now: Date): { date: string; minutes: number } {
  return night === nightOf(now) ? athensParts(now) : { date: night, minutes: EVENING_CHECK_MINUTES }
}

/**
 * The event dates worth loading: from yesterday (the current night can still
 * be yesterday's) to the last pickable night plus the morning after it.
 * Everything finer (which night, which hour) is decided in the browser.
 */
export function eventLoadWindow(now: Date): { from: string; to: string } {
  const { date } = athensParts(now)
  return { from: addDaysKey(date, -1), to: addDaysKey(date, MAX_NIGHTS_AHEAD + 1) }
}
