import { createClient } from '@/app/lib/supabase-server'
import { redirect } from 'next/navigation'
import NewSpotClient from './NewSpotClient'

export default async function NewSpotPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/dashboard')

  const { data: profile } = await supabase
    .from('profiles')
    .select('profile_type')
    .eq('id', user.id)
    .single()

  if (!profile || profile.profile_type !== 'spot') redirect('/dashboard')

  // One spot per account — send an owner who already has one to its editor
  // rather than letting them fill in a wizard the API will reject.
  const { data: owned } = await supabase
    .from('spots')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (owned) redirect(`/dashboard/edit/spot/${owned.id}`)

  return <NewSpotClient />
}
