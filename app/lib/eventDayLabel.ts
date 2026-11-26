// Day label and date format for an event suggestion ("Or try an event tonight /
// tomorrow / on Saturday 28/11 / on 28/11"). Greek time (Europe/Athens) via
// athensTime.ts, never the visitor's zone. A night runs until 06:00: an event
// at 01:00 belongs to the night of the previous calendar day. Pure functions
// (the moment and `t` are arguments), loadable by the offline test scripts.

import { addDaysKey, daysBetween, isDateKey, weekdayIndex } from './dateKey.ts'
import { nightOf, timeToMinutes, NIGHT_START_MINUTES } from './athensTime.ts'
import type { TranslationKey } from './translations.ts'

type T = (key: TranslationKey) => string
export interface EventStart { date: string; time?: string | null }

const ddmm = (key: string) => `${key.slice(8, 10)}/${key.slice(5, 7)}`

/** The date of the night the event belongs to (see top of file); null for an unreadable date. */
function eventNightKey(event: EventStart): string | null {
  const date = typeof event.date === 'string' ? event.date.slice(0, 10) : ''
  if (!isDateKey(date)) return null
  const m = timeToMinutes(event.time)
  return m != null && m < NIGHT_START_MINUTES ? addDaysKey(date, -1) : date
}

/**
 * "tonight" | "tomorrow" | "on Saturday 28/11" (2-6 nights ahead) | "on 28/11".
 * Empty string when the event date is unreadable.
 */
export function getEventDayLabel(event: EventStart, t: T, now: Date = new Date()): string {
  const night = eventNightKey(event)
  if (!night) return ''
  const diff = daysBetween(nightOf(now), night)
  if (diff === 0) return t('tonight_day_tonight')
  if (diff === 1) return t('tonight_day_tomorrow')
  if (diff >= 2 && diff <= 6) {
    const wd = weekdayIndex(night) // 0 = Monday
    const on = t('tonight_day_on_names').split(',')[wd]
    if (on) return `${on} ${ddmm(night)}`
  }
  return `${t('tonight_day_on_date')} ${ddmm(night)}`
}

/** "Sat 28/11 · 21:00" (the real calendar date of the event, not its night). */
export function formatEventDateTime(event: EventStart, t: T): string {
  const date = typeof event.date === 'string' ? event.date.slice(0, 10) : ''
  if (!isDateKey(date)) return event.time ?? ''
  const short = t('tonight_day_short_names').split(',')[weekdayIndex(date)]
  const day = `${short ? `${short} ` : ''}${ddmm(date)}`
  return event.time ? `${day} · ${event.time}` : day
}
