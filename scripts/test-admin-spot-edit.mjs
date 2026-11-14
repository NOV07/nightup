#!/usr/bin/env node
/**
 * Route-level check for POST /api/events/upload against a running dev server:
 * the admin_auth cookie alone is accepted (returns a url under admin/), and a
 * request with no credentials gets 401. Type and size rules still apply.
 *
 *   npm run dev                                  # other terminal
 *   node scripts/test-admin-spot-edit.mjs
 *
 * Needs ADMIN_PASSWORD (from .env.local or the environment). Uploads one 1x1 PNG
 * to the `events` bucket under admin/.
 */
import { readFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import crypto from 'node:crypto'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const envFile = resolve(ROOT, '.env.local')
const fileEnv = existsSync(envFile) ? Object.fromEntries(readFileSync(envFile, 'utf8').split(/\r?\n/).flatMap(l => {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
  return m ? [[m[1], m[2].replace(/^["']|["']$/g, '')]] : []
})) : {}
const env = { ...fileEnv, ...process.env }
const BASE = (env.TEST_BASE_URL || 'http://localhost:3000').replace(/\/$/, '')
if (!env.ADMIN_PASSWORD) { console.error('Missing ADMIN_PASSWORD'); process.exit(1) }

// Same format as app/lib/adminAuth.ts signAdminToken
const payload = String(Date.now())
const token = `${payload}.${crypto.createHmac('sha256', env.ADMIN_PASSWORD).update(payload).digest('hex')}`

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64')
const body = (type = 'image/png', data = PNG, name = 'poster.png') => {
  const fd = new FormData()
  fd.append('file', new File([data], name, { type }))
  return fd
}
const post = (fd, cookie) => fetch(`${BASE}/api/events/upload`, { method: 'POST', body: fd, headers: cookie ? { cookie } : {} })

let fails = 0
const check = (name, ok, detail = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`) }

let r = await post(body(), `admin_auth=${token}`)
let j = await r.json().catch(() => ({}))
check('admin cookie: upload returns a url', r.status === 200 && typeof j.url === 'string', `status ${r.status}`)
check('admin cookie: path uses "admin"', typeof j.url === 'string' && j.url.includes('/admin/'))

r = await post(body())
check('no credentials: 401', r.status === 401, `status ${r.status}`)

r = await post(body(), `admin_auth=${payload}.${'0'.repeat(64)}`)
check('forged admin cookie: 401', r.status === 401, `status ${r.status}`)

r = await post(body('application/pdf', Buffer.from('%PDF'), 'a.pdf'), `admin_auth=${token}`)
check('admin cookie: non-image still rejected (400)', r.status === 400, `status ${r.status}`)

console.log(fails ? `\n${fails} FAILED` : '\nall passed')
process.exit(fails ? 1 : 0)
