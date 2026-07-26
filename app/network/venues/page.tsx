import { Metadata } from 'next'
import { getSupabase } from '@/app/lib/supabase'
import { PROFILE_COLUMNS, type Profile } from '@/app/lib/networkProfile'
import { logQueryError } from '@/app/lib/logQueryError'
import VenuesPageClient from './VenuesPageClient'

export const metadata: Metadata = {
  title: 'Venues | Nightup Network',
  description: 'Clubs, μπαρ, rooftops και χώροι διαθέσιμοι για το επόμενο event σου.',
}

export const revalidate = 60;

export default async function VenuesPage() {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('network_tab', 'Venues')
    .order('is_featured', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  logQueryError('network/venues', 'profiles', error)

  return <VenuesPageClient profiles={(data ?? []) as Profile[]} />
}
