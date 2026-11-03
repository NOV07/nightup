// Event selection + formatting for the TonightModal "Surprise me" result box.
// All "today" logic uses Europe/Athens, never UTC.

const TZ = "Europe/Athens";
const WINDOW_DAYS = 7;
const MAX_HOURS_AFTER_START = 4;

export interface TonightEventLike {
  date: string;
  time: string | null;
}

type Lang = "el" | "en";

/** Current date (YYYY-MM-DD) and minutes since midnight, in Europe/Athens. */
export function athensNow(now: Date = new Date()): { date: string; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

/** Whole days from `from` to `to` (both YYYY-MM-DD). NaN if either is malformed. */
export function dayDiff(from: string, to: string): number {
  const f = Date.parse(`${from.slice(0, 10)}T00:00:00Z`);
  const t = Date.parse(`${to.slice(0, 10)}T00:00:00Z`);
  return Math.round((t - f) / 86_400_000);
}

/** "23:00:00" / "23:00" -> "23:00"; null when missing or malformed. */
export function formatTime(time: string | null | undefined): string | null {
  const m = time?.match(/^(\d{1,2}):(\d{2})/);
  return m ? `${m[1].padStart(2, "0")}:${m[2]}` : null;
}

function startMinutes(time: string | null | undefined): number | null {
  const t = formatTime(time);
  return t ? Number(t.slice(0, 2)) * 60 + Number(t.slice(3)) : null;
}

/**
 * Nearest event from today up to +7 days (Athens time). Same-day ties keep the
 * first in input order. Events today that started more than 4 hours ago are
 * skipped; events without a time are always kept. Returns null if none qualify.
 */
export function pickNearestEvent<E extends TonightEventLike>(events: E[], now: Date = new Date()): E | null {
  const today = athensNow(now);
  let best: E | null = null;
  let bestDiff = Infinity;
  for (const e of events) {
    const diff = dayDiff(today.date, e.date);
    if (!Number.isFinite(diff) || diff < 0 || diff > WINDOW_DAYS) continue;
    if (diff === 0) {
      const start = startMinutes(e.time);
      if (start !== null && today.minutes - start > MAX_HOURS_AFTER_START * 60) continue;
    }
    if (diff < bestDiff) {
      best = e;
      bestDiff = diff;
    }
  }
  return best;
}

const locale = (lang: Lang) => (lang === "el" ? "el-GR" : "en-GB");

// Noon UTC keeps the calendar day stable when rendered in Europe/Athens.
const atNoon = (date: string) => new Date(`${date.slice(0, 10)}T12:00:00Z`);

/** Translation key for the box title, based on how far away the event is. */
export function eventTitleKey(
  eventDate: string,
  now: Date = new Date()
): "tonight_try_event_today" | "tonight_try_event_tomorrow" | "tonight_try_event_day" {
  const diff = dayDiff(athensNow(now).date, eventDate);
  return diff <= 0 ? "tonight_try_event_today" : diff === 1 ? "tonight_try_event_tomorrow" : "tonight_try_event_day";
}

/** Full weekday name ("Παρασκευή" / "Friday") for the {day} placeholder. */
export function formatWeekdayLong(date: string, lang: Lang): string {
  return new Intl.DateTimeFormat(locale(lang), { timeZone: TZ, weekday: "long" }).format(atNoon(date));
}

/** "Παρ 6 Νοε · 23:00" (time omitted when missing). */
export function formatEventLine(date: string, time: string | null | undefined, lang: Lang): string {
  const parts = new Intl.DateTimeFormat(locale(lang), {
    timeZone: TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).formatToParts(atNoon(date));
  const get = (type: string) => (parts.find((p) => p.type === type)?.value ?? "").replace(/\./g, "");
  const day = `${get("weekday")} ${get("day")} ${get("month")}`;
  const hhmm = formatTime(time);
  return hhmm ? `${day} · ${hhmm}` : day;
}
