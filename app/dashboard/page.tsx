import { createClient } from '@/app/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/onboarding')

  const { data: events } = profile.profile_type === 'organizer' || profile.profile_type === 'venue'
    ? await supabase.from('events').select('*').eq('profile_id', profile.id).order('date', { ascending: false })
    : { data: [] }

  const { data: releases } = profile.profile_type === 'artist'
    ? await supabase.from('music_releases').select('*').eq('profile_id', profile.id).order('created_at', { ascending: false })
    : { data: [] }

  const { data: professional } = profile.profile_type === 'professional'
    ? await supabase.from('professionals').select('*').eq('profile_id', profile.id).single()
    : { data: null }

  // Two-step fetch (mirrors saved_spots pattern — avoids silent PostgREST join failure)
  const { data: savedEventRows } = profile.profile_type === 'user'
    ? await supabase
        .from('saved_events')
        .select('event_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
    : { data: [] }

  const eventIds = (savedEventRows ?? []).map((r: any) => r.event_id)

  const { data: savedEvents } = eventIds.length > 0
    ? await supabase
        .from('events')
        .select('id, title, image_url, date, venue, city, genre')
        .in('id', eventIds)
    : { data: [] }

  const { data: savedSpotRows } = profile.profile_type === 'user'
    ? await supabase.from('saved_spots').select('spot_id').eq('user_id', user.id)
    : { data: [] }

  const spotIds = (savedSpotRows ?? []).map((r: any) => r.spot_id)

  const { data: savedSpots } = spotIds.length > 0
    ? await supabase
        .from('spots')
        .select('id, name, slug, cover_image, category, neighborhood, rating')
        .in('id', spotIds)
    : { data: [] }

  const { data: followsRaw } = profile.profile_type === 'user'
    ? await supabase
        .from('follows')
        .select('profile_id, profiles(id, username, display_name, avatar_url, location, network_tab, network_category)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
    : { data: [] }

  const followedProfiles = (followsRaw ?? [])
    .map((r: any) => r.profiles)
    .filter(Boolean)

  const { data: listingsRaw } = profile.profile_type !== 'user'
    ? await supabase
        .from('listings')
        .select('*, listing_interests(count)')
        .eq('profile_id', profile.id)
        .order('created_at', { ascending: false })
    : { data: [] }

  const listings = (listingsRaw ?? []).map((l: any) => ({
    ...l,
    _interest_count: l.listing_interests?.[0]?.count ?? 0,
  }))

  const today = new Date().toISOString().split('T')[0]
  const upcomingEvents = (savedEvents ?? [])
    .filter((e: any) => e?.date && e.date >= today)
    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5)

  return (
    <DashboardClient
      profile={profile}
      events={events ?? []}
      releases={releases ?? []}
      professional={professional}
      savedEvents={savedEvents ?? []}
      savedSpots={savedSpots ?? []}
      upcomingEvents={upcomingEvents}
      followedProfiles={followedProfiles}
      listings={listings ?? []}
    />
  )
}
