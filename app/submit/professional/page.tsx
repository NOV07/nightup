import { createClient } from '@/app/lib/supabase-server'
import { redirect } from 'next/navigation'

export default async function SubmitProfessionalPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in?redirect=/upgrade')

  redirect('/upgrade')
}
