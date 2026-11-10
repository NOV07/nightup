// How the map shows a night and which nights can be picked. A night is a plain
// calendar date (YYYY-MM-DD), so the label does not depend on the time zone of the
// phone or the server: it is built from the date's own parts, in UTC. No React,
// so scripts/test-map-date.mjs can load it in plain Node.

import { addDaysKey, isDateKey } from './dateKey.ts'
import { MAX_NIGHTS_AHEAD } from './athensTime.ts'

/** «Τρί 10 Νοε» (Greek) or «Tue 10 Nov»: weekday, day and month, abbreviated. Empty for a bad date. */
export function formatNightLabel(date: string, lang: string): string {
  if (!isDateKey(date)) return ''
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString(lang === 'en' ? 'en-GB' : 'el-GR', {
    weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC',
  })
}

/** The first and last night the picker offers: tonight and tonight + 60. */
export function nightBounds(tonight: string): { min: string; max: string } {
  return { min: tonight, max: addDaysKey(tonight, MAX_NIGHTS_AHEAD) }
}
