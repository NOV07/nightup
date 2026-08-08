import { createClient } from '@/app/lib/supabase-server'
import { redirect } from 'next/navigation'
import ProfessionalProfileClient from './ProfessionalProfileClient'

export default async function ProfessionalProfilePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // The wizard edits the account's own profile row, so it only makes sense for
  // an account that already is one.
  if (!profile || profile.profile_type !== 'professional') redirect('/dashboard')

  return <ProfessionalProfileClient profile={profile} />
}
