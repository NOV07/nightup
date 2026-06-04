import { createClient } from '@/app/lib/supabase-server'
import { redirect, notFound } from 'next/navigation'
import EditEventClient from './EditEventClient'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditEventPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single()

  if (!event) notFound()

  if (event.profile_id !== user.id) redirect('/dashboard')

  return <EditEventClient event={event} />
}
