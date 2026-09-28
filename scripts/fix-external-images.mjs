#!/usr/bin/env node
/**
 * Pulls event covers that still point at someone else's server into our own
 * Supabase Storage bucket, and rewrites `events.image_url` to the Storage URL.
 *
 * Dry run by default — nothing is written without `--apply`.
 *
 *   node scripts/fix-external-images.mjs                      # report only
 *   node scripts/fix-external-images.mjs --apply               # ingest the unflagged ones
 *   node scripts/fix-external-images.mjs --ids=a,b --unflag    # dry-run those two, flag lifted
 *   node scripts/fix-external-images.mjs --ids=a,b --unflag --apply
 *
 * Flags:
 *   --apply          actually upload and write to the database
 *   --ids=<a,b,c>    restrict to these event ids
 *   --unflag         treat the listed ids as no longer copyright-restricted:
 *                    ingest them and clear has_copyright_restriction.
 *                    Requires --ids, so lifting the flag is always a per-event
 *                    decision rather than a blanket one.
 *
 * Events whose has_copyright_restriction is set are skipped unless --unflag
 * names them: that flag means the photo is not ours to show, and re-hosting a
 * copy on our own domain would make that worse rather than better.
 *
 * Events with no image_url at all are ignored entirely — there is nothing to
 * download for them.
 *
 * Classification, download validation and Storage key naming come from
 * app/lib/ingestImageRules.ts, the same module the admin write path uses, so the
 * two can never disagree about what counts as an external URL.
 */

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// ── args ────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const APPLY = args.includes('--apply')
const UNFLAG = args.includes('--unflag')
const idsArg = args.find((a) => a.startsWith('--ids='))
const ONLY_IDS = idsArg
  ? idsArg.slice('--ids='.length).split(',').map((s) => s.trim()).filter(Boolean)
  : null

const unknown = args.filter((a) => a !== '--apply' && a !== '--unflag' && !a.startsWith('--ids='))
if (unknown.length) {
  console.error(`Unknown argument(s): ${unknown.join(', ')}`)
  process.exit(1)
}
if (UNFLAG && !ONLY_IDS) {
  console.error('--unflag requires --ids=<id,id>. Lifting the copyright flag is a per-event decision.')
  process.exit(1)
}

// ── env ─────────────────────────────────────────────────────────────────────
// Loaded into process.env before the rules module is imported, since it reads
// NEXT_PUBLIC_SUPABASE_URL to decide which host counts as ours.
function loadEnv() {
  let raw
  try {
    raw = readFileSync(resolve(ROOT, '.env.local'), 'utf8')
  } catch {
    console.error('Could not read .env.local at the repo root.')
    process.exit(1)
  }
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = value
  }
}
loadEnv()

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/$/, '')
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must both be set in .env.local.')
  process.exit(1)
}

const { IMAGE_BUCKET, classifyImageUrl, fetchRemoteImage, publicStorageUrl, storageKeyFor } =
  await import('../app/lib/ingestImageRules.ts')

// ── supabase over plain HTTP (no SDK needed for three calls) ────────────────
const authHeaders = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }

async function fetchEvents() {
  const params = new URLSearchParams({
    select: 'id,title,venue,date,status,image_url,has_copyright_restriction',
    image_url: 'not.is.null',
    order: 'date.desc',
  })
  const res = await fetch(`${SUPABASE_URL}/rest/v1/events?${params}`, { headers: authHeaders })
  if (!res.ok) throw new Error(`events query failed: HTTP ${res.status} ${await res.text()}`)
  return res.json()
}

