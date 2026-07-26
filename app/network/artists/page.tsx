import { Metadata } from 'next'
import { getSupabase } from '@/app/lib/supabase'
import { PROFILE_COLUMNS, type Profile } from '@/app/lib/networkProfile'
import { logQueryError } from '@/app/lib/logQueryError'
import ArtistsPageClient from './ArtistsPageClient'

export const metadata: Metadata = {
  title: 'Artists | Nightup Network',
  description: 'DJs, τραγουδιστές, μπάντες και οργανοπαίχτες σε όλη την Ελλάδα.',
}

export const revalidate = 60;

export default async function ArtistsPage() {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('network_tab', 'Artists')
    .order('is_featured', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  logQueryError('network/artists', 'profiles', error)

  return <ArtistsPageClient profiles={(data ?? []) as Profile[]} />
}
