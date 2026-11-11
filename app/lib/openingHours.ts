// Reads the opening hours a spot published (spots.opening_hours, one text per
// day: `Δευτέρα` … `Κυριακή`) and says whether the spot is open at a given
// moment. Pure logic: no React, no database, no clock (the caller passes the
// moment), so scripts/test-opening-hours.mjs can load it in plain Node.
//
// The rule that decides everything: never guess. What cannot be read with
// certainty is 'unknown', which is better than a wrong 'closed'.
//
//   * Recognised: `18:00-1:30`, `9.00 - 17.00` (dots), hyphen / en dash / em
//     dash, two or more zones split by commas (`12:00-16:00, 19:00-1:30`),
//     `24 ώρες`, and `Κλειστά` (any word that starts with «κλειστ», with no
//     times in it).
//   * A close at or before the opening means the shift ends after midnight
//     (+24 h). `00:00` as a close is 24:00.
//   * A shift that crosses midnight also counts for the early hours of the
//     next day, whatever that next day says.
//   * A day that is empty, missing or not understood is 'unknown'. The spot
//     form omits blank days, so a missing day is "not said", not "closed".
//   * 12-hour clocks (π.μ. / μ.μ.) are not supported: they are 'unknown'.

import { addDaysKey, isDateKey, weekdayIndex } from './dateKey.ts'

export const DAY_NAMES = ['Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο', 'Κυριακή'] as const

export type SpotStatus = 'open' | 'closed' | 'unknown'

/** One opening zone in minutes from 00:00 of its own day. `close` goes past 1440 when the shift ends after midnight. */
export interface HoursRange { open: number; close: number }

export type ParsedDay = { kind: 'closed' } | { kind: 'open'; ranges: HoursRange[] }

/**
 * How far past midnight a day we cannot read may still reach into the next
 * morning. Only used to decide whether an unreadable day before this one could
 * still be keeping the spot open; it matches the 06:00 edge of the map's night.
 */
export const UNREADABLE_TAIL_MINUTES = 6 * 60

