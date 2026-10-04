#!/usr/bin/env node
/**
 * Route-level tests for POST /api/maps/resolve against a running dev server:
 * auth (401), SSRF rejections, and the per-user rate limit. With --links it
 * also resolves real short links and prints what the route returned.
 *
 *   npm run dev                                           # other terminal
 *   node scripts/test-maps-resolve-route.mjs
 *   node scripts/test-maps-resolve-route.mjs --links <url> <url> <url>
 *
 * Needs .env.local (Supabase URL, anon key, service role key). Creates
 * throwaway "+deltest-" accounts and does NOT delete them: it prints the
 * credentials and also saves them to TEST_CREDS_FILE (default: the OS temp
 * dir), which later runs reuse. Real accounts are never touched.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { randomBytes } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const env = { ...Object.fromEntries(readFileSync(resolve(ROOT, '.env.local'), 'utf8').split(/\r?\n/).flatMap(l => {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
  return m ? [[m[1], m[2].replace(/^["']|["']$/g, '')]] : []
})), ...process.env }

const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY, SERVICE = env.SUPABASE_SERVICE_ROLE_KEY
const BASE = (env.TEST_BASE_URL || 'http://localhost:3000').replace(/\/$/, '')
const CREDS_FILE = env.TEST_CREDS_FILE || join(tmpdir(), 'maps-resolve-test-accounts.json')
const TS = Date.now()
if (!URL_ || !ANON || !SERVICE) { console.error('Missing Supabase env vars in .env.local'); process.exit(1) }

const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } })
let fails = 0
const check = (name, ok, detail = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`) }

async function account(role) {
  const saved = existsSync(CREDS_FILE) ? JSON.parse(readFileSync(CREDS_FILE, 'utf8')) : {}
  if (saved[role]) return saved[role]
  const email = `dkantanoleon+deltest-maps-${role}-${TS}@gmail.com`
  const password = `Dt-${randomBytes(9).toString('base64url')}!9`
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (error) throw new Error(`createUser: ${error.message}`)
  const { error: pe } = await admin.from('profiles').upsert({
    id: data.user.id, username: `deltest_maps_${role}_${TS}`, display_name: `Deltest maps ${role}`, profile_type: 'spot',
  })
  if (pe) throw new Error(`profile: ${pe.message}`)
  const acct = { id: data.user.id, email, password }
  writeFileSync(CREDS_FILE, JSON.stringify({ ...saved, [role]: acct }, null, 2))
  return acct
}

async function session(acct) {
  const jar = new Map()
  const client = createServerClient(URL_, ANON, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (list) => list.forEach(({ name, value }) => (value ? jar.set(name, value) : jar.delete(name))),
    },
  })
  const { error } = await client.auth.signInWithPassword({ email: acct.email, password: acct.password })
  if (error) throw new Error(`sign-in: ${error.message}`)
  const cookie = [...jar].map(([n, v]) => `${n}=${v}`).join('; ')
  return (url, withCookie = true) => post(url, withCookie ? cookie : undefined)
}

async function post(url, cookie) {
  const res = await fetch(`${BASE}/api/maps/resolve`, {
    method: 'POST', headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: JSON.stringify({ url }), cache: 'no-store',
  })
  let body = null
  try { body = await res.json() } catch {}
  return { status: res.status, body }
}

await fetch(BASE).catch(() => { console.error(`Dev server not reachable at ${BASE}`); process.exit(1) })

const linksAt = process.argv.indexOf('--links')
const links = linksAt >= 0 ? process.argv.slice(linksAt + 1) : []

const A = await account('main')
const call = await session(A)

if (!links.length) {
  console.log('\n── 401 without a session')
  const anon = await post('https://maps.app.goo.gl/x')
  check('no cookie -> 401', anon.status === 401, `status ${anon.status}`)

  console.log('\n── SSRF: rejected before any fetch')
  for (const u of [
    'http://maps.app.goo.gl/x', 'https://google.com.evil.com/', 'https://maps.app.goo.gl.evil.com/',
    'https://169.254.169.254/', 'https://localhost/', 'file:///etc/passwd',
    'https://www.google.com@evil.com/', 'https://maps.app.goo.gl:8443/x', 'https://goo.gl/other', 'https://[::1]/',
  ]) {
    const r = await call(u)
    check(`reject ${u}`, r.status === 400 && r.body?.error === 'invalid_url', `status ${r.status} ${JSON.stringify(r.body)}`)
  }

  console.log('\n── rate limit (fresh account, 20 calls allowed per 10 min)')
  const R = await account('ratelimit')
  const rcall = await session(R)
  const statuses = []
  for (let i = 0; i < 22; i++) statuses.push((await rcall('https://google.com.evil.com/')).status)
  check('first 20 calls pass the limiter (400 invalid_url)', statuses.slice(0, 20).every(s => s === 400), statuses.slice(0, 20).join(','))
  check('call 21 and 22 are 429', statuses[20] === 429 && statuses[21] === 429, statuses.slice(20).join(','))
  const other = await call('https://google.com.evil.com/')
  check('limit is per user (other account still 400)', other.status === 400, `status ${other.status}`)
} else {
  console.log('\n── real links')
  for (const u of links) {
    const r = await call(u)
    console.log(`${u}\n  -> ${r.status} ${JSON.stringify(r.body)}`)
  }
}

console.log(`\nThrowaway accounts (not deleted), creds file: ${CREDS_FILE}`)
console.log(readFileSync(CREDS_FILE, 'utf8'))
process.exit(fails ? 1 : 0)
