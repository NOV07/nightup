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

  const { data: savedEventsRaw } = profile.profile_type === 'user'
    ? await supabase
        .from('saved_events')
        .select('event_id, events(id, title, image_url, date, venue, city, genre)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
    : { data: [] }

  const savedEvents = (savedEventsRaw ?? [])
    .map((r: any) => r.events)
    .filter(Boolean)

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

  return (
    <DashboardClient
      profile={profile}
      events={events ?? []}
      releases={releases ?? []}
      professional={professional}
      savedEvents={savedEvents}
      savedSpots={savedSpots ?? []}
    />
  )
}
