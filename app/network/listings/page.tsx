import { Metadata } from 'next'
import { getSupabase } from '@/app/lib/supabase'
import { logQueryError } from '@/app/lib/logQueryError'
import ListingsPageClient from './ListingsPageClient'

export const metadata: Metadata = {
  title: 'Αγγελίες | Nightup Network',
  description: 'Βρες συνεργάτες για events και μουσική καριέρα στην Ελλάδα.',
}

export const revalidate = 60;

export default async function ListingsPage() {
  const supabase = getSupabase()

  const { data: listingsRaw, error } = await supabase
    .from('listings')
    .select('*, profiles(id, display_name, username, avatar_url, avatar_crop_x, avatar_crop_y, avatar_crop_width, avatar_crop_height, network_tab, network_category, network_subcategory)')
    .eq('is_active', true)
    .order('is_sponsored', { ascending: false })
    .order('created_at', { ascending: false })

  logQueryError('network/listings', 'listings', error)

  const listings = listingsRaw ?? []

  return <ListingsPageClient listings={listings} />
}
