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

  if (!profile || profile.profile_type !== 'organizer') redirect('/dashboard')

  return <NewEventClient />
}
