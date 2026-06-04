import { createClient } from '@/app/lib/supabase-server'
import { redirect } from 'next/navigation'
import SubmitEventForm from './SubmitEventForm'

export default async function SubmitEventPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/?message=signin_required')

  return <SubmitEventForm />
}
