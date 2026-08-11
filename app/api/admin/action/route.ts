import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '../../../lib/supabase'
import { verifyAdminToken } from '@/app/lib/adminAuth'
import { revalidatePublicPaths } from '@/app/lib/revalidateContent'

function isAdmin(req: NextRequest) {
  return verifyAdminToken(req.cookies.get('admin_auth')?.value)
}

const VALID_TABLES = ['events', 'articles', 'music_releases', 'mixes', 'playlists', 'artists', 'spots']
const VALID_ACTIONS = ['approved', 'hidden', 'rejected']

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { table, id, action } = await req.json()

  if (!VALID_TABLES.includes(table) || !VALID_ACTIONS.includes(action) || !id) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()

  // spots has no `status` column — is_published is its gate, and every public
  // read filters on it. Sending `status` here returned a 400 for every spot.
  const patch = table === 'spots'
    ? { is_published: action === 'approved' }
    : { status: action }

  const { error } = await admin.from(table).update(patch).eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Approving or hiding changes what the public reads, so the cached pages
  // have to drop their copy.
  revalidatePublicPaths(table)
  return NextResponse.json({ ok: true })
}
