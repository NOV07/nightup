import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '../../../lib/supabase'

function isAdmin(req: NextRequest) {
  return req.cookies.get('admin_auth')?.value === process.env.ADMIN_PASSWORD
}

const VALID_TABLES = ['events', 'professionals', 'articles', 'organizers', 'music_releases', 'mixes', 'playlists', 'artists']
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
  const { error } = await admin.from(table).update({ status: action }).eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
