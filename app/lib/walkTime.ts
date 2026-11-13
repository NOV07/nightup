export type WalkLeg = { meters: number; minutes: number };

type Point = { lat: number; lng: number };

const EARTH_RADIUS_M = 6371008.8;
/** Straight line -> real streets. */
const DETOUR = 1.3;
/** Walking speed in metres per minute (~4.8 km/h). */
const METERS_PER_MIN = 80;

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
  return { meters, minutes: Math.max(1, Math.round((meters * DETOUR) / METERS_PER_MIN)) };
}
