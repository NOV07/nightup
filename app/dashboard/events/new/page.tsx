import { createClient } from '@/app/lib/supabase-server'
import { redirect } from 'next/navigation'
import NewEventClient from './NewEventClient'

export default async function NewEventPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/dashboard')

  const { data: profile } = await supabase
    .from('profiles')
    .select('profile_type')
    .eq('id', user.id)
    .single()

  // Kept in step with the same list in /api/events, which is what actually
  // enforces this. The two had drifted: the API already allowed professionals
  // while this page redirected them away.
  if (!profile || !['organizer', 'professional', 'spot', 'venue'].includes(profile.profile_type)) redirect('/dashboard')

  // An account hosting its own night almost always runs it at its own address,
  // so seed the venue fields from it. Editable — either can host elsewhere.
  let venueDefaults: { venue: string; city: string; address: string } | null = null
  if (profile.profile_type === 'spot') {
    const { data: spot } = await supabase
      .from('spots')
      .select('name, city, address')
      .eq('owner_id', user.id)
      .maybeSingle()
    if (spot) {
      venueDefaults = { venue: spot.name ?? '', city: spot.city ?? '', address: spot.address ?? '' }
    }
  } else if (profile.profile_type === 'venue') {
    const { data: venue } = await supabase
      .from('profiles')
      .select('display_name, location, venue_address')
      .eq('id', user.id)
      .maybeSingle()
    if (venue) {
      venueDefaults = { venue: venue.display_name ?? '', city: venue.location ?? '', address: venue.venue_address ?? '' }
    }
  }

  return <NewEventClient venueDefaults={venueDefaults} />
}
