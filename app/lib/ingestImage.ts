import { getSupabaseAdmin } from './supabase'
import {
  IMAGE_BUCKET,
  classifyImageUrl,
  fetchRemoteImage,
  publicStorageUrl,
  storageKeyFor,
} from './ingestImageRules'

export interface IngestOutcome {
  /** What to store in the row: our Storage URL on success, otherwise the input
   *  untouched. */
  url: string | null
  ingested: boolean
  /** Why nothing was ingested. Absent when `ingested` is true. */
  reason?: string
}

/**
 * Downloads an externally hosted image and re-uploads it to our own Storage
 * bucket, returning the URL the row should keep.
 *
 * Never throws, and never returns null for an input that had a URL: a poster
 * host being down must not turn an admin save into a failure. On any problem the
 * original URL is handed back unchanged, which still renders on the site (the
 * next/image config accepts every https host) and can be retried later with
 * `scripts/fix-external-images.mjs`.
 */
export async function ingestExternalImage(
  rawUrl: string | null | undefined,
  bucket: string = IMAGE_BUCKET,
): Promise<IngestOutcome> {
  const original = rawUrl?.trim() || null

  const verdict = classifyImageUrl(original)
  if (!verdict.ingest) return { url: original, ingested: false, reason: verdict.reason }

  const source = original as string
  const fetched = await fetchRemoteImage(source)
  if (!fetched.ok) {
    console.warn(`[ingestImage] leaving external URL in place (${fetched.error}): ${source}`)
    return { url: source, ingested: false, reason: fetched.error }
  }

  const key = storageKeyFor(source, fetched.ext)
  const { error } = await getSupabaseAdmin()
    .storage.from(bucket)
    .upload(key, fetched.bytes, {
      contentType: fetched.contentType,
      cacheControl: '31536000',
      upsert: false,
    })

  if (error) {
    console.warn(`[ingestImage] upload failed (${error.message}): ${source}`)
    return { url: source, ingested: false, reason: `upload failed: ${error.message}` }
  }

  return { url: publicStorageUrl(bucket, key), ingested: true }
}

/**
 * Applies `ingestExternalImage` to the `image_url` of an events row about to be
 * written, and returns the row to actually write.
 *
 * A row flagged `has_copyright_restriction` is left alone: that flag means the
 * photo is not ours to show, and re-hosting a copy of it on our own domain would
 * make that worse rather than better. The site does not render those images
 * either way (see `getEventCoverImage`).
 */
export async function withIngestedEventImage<T extends Record<string, unknown>>(
  row: T,
  copyrightRestricted: boolean,
): Promise<{ row: T; warning?: string }> {
  const current = row.image_url
  if (typeof current !== 'string' || !current.trim()) return { row }
  if (copyrightRestricted) return { row }

  const outcome = await ingestExternalImage(current)
  if (!outcome.ingested) {
    // Only a genuine ingest attempt that failed is worth surfacing; "already
    // ours" and friends are the normal case.
    const noise = ['already-ours', 'data-uri', 'relative-path', 'empty']
    return { row, warning: outcome.reason && !noise.includes(outcome.reason) ? outcome.reason : undefined }
  }
  return { row: { ...row, image_url: outcome.url } }
}
