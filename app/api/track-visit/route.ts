import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '../../lib/supabase'

export async function POST() {
  const currentMonth = new Date().toISOString().slice(0, 7) // "YYYY-MM"

  try {
    const admin = getSupabaseAdmin()

    // Atomic upsert (see supabase/migrations/20260815000000_site_stats_atomic_increment.sql).
    // Falls back to the old read-then-write path if that migration hasn't
    // been applied yet, so this route keeps working either way.
    const { error: rpcError } = await admin.rpc('increment_site_visit', { p_month: currentMonth })

    if (rpcError) {
      const { data: existing } = await admin
        .from('site_stats')
        .select('id, visitor_count')
        .eq('month', currentMonth)
        .maybeSingle()

      if (existing) {
        await admin
          .from('site_stats')
          .update({ visitor_count: (existing.visitor_count ?? 0) + 1, updated_at: new Date().toISOString() })
          .eq('id', existing.id)
      } else {
        await admin
          .from('site_stats')
          .insert({ month: currentMonth, visitor_count: 1 })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[track-visit]', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
