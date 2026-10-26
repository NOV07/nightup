import { createClient } from '@/app/lib/supabase-server'
import { redirect } from 'next/navigation'

// Legacy entry point (footer, about page). The dashboard form is the single
// submission path: it covers every type /api/events accepts and asks artists
// for the organiser name, which this route's old standalone form did not.
export default async function SubmitEventPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in?redirect=/dashboard/events/new')

  const { data: profile } = await supabase
    .from('profiles')
    .select('profile_type')
    .eq('id', user.id)
    .single()

  if (!profile || profile.profile_type === 'user') redirect('/upgrade')

  redirect('/dashboard/events/new')
}