/** Lower case, no accents: «Κλειστά» and «κλειστα» are the same word, so are «ώρες» and «ωρες». */
function fold(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

const ZONE = /^(\d{1,2})[:.](\d{2})\s*[-–—]\s*(\d{1,2})[:.](\d{2})$/

function minutesOf(h: string, m: string, allow24: boolean): number | null {
  const hh = Number(h), mm = Number(m)
  if (!Number.isInteger(hh) || !Number.isInteger(mm) || mm > 59) return null
  if (hh === 24) return mm === 0 && allow24 ? 1440 : null
  return hh <= 23 ? hh * 60 + mm : null
}

/** The text of one day as zones, or null when it is not understood with certainty. */
export function parseDayHours(text: unknown): ParsedDay | null {
  if (typeof text !== 'string') return null
  const raw = text.trim()
  if (!raw) return null
  const folded = fold(raw)

  // «Κλειστά», «Κλειστό», «κλειστη»… A time next to it is not a plain closed day.
  if (folded.startsWith('κλειστ')) return /\d/.test(folded) ? null : { kind: 'closed' }
  if (/^24\s*ωρ(?:ες|ο)$/.test(folded)) return { kind: 'open', ranges: [{ open: 0, close: 1440 }] }

  const ranges: HoursRange[] = []
  for (const part of raw.split(',')) {
    const m = part.trim().match(ZONE)
    if (!m) return null
    const open = minutesOf(m[1], m[2], false)
    const close = minutesOf(m[3], m[4], true)
    if (open == null || close == null) return null
    // 00:00 as a close is 24:00; any close at or before the opening is after midnight.
    ranges.push({ open, close: close <= open ? close + 1440 : close })
  }
  return ranges.length ? { kind: 'open', ranges } : null
}

type Lookup = ParsedDay | null | undefined

/** undefined = the day is not there (or blank), null = there but not understood. */
function lookupDay(hours: Record<string, unknown>, dayIndex: number): Lookup {
  const v = hours[DAY_NAMES[dayIndex]]
  if (v == null || (typeof v === 'string' && !v.trim())) return undefined
  return parseDayHours(v)
}

/** True when a shift of the day before is still running at `minutes` (minutes since 00:00 of the day asked about). */
function tailOpen(prev: Lookup, minutes: number): boolean {
  if (!prev || prev.kind !== 'open') return false
  return prev.ranges.some(r => r.close > 1440 && minutes < r.close - 1440)
}

/**
 * Is the spot open at `minutes` after 00:00 of the calendar day `date`
 * (YYYY-MM-DD)? `minutes` may run past 1440 (the early hours of the night
 * count from the evening's date); it is folded into the next calendar day.
 */
export function spotStatusAt(
  hours: Record<string, unknown> | null | undefined,
  date: string,
  minutes: number,
): SpotStatus {
  if (!hours || typeof hours !== 'object' || Array.isArray(hours)) return 'unknown'
  if (!isDateKey(date) || !Number.isFinite(minutes) || minutes < 0) return 'unknown'

  let day = date
  let min = Math.floor(minutes)
  while (min >= 1440) { min -= 1440; day = addDaysKey(day, 1) }

  const idx = weekdayIndex(day)
  const today = lookupDay(hours, idx)
  const prev = lookupDay(hours, (idx + 6) % 7)

  // Open is certain as soon as one shift says so, whatever the other days say.
  if (tailOpen(prev, min)) return 'open'
  if (today && today.kind === 'open' && today.ranges.some(r => min >= r.open && min < r.close)) return 'open'

  // The day itself is not readable: nothing can be said about it.
  if (!today) return 'unknown'

  // Today is readable and says closed (or this is outside its zones). That is
  // a certain 'closed' unless an unreadable yesterday could still be running.
  if (prev === undefined || prev === null) return min < UNREADABLE_TAIL_MINUTES ? 'unknown' : 'closed'
  return 'closed'
}

/** A spot that closes within this many minutes is "closing soon" on the map. */
export const CLOSING_SOON_MINUTES = 90

/**
 * Minutes from `minutes` of the calendar day `date` until the spot closes, or
 * null when it is not certainly open then (closed, unreadable, no hours) or
 * never closes (24 h every day). Same input rules as spotStatusAt: `minutes`
 * may run past 1440 (the early hours of the night). Shifts that end after
 * midnight count, and a shift that ends at midnight and a next day that opens
 * at 00:00 are one continuous stay.
 */
export function minutesUntilClose(
  hours: Record<string, unknown> | null | undefined,
  date: string,
  minutes: number,
): number | null {
  if (spotStatusAt(hours, date, minutes) !== 'open' || !hours) return null

  let day = date
  let min = Math.floor(minutes)
  while (min >= 1440) { min -= 1440; day = addDaysKey(day, 1) }

  // `from` = minutes since 00:00 of `day`; `offset` = minutes from the asked moment to 00:00 of `day`.
  let from = min
  let offset = -min
  let chained: number | null = null // the midnight we have reached, if the shift runs on into the next day
  for (let i = 0; i < 8; i++) {
    const idx = weekdayIndex(day)
    const today = lookupDay(hours, idx)
    const prev = lookupDay(hours, (idx + 6) % 7)
    let end = -1
    if (prev && prev.kind === 'open') {
      for (const r of prev.ranges) if (r.close > 1440 && from < r.close - 1440) end = Math.max(end, r.close - 1440)
    }
    if (today && today.kind === 'open') {
      for (const r of today.ranges) if (from >= r.open && from < r.close) end = Math.max(end, r.close)
    }
    if (end < 0) return chained
    // Ends at midnight and the next day opens at 00:00: keep going.
    if (end === 1440) {
      day = addDaysKey(day, 1)
      offset += 1440
      chained = offset
      from = 0
      continue
    }
    return offset + end
  }
  return null
}

/** Open now and closing in `within` minutes or less (default CLOSING_SOON_MINUTES). */
export function closesSoon(
  hours: Record<string, unknown> | null | undefined,
  date: string,
  minutes: number,
  within: number = CLOSING_SOON_MINUTES,
): boolean {
  const left = minutesUntilClose(hours, date, minutes)
  return left !== null && left > 0 && left <= within
}
