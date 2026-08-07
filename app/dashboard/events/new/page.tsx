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

  if (!profile || !['organizer', 'spot'].includes(profile.profile_type)) redirect('/dashboard')

  // A spot hosting its own night almost always runs it at its own address, so
  // seed the venue fields from the spot. Editable — a spot can host elsewhere.
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
  }

  return <NewEventClient venueDefaults={venueDefaults} />
}
