import { NextRequest, NextResponse } from 'next/server'
import { signAdminToken } from '@/app/lib/adminAuth'

const RATE_LIMIT_MAX = 5
const RATE_LIMIT_WINDOW_MS = 1000 * 60 * 15 // 15 minutes

// Module-level Map — resets on cold start, and isn't shared across serverless
// instances, but it's a meaningful improvement over having zero rate limiting.
const attempts = new Map<string, { count: number; resetAt: number }>()

function getClientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
}

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = attempts.get(ip)

  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }

  entry.count += 1
  return entry.count > RATE_LIMIT_MAX
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many attempts — try again later' }, { status: 429 })
  }

  const { password } = await req.json()

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set('admin_auth', signAdminToken(), {
    httpOnly: true,
    secure: true,
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
    sameSite: 'strict',
  })
  return res
}
