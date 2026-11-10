import { getSupabase } from '../lib/supabase'
import { getAllSpots } from '../spots/data'
import type { MapPoint } from '../lib/mapFilters'
import { isSpotSub, type SpotCategory } from '../lib/spotCategories'
import { eventToPoint, localToday } from '../lib/mapEvents'
import { getEventCoverImage } from '../lib/getEventCoverImage'

// Only the columns the public map needs. Not source_url, not coords_verified.
const WELLNESS_COLS = 'id, slug, name, area, description, access_note, lat, lng, verified_night, photo_urls, subcategories'

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

async function getWellnessPoints(): Promise<MapPoint[]> {
  try {
    const { data, error } = await getSupabase()
      .from('wellness_spots')
      .select(WELLNESS_COLS)
      .eq('published', true)
      .not('lat', 'is', null)
      .not('lng', 'is', null)
      .order('name')
    if (error || !data) return []
    return data.filter(r => isNum(r.lat) && isNum(r.lng)).map((r): MapPoint => ({
      kind: 'wellness',
      id: `w-${r.id}`,
      slug: r.slug,
      name: r.name,
      area: r.area ?? null,
      lat: r.lat as number,
      lng: r.lng as number,
      categories: ['wellness'],
      subcategories: ((r.subcategories as string[] | null) ?? []).filter(isSpotSub),
      description: r.description ?? null,
      accessNote: r.access_note ?? null,
      verifiedNight: r.verified_night === true,
      image: ((r.photo_urls as string[] | null) ?? [])[0] ?? null,
    }))
  } catch (e) {
    console.error('Map wellness fetch error:', e)
    return []
  }
}

async function getSpotPoints(): Promise<MapPoint[]> {
  const spots = await getAllSpots() // published only; never throws
  return spots
    .filter(s => isNum(s.lat) && isNum(s.lng))
    .map((s): MapPoint => ({
      kind: 'spot',
      id: `s-${s.id}`,
      slug: s.slug,
      name: s.name,
      area: s.neighborhood ?? null,
      lat: s.lat as number,
      lng: s.lng as number,
      categories: s.categories as SpotCategory[],
      subcategories: s.subcategories,
      description: null,
      accessNote: null,
      verifiedNight: false,
      image: s.coverImage ?? null,
    }))
}

/** Approved, upcoming events with a confirmed pin. Old events have no coordinates and stay off the map. */
export async function getEventPoints(): Promise<MapPoint[]> {
  try {
    const today = localToday()
    const { data, error } = await getSupabase()
      .from('events')
      .select('id, title, image_url, has_copyright_restriction, date, time, venue, city, lat, lng')
      .eq('status', 'approved')
      .gte('date', today)
      .not('lat', 'is', null)
      .not('lng', 'is', null)
      .order('date', { ascending: true })
    if (error || !data) return []
    return data.flatMap(r => {
      const p = eventToPoint(r, today, getEventCoverImage(r))
      return p ? [p] : []
    })
  } catch (e) {
    console.error('Map events fetch error:', e)
    return []
  }
}

/** Points of the three layers. A failed read gives fewer points, never an error. */
export async function getMapPoints(): Promise<MapPoint[]> {
  const [wellness, spots, events] = await Promise.all([getWellnessPoints(), getSpotPoints(), getEventPoints()])
  return [...spots, ...wellness, ...events]
}
