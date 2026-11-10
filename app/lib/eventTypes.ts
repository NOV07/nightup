// The one rule that turns a stored `events.type` into one of the four event
// types. The public map (/map) and the tabs of /events and /events/all all use
// it, so an event is in the same group everywhere. No imports and only erasable
// TS syntax, so the offline test scripts can load it in plain Node.

export type EventType = 'music' | 'culture' | 'sports' | 'other'
export const EVENT_TYPES: readonly EventType[] = ['music', 'culture', 'sports', 'other']

/**
 * The organiser form offers these wording-style values (EVENT_TYPES in
 * components/events/EventFormSteps.tsx) next to the four stored keys. The four
 * below are music events; 'Private Party' and 'Other' are not, and fall to 'other'.
 */
const LEGACY_MUSIC_TYPES: ReadonlySet<string> = new Set(['Club Night', 'Live Show', 'Festival', 'Open Air'])

/**
 * The event type of a stored `events.type`:
 *   music | culture | sports | other   as they are
 *   Club Night | Live Show | Festival | Open Air   -> music (exact spelling, as the form writes them)
 *   Private Party | Other | null | anything unknown   -> other
 */
export function eventTypeOf(raw: unknown): EventType {
  if (raw === 'music' || raw === 'culture' || raw === 'sports' || raw === 'other') return raw
  return typeof raw === 'string' && LEGACY_MUSIC_TYPES.has(raw) ? 'music' : 'other'
}

/** The events of one type, by the rule above. Every event is in exactly one type. */
export function eventsOfType<T extends { type?: unknown }>(events: readonly T[], type: EventType): T[] {
  return events.filter(e => eventTypeOf(e.type) === type)
}
