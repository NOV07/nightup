import { Metadata } from 'next'
import { getSupabase } from '@/app/lib/supabase'
import { PROFILE_COLUMNS, type Profile } from '@/app/lib/networkProfile'
import ProfessionalsPageClient from './ProfessionalsPageClient'

export const metadata: Metadata = {
  title: 'Professionals | Nightup Network',
  description: 'Φωτογράφοι, sound & lighting, catering, studio και booking agents σε όλη την Ελλάδα.',
}

export const revalidate = 60;

export default async function ProfessionalsPage() {
  const supabase = getSupabase()

  const { data } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('network_tab', 'Professionals')
    .order('is_featured', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  return <ProfessionalsPageClient profiles={(data ?? []) as Profile[]} />
}
