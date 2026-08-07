import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase-server'
import { SPOT_FIELDS } from '../route'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: existing } = await supabase
    .from('spots')
    .select('owner_id')
    .eq('id', id)
    .maybeSingle()

  if (!existing) {
    return NextResponse.json({ error: 'Spot not found' }, { status: 404 })
  }

  if (existing.owner_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Slug stays fixed after creation — it is the public URL. is_published and
  // owner_id are deliberately absent so an owner cannot self-publish.
  const updates: Record<string, unknown> = {}
  SPOT_FIELDS.forEach(k => { if (k in body) updates[k] = body[k] })

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('spots')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
