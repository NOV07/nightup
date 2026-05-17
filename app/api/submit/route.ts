import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '../../lib/supabase'

const VALID_TABLES = ['events', 'professionals'] as const

export async function POST(req: NextRequest) {
  let body: { table: string; data: Record<string, unknown> }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { table, data } = body

  if (!VALID_TABLES.includes(table as (typeof VALID_TABLES)[number]) || !data) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  // Minimum required fields only
  if (table === 'events' && (!data.title || !data.date)) {
    return NextResponse.json({ error: 'Missing required fields: title, date' }, { status: 400 })
  }
  if (table === 'professionals' && (!data.name || !data.category)) {
    return NextResponse.json({ error: 'Missing required fields: name, category' }, { status: 400 })
  }

  try {
    const supabase = getSupabase()
    const { error } = await supabase
      .from(table)
      .insert({ ...data, status: 'pending' })

    if (error) {
      console.error('[submit] Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[submit] Exception:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
