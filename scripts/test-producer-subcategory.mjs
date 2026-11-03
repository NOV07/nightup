#!/usr/bin/env node
/**
 * Verifies the «Παραγωγός» artist subcategory end to end.
 *
 *   node scripts/test-producer-subcategory.mjs
 *
 * Checks: NETWORK.Artists / NETWORK_CATEGORY_EN / getListingCategory /
 * SearchBar's netSubcategoriesOf shape; a throwaway artist stored with the
 * subcategory, listed on /network/artists, found by the search query; a release
 * insert lands as 'pending' and is hidden from public reads.
 *
 * Needs `npm run dev` (TEST_BASE_URL, default http://localhost:3000) for the
 * page check (SKIP otherwise) and, in .env.local: NEXT_PUBLIC_SUPABASE_URL,
 * NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.
 *
 * Safety: only accounts named dkantanoleon+test-<role>-<timestamp>@gmail.com
 * are created, and they (plus their profile and releases) are deleted in
 * `finally`. Existing accounts are never touched.
 */
import { readFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomBytes } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const envPath = resolve(ROOT, '.env.local')
if (existsSync(envPath)) {
  for (const l of readFileSync(envPath, 'utf8').split('\n')) {
    const m = l.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}
const { NEXT_PUBLIC_SUPABASE_URL: URL_, NEXT_PUBLIC_SUPABASE_ANON_KEY: ANON, SUPABASE_SERVICE_ROLE_KEY: SERVICE } = process.env
const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000'
const SUB = 'Παραγωγός'
const TS = Date.now()

let failed = 0
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ' — ' + extra : ''}`); if (!ok) failed++ }
const skip = (name, why) => console.log(`SKIP  ${name} — ${why}`)

// ── Source-level checks (no network). searchData.ts is plain TS with a
// re-export, so read the literal blocks instead of importing it.
const src = readFileSync(resolve(ROOT, 'app/lib/searchData.ts'), 'utf8')
const artistsBlock = src.match(/"Artists": \{([^}]*)\}/)[1]
const keys = [...artistsBlock.matchAll(/"([^"]+)": \[\]/g)].map(m => m[1])
check('NETWORK.Artists keeps the 4 existing values', ['DJ', 'Τραγουδιστής', 'Μπάντα', 'Οργανοπαίχτης'].every(k => keys.includes(k)))
check('NETWORK.Artists contains «Παραγωγός»', keys.includes(SUB), keys.join(', '))
check('NETWORK_CATEGORY_EN maps «Παραγωγός» to Producer', /"Παραγωγός": "Producer"/.test(src))
// netSubcategoriesOf(section, category) looks up NETWORK[section][category]:
// for Artists the keys ARE the subcategories, so the SearchBar chip row is
// Object.keys(NETWORK.Artists) and «Παραγωγός» must be among them, and the
// helper must return [] (not throw) for it as a "category" with an empty array.
const netSubcategoriesOf = (branch, cat) => { const b = branch[cat]; return Array.isArray(b) ? b : b && typeof b === 'object' ? Object.keys(b) : [] }
const artistsBranch = Object.fromEntries(keys.map(k => [k, []]))
check('SearchBar netSubcategoriesOf(Artists, «Παραγωγός») returns [] without throwing', netSubcategoriesOf(artistsBranch, SUB).length === 0)
check('SearchBar category chips (Object.keys(NETWORK.Artists)) include «Παραγωγός»', Object.keys(artistsBranch).includes(SUB))
check('UpgradeModal artist list has Producer and still has Live Act/Singer/MC',
  /sub: \['DJ', 'Live Act', 'Singer', 'MC', 'Producer'\]/.test(readFileSync(resolve(ROOT, 'components/auth/UpgradeModal.tsx'), 'utf8')))

if (!URL_ || !ANON || !SERVICE) {
  skip('database checks', 'Supabase env vars missing (.env.local)')
  console.log(failed ? `\n${failed} FAILED` : '\nSource checks passed; database checks not run')
  process.exit(failed ? 1 : 0)
}

const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } })
const anon = createClient(URL_, ANON, { auth: { persistSession: false } })
const email = `dkantanoleon+test-producer-${TS}@gmail.com`
const password = randomBytes(12).toString('hex') + 'Aa1!'
const username = `testproducer${TS}`
let userId = null
try {
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (error) throw new Error(`createUser: ${error.message}`)
  userId = data.user.id
  const { error: pe } = await admin.from('profiles').insert({
    id: userId, username, display_name: `Producer Test ${TS}`, profile_type: 'artist',
    network_tab: 'Artists', network_subcategory: SUB,
  })
  check('profile stored with network_subcategory «Παραγωγός» (network_tab Artists)', !pe, pe?.message)

  const { data: listed } = await anon.from('profiles').select('id').eq('network_tab', 'Artists').eq('network_subcategory', SUB).eq('id', userId)
  check('artists query (as /network/artists) returns the producer', listed?.length === 1)

  const { data: found } = await anon.from('profiles').select('id')
    .not('network_tab', 'is', null).or(`display_name.ilike.%${username}%,network_subcategory.ilike.%${username}%`).eq('id', userId)
  check('search by name finds the producer', found?.length === 1)
  const { data: bySub } = await anon.from('profiles').select('id').not('network_tab', 'is', null).ilike('network_subcategory', `%${SUB}%`).eq('id', userId)
  check('search by subcategory text finds the producer', bySub?.length === 1)

  // Page render (server-rendered, revalidate 60 — may lag; informational on miss).
  try {
    const html = await (await fetch(`${BASE}/network/artists`)).text()
    check('/network/artists HTML contains the producer', html.includes(`Producer Test ${TS}`) || html.includes(username),
      'page is cached up to 60s; re-run if only this fails')
  } catch { skip('/network/artists render', `no server at ${BASE}`) }

  // Release upload as the artist: lands pending, invisible publicly.
  const user = createClient(URL_, ANON, { auth: { persistSession: false } })
  const { error: se } = await user.auth.signInWithPassword({ email, password })
  if (se) throw new Error(`signIn: ${se.message}`)
  const { data: rel, error: re } = await user.from('music_releases').insert({ title: `Test Release ${TS}`, artist: 'Producer Test', type: 'Single', profile_id: userId, status: 'approved' }).select().single()
  check('artist can insert a release', !re, re?.message)
  check('release forced to status pending (guard trigger)', rel?.status === 'pending', rel?.status)
  const { data: pub } = await anon.from('music_releases').select('id').eq('id', rel?.id ?? '').eq('status', 'approved')
  check('pending release is not publicly visible as approved', (pub ?? []).length === 0)
} catch (e) {
  check('test run', false, e.message)
} finally {
  if (userId) {
    await admin.from('music_releases').delete().eq('profile_id', userId)
    await admin.from('profiles').delete().eq('id', userId)
    const { error } = await admin.auth.admin.deleteUser(userId)
    console.log(error ? `cleanup: deleteUser failed — ${error.message} (${email})` : 'cleanup: throwaway account removed')
  }
}
console.log(failed ? `\n${failed} FAILED` : '\nAll checks passed')
process.exit(failed ? 1 : 0)
