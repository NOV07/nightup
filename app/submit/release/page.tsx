import { createClient } from '@/app/lib/supabase-server'
import { redirect } from 'next/navigation'
import SubmitReleaseForm from './SubmitReleaseForm'

export default async function SubmitReleasePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in?redirect=/submit/release')

  const { data: profile } = await supabase
    .from('profiles')
    .select('profile_type')
    .eq('id', user.id)
    .single()

  if (!profile || profile.profile_type === 'user') redirect('/upgrade')

  return <SubmitReleaseForm />
}
