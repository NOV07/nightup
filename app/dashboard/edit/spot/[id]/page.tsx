import { createClient } from '@/app/lib/supabase-server'
import { redirect, notFound } from 'next/navigation'
import EditSpotClient from './EditSpotClient'

export default async function EditSpotPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/dashboard')

  const { data: spot } = await supabase
    .from('spots')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (!spot) notFound()
  if (spot.owner_id !== user.id) redirect('/dashboard')

  return <EditSpotClient spot={spot} />
}
