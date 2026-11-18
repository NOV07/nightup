import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '../../lib/supabase'

export async function POST() {
  const currentMonth = new Date().toISOString().slice(0, 7) // "YYYY-MM"

  try {
    const admin = getSupabaseAdmin()

    // Atomic upsert (see supabase/migrations/20260815000000_site_stats_atomic_increment.sql).
    const { error: rpcError } = await admin.rpc('increment_site_visit', { p_month: currentMonth })

    if (rpcError) {
      console.error('[track-visit] rpc', rpcError)
      return NextResponse.json({ ok: false }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[track-visit]', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
