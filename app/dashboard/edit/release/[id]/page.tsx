import { createClient } from '@/app/lib/supabase-server'
import { redirect, notFound } from 'next/navigation'
import EditReleaseClient from './EditReleaseClient'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditReleasePage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: release } = await supabase
    .from('music_releases')
    .select('*')
    .eq('id', id)
    .single()

  if (!release) notFound()

  if (release.profile_id !== user.id) redirect('/dashboard')

  return <EditReleaseClient release={release} />
}
