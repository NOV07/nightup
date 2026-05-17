import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '../../lib/supabase'

export async function POST() {
  const currentMonth = new Date().toISOString().slice(0, 7) // "YYYY-MM"

  try {
    const admin = getSupabaseAdmin()

    // Try to increment existing row
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

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[track-visit]', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
