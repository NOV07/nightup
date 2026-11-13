// Tunable constants.
/** Straight line -> real streets (walking). */
const WALK_DETOUR = 1.3;
/** Walking speed in metres per minute (~4.8 km/h). */
const WALK_METERS_PER_MIN = 80;
/** Straight line -> real streets (driving). */
const DRIVE_DETOUR = 1.4;
/** City driving speed in metres per minute (~24 km/h). */
const DRIVE_METERS_PER_MIN = 400;
const DRIVE_MIN_MINUTES = 2;
/** The car time is shown next to the walk time only when walking takes more than this many minutes. */
export const SHOW_DRIVE_AFTER_WALK_MIN = 10;

export type WalkLeg = { meters: number; minutes: number };

type Point = { lat: number; lng: number };

const EARTH_RADIUS_M = 6371008.8;

/** Great-circle distance between two points, in metres. */
export function haversineMeters(a: Point, b: Point): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Estimated walk between two points: metres (straight line) and minutes ((metres x 1.3) / 80, rounded, at least 1). */
export function walkLeg(a: Point, b: Point): WalkLeg {
  const meters = haversineMeters(a, b);
  return { meters, minutes: Math.max(1, Math.round((meters * WALK_DETOUR) / WALK_METERS_PER_MIN)) };
}

/** Estimated drive between two points: metres (straight line) and minutes ((metres x 1.4) / 400, rounded, at least 2). */
export function driveLeg(a: Point, b: Point): WalkLeg {
  const meters = haversineMeters(a, b);
  return { meters, minutes: Math.max(DRIVE_MIN_MINUTES, Math.round((meters * DRIVE_DETOUR) / DRIVE_METERS_PER_MIN)) };
}

export type LegTimes = { walk: WalkLeg; drive: WalkLeg | null };

/** Both times of one leg, from one place. `drive` is set only when the walk is longer than 10 minutes. */
export function legTimes(a: Point, b: Point): LegTimes {
  const walk = walkLeg(a, b);
  return { walk, drive: walk.minutes > SHOW_DRIVE_AFTER_WALK_MIN ? driveLeg(a, b) : null };
}
