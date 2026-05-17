import { NextResponse } from 'next/server'
import { getSupabase } from '../../lib/supabase'
import { events as mockEvents } from '../../lib/data'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = getSupabase()
  const currentMonth = new Date().toISOString().slice(0, 7) // "YYYY-MM"

  try {
    const [eventsRes, profRes, citiesRes, visitorsRes] = await Promise.all([
      supabase
        .from('events')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'approved'),
      supabase
        .from('professionals')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'approved'),
      supabase
        .from('events')
        .select('city')
        .eq('status', 'approved'),
      supabase
        .from('site_stats')
        .select('visitor_count')
        .eq('month', currentMonth)
        .maybeSingle(),
    ])

    // Events count: Supabase approved + mock fallback
    const dbEventCount = eventsRes.count ?? 0
    const mockEventCount = mockEvents.length
    const eventsTotal = dbEventCount > 0 ? dbEventCount + mockEventCount : mockEventCount

    // Professionals count: Supabase approved
    const profTotal = profRes.count ?? 0

    // Distinct cities: combine Supabase cities + mock cities
    const dbCities = new Set<string>((citiesRes.data ?? []).map((r) => r.city).filter(Boolean))
    mockEvents.forEach((e) => dbCities.add(e.city))
    const citiesTotal = dbCities.size

    // Monthly visitors
    const visitorsTotal = (visitorsRes.data?.visitor_count as number) ?? 0

    return NextResponse.json({
      events: eventsTotal,
      professionals: profTotal,
      cities: citiesTotal,
      visitors: visitorsTotal,
    })
  } catch (err) {
    console.error('[stats]', err)
    // Fallback to mock data counts
    const mockCities = new Set(mockEvents.map((e) => e.city))
    return NextResponse.json({
      events: mockEvents.length,
      professionals: 0,
      cities: mockCities.size,
      visitors: 0,
    })
  }
}
