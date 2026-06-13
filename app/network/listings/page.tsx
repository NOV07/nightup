import { Metadata } from 'next'
import { getSupabase } from '@/app/lib/supabase'
import ListingsPageClient from './ListingsPageClient'

export const metadata: Metadata = {
  title: 'Αγγελίες | Nightup Network',
  description: 'Βρες συνεργάτες για events και μουσική καριέρα στην Ελλάδα.',
}

export const dynamic = 'force-dynamic'

export default async function ListingsPage() {
  const supabase = getSupabase()

  const { data: listingsRaw } = await supabase
    .from('listings')
    .select('*, profiles(id, display_name, username, avatar_url, network_tab, network_category, network_subcategory)')
    .eq('is_active', true)
    .order('is_sponsored', { ascending: false })
    .order('created_at', { ascending: false })

  const listings = listingsRaw ?? []

  return <ListingsPageClient listings={listings} />
}