async function uploadToStorage(key, bytes, contentType) {
  const path = key.split('/').map(encodeURIComponent).join('/')
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${IMAGE_BUCKET}/${path}`, {
    method: 'POST',
    headers: {
      ...authHeaders,
      'Content-Type': contentType,
      'Cache-Control': 'max-age=31536000',
      'x-upsert': 'false',
    },
    body: bytes,
  })
  if (!res.ok) throw new Error(`upload failed: HTTP ${res.status} ${await res.text()}`)
}

async function patchEvent(id, patch) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/events?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { ...authHeaders, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(patch),
  })
  if (!res.ok) throw new Error(`row update failed: HTTP ${res.status} ${await res.text()}`)
}

// ── run ─────────────────────────────────────────────────────────────────────
const label = (e) => `${(e.title ?? '(untitled)').slice(0, 44)} [${e.id}]`

const all = await fetchEvents()
const external = all.filter((e) => classifyImageUrl(e.image_url).ingest)

console.log(`\nMode: ${APPLY ? 'APPLY — writes to the database' : 'DRY RUN — nothing will be written'}`)
console.log(`Bucket: ${IMAGE_BUCKET}   Storage host: ${new URL(SUPABASE_URL).host}`)
console.log(`Events with an image_url: ${all.length}   of those external: ${external.length}`)

// A full uuid or any unique prefix of one is accepted, so a shortened id copied
// out of a report still resolves. An ambiguous prefix is a hard error rather
// than a guess, since the wrong guess would re-host the wrong poster.
let resolvedIds = null
if (ONLY_IDS) {
  resolvedIds = []
  const missing = []
  for (const token of ONLY_IDS) {
    const hits = external.filter((e) => e.id === token || e.id.startsWith(token))
    if (hits.length === 0) {
      missing.push(token)
      continue
    }
    if (hits.length > 1) {
      console.error(`\nAmbiguous id "${token}" matches ${hits.length} events:`)
      for (const h of hits) console.error(`  ${h.id}  ${h.title}`)
      console.error('Pass more of the id.')
      process.exit(1)
    }
    resolvedIds.push(hits[0].id)
  }
  if (missing.length) {
    console.log(`\nNote: ${missing.length} requested id(s) match no external-image event, ignoring:`)
    for (const id of missing) console.log(`  - ${id}`)
  }
}

const candidates = resolvedIds ? external.filter((e) => resolvedIds.includes(e.id)) : external
const unflagging = new Set(UNFLAG ? resolvedIds : [])

console.log(`\n${'─'.repeat(78)}`)

let ingested = 0
let skipped = 0
let failed = 0

for (const e of candidates) {
  const restricted = !!e.has_copyright_restriction
  const lifting = unflagging.has(e.id)

  if (restricted && !lifting) {
    console.log(`SKIP     ${label(e)}`)
    console.log(`         has_copyright_restriction is set. Re-run with --ids=${e.id} --unflag to lift it.`)
    skipped++
    continue
  }

  const src = e.image_url.trim()
  const flagNote = lifting && restricted ? ' (+ clearing copyright flag)' : ''

  if (!APPLY) {
    console.log(`WOULD    ${label(e)}${flagNote}`)
    console.log(`         from ${src}`)
    ingested++
    continue
  }

  try {
    const got = await fetchRemoteImage(src)
    if (!got.ok) {
      console.log(`FAIL     ${label(e)}`)
      console.log(`         ${got.error}`)
      console.log(`         from ${src}`)
      failed++
      continue
    }

    const key = storageKeyFor(src, got.ext)
    await uploadToStorage(key, got.bytes, got.contentType)
    const newUrl = publicStorageUrl(IMAGE_BUCKET, key)

    const patch = { image_url: newUrl }
    if (lifting) patch.has_copyright_restriction = false
    await patchEvent(e.id, patch)

    const kb = (got.bytes.length / 1024).toFixed(0)
    console.log(`OK       ${label(e)}${flagNote}`)
    console.log(`         ${kb}KB ${got.contentType} -> ${key}`)
    ingested++
  } catch (err) {
    console.log(`FAIL     ${label(e)}`)
    console.log(`         ${err instanceof Error ? err.message : String(err)}`)
    console.log(`         from ${src}`)
    failed++
  }
}

if (!candidates.length) console.log('Nothing to do for the selected events.')

console.log(`${'─'.repeat(78)}`)
console.log(
  APPLY
    ? `Done. ingested=${ingested} skipped=${skipped} failed=${failed}`
    : `Dry run. would-ingest=${ingested} would-skip=${skipped}\nRe-run with --apply to write.`,
)

if (!APPLY && skipped > 0) {
  console.log(
    '\nThe skipped events are the copyright-flagged ones. Pick the ones whose poster you are\n' +
      'entitled to re-host and pass them explicitly, for example:\n' +
      `  node scripts/fix-external-images.mjs --ids=${candidates.filter((e) => e.has_copyright_restriction).slice(0, 2).map((e) => e.id).join(',')} --unflag --apply`,
  )
}

console.log()
