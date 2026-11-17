#!/usr/bin/env node
/**
 * Tests that an approved artist shows up in /network/artists without picking a
 * role, using the REAL approval logic (buildApprovalUpdate, shared with
 * app/api/admin/approve-upgrade/route.ts).
 *
 *   node scripts/test-artist-network.mjs
 *
 * Part 1 (offline): buildApprovalUpdate for every requestable type. A professional,
 *   venue, organizer or spot never gets network_tab from it.
 * Part 2 (database; skipped, and reported as skipped, without Supabase env in
 *   .env.local): creates a throwaway user + profile, applies the update, runs the
 *   same query as app/network/artists/page.tsx and checks the artist is listed
 *   with no role, then deletes it (in `finally`).
 *
 * Safety: the only rows ever written or deleted are the throwaway auth user
 * dkantanoleon+nettest-<timestamp>@gmail.com and its own profile. No existing
 * account is read-modified.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomBytes } from 'node:crypto'
import { buildApprovalUpdate } from '../app/lib/approvalUpdate.ts'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
let passed = 0, failed = 0, skipped = 0
async function test(name, fn) {
  try { await fn(); passed++; console.log(`  ok   ${name}`) }
  catch (e) { failed++; console.log(`  FAIL ${name}\n       ${e.message}`) }
}

console.log('buildApprovalUpdate')
await test('artist gets network_tab Artists, creator plan and profile_type', () => {
  assert.deepEqual(buildApprovalUpdate('artist', 'DJ'), { plan_tier: 'creator', profile_type: 'artist', network_tab: 'Artists' })
})
await test('artist without a specialty still gets network_tab', () => {
  assert.equal(buildApprovalUpdate('artist', null).network_tab, 'Artists')
})
await test('artist never gets a role (network_subcategory/category) from approval', () => {
  const u = buildApprovalUpdate('artist', 'Artist - DJ')
  assert.ok(!('network_subcategory' in u) && !('network_category' in u))
})
await test('professional does not get network_tab', () => {
  const u = buildApprovalUpdate('professional', 'Professional - Catering')
  assert.ok(!('network_tab' in u))
  assert.equal(u.profile_type, 'professional')
  assert.equal(u.network_category, 'Catering')
})
await test('professional with an unknown specialty: no network_tab, no category', () => {
  const u = buildApprovalUpdate('professional', 'whatever')
  assert.ok(!('network_tab' in u) && !('network_category' in u))
})
for (const type of ['venue', 'organizer', 'spot']) {
  await test(`${type} does not get network_tab`, () => {
    const u = buildApprovalUpdate(type, '')
    assert.ok(!('network_tab' in u))
    assert.deepEqual(u, { plan_tier: 'creator', profile_type: type })
  })
}
await test('missing requested_type: plan_tier only (admin sets type by hand)', () => {
  assert.deepEqual(buildApprovalUpdate(null, 'x'), { plan_tier: 'creator' })
  assert.deepEqual(buildApprovalUpdate(undefined, 'x'), { plan_tier: 'creator' })
})

console.log('database: throwaway artist through approval -> /network/artists')
function loadEnv() {
  const env = {}
  try {
    for (const line of readFileSync(resolve(ROOT, '.env.local'), 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  } catch { /* fall back to process.env */ }
  return { ...env, ...process.env }
}
const env = loadEnv()
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY, SERVICE = env.SUPABASE_SERVICE_ROLE_KEY

if (!URL_ || !SERVICE) {
  skipped++
  console.log('  skip no NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local')
} else {
  const { createClient } = await import('@supabase/supabase-js')
  const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } })
  const reader = ANON ? createClient(URL_, ANON, { auth: { persistSession: false } }) : admin
  const TS = Date.now()
  const email = `dkantanoleon+nettest-${TS}@gmail.com`
  const username = `nettest${TS}`
  let id = null
  try {
    const { data, error } = await admin.auth.admin.createUser({ email, password: randomBytes(18).toString('base64url'), email_confirm: true })
    if (error) throw new Error(`createUser: ${error.message}`)
    id = data.user.id
    // Same shape /api/profiles inserts: a plain 'user' with no network columns.
    const ins = await admin.from('profiles').insert({ id, username, display_name: 'Net Test', profile_type: 'user' })
    if (ins.error) throw new Error(`insert profile: ${ins.error.message}`)

    // The exact query app/network/artists/page.tsx runs, for this one profile.
    const listed = async () => {
      const { data, error } = await reader.from('profiles').select('id, network_tab, network_subcategory').eq('network_tab', 'Artists').eq('id', id)
      if (error) throw new Error(error.message)
      return data.length === 1
    }

    await test('before approval the user is not listed', async () => assert.equal(await listed(), false))

    const upd = await admin.from('profiles').update(buildApprovalUpdate('artist', null)).eq('id', id)
    if (upd.error) throw new Error(`approval update: ${upd.error.message}`)

    await test('after approval the artist is listed with no role chosen', async () => {
      assert.equal(await listed(), true)
      const { data } = await admin.from('profiles').select('network_tab, network_subcategory, network_category, profile_type').eq('id', id).single()
      assert.equal(data.network_tab, 'Artists')
      assert.equal(data.profile_type, 'artist')
      assert.equal(data.network_subcategory, null)
    })
  } catch (e) {
    failed++
    console.log(`  FAIL setup: ${e.message}`)
  } finally {
    if (id) {
      await admin.from('profiles').delete().eq('id', id)
      await admin.auth.admin.deleteUser(id)
      const { data } = await admin.from('profiles').select('id').eq('id', id)
      console.log(data?.length ? `  WARN throwaway profile ${id} still exists` : '  cleaned up throwaway account')
    }
  }
}

console.log(`\n${passed} passed, ${failed} failed, ${skipped} skipped`)
process.exit(failed ? 1 : 0)
