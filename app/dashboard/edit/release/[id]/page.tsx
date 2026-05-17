import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import EditReleaseClient from './EditReleaseClient'

async function getSupabaseClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditReleasePage({ params }: Props) {
  const { id } = await params
  const supabase = await getSupabaseClient()

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
