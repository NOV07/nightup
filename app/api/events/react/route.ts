import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '../../../lib/supabase'

const VALID_COLUMNS = ['interested_count', 'going_count'] as const
type Column = typeof VALID_COLUMNS[number]

export async function POST(req: NextRequest) {
  let body: { eventId: string; column: Column; delta: 1 | -1 }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { eventId, column, delta } = body

  if (!eventId || !VALID_COLUMNS.includes(column) || (delta !== 1 && delta !== -1)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()

  const { data, error: readError } = await admin
    .from('events')
    .select(column)
    .eq('id', eventId)
    .single()

  if (readError || !data) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  const current = ((data as Record<string, unknown>)[column] as number) ?? 0
  const next = Math.max(0, current + delta)

  const { error: updateError } = await admin
    .from('events')
    .update({ [column]: next })
    .eq('id', eventId)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, value: next })
}
