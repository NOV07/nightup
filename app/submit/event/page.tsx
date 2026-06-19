import { createClient } from '@/app/lib/supabase-server'
import { redirect } from 'next/navigation'
import SubmitEventForm from './SubmitEventForm'

export default async function SubmitEventPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in?redirect=/submit/event')

  const { data: profile } = await supabase
    .from('profiles')
    .select('profile_type')
    .eq('id', user.id)
    .single()

  if (!profile || profile.profile_type === 'user') redirect('/upgrade')

  return <SubmitEventForm />
}
