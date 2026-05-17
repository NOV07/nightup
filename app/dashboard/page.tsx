import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import DashboardClient from './DashboardClient'

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

export default async function DashboardPage() {
  const supabase = await getSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/onboarding')

  const { data: events } = profile.profile_type === 'organizer' || profile.profile_type === 'venue'
    ? await supabase.from('events').select('*').eq('profile_id', profile.id).order('date', { ascending: false })
    : { data: [] }

  const { data: releases } = profile.profile_type === 'artist'
    ? await supabase.from('music_releases').select('*').eq('profile_id', profile.id).order('created_at', { ascending: false })
    : { data: [] }

  const { data: professional } = profile.profile_type === 'professional'
    ? await supabase.from('professionals').select('*').eq('profile_id', profile.id).single()
    : { data: null }

  return (
    <DashboardClient
      profile={profile}
      events={events ?? []}
      releases={releases ?? []}
      professional={professional}
    />
  )
}
