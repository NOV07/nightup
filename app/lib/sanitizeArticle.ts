// The magazine page renders article bodies with dangerouslySetInnerHTML, so
// whatever the API stores is what runs in a reader's browser. These helpers are
// the last gate before the database.
//
// Deliberately dependency-free: the allowlist below is small and closed, and
// covers exactly what the novel/TipTap editor can emit. Anything outside it is
// unwrapped (tag dropped, text kept) rather than escaped, so a stray tag never
// turns into visible markup in the article.

/** tag -> attributes that survive. Everything else is stripped, which is what
 *  removes on* handlers and style without needing to enumerate them. */
const ALLOWED_TAGS: Record<string, string[]> = {
  p: [], br: [], hr: [],
  strong: [], b: [], em: [], i: [], u: [], s: [], strike: [],
  h1: [], h2: [], h3: [], h4: [], h5: [], h6: [],
  ul: [], ol: [], li: [],
  blockquote: [], code: [], pre: [],
  a: ['href', 'target', 'rel'],
  img: ['src', 'alt', 'title', 'width', 'height'],
}

/** Dropped along with their contents — unwrapping these would leak script or
 *  style source into the article as text. */
const DANGEROUS = 'script|style|iframe|object|embed|form|svg|math|template|noscript|link|meta|base'

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/** Rejects javascript:/vbscript: and friends, including the control-character
 *  and entity tricks used to hide them. Inline images are allowed only as
 *  data:image, because a half-finished paste upload can leave one behind. */
function isSafeUrl(raw: string, allowInlineImage: boolean): boolean {
  const value = raw
    .replace(/&#(\d+);?/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&#x([0-9a-f]+);?/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(RegExp('[\\u0000-\\u0020]', 'g'), '')
    .toLowerCase()

  if (allowInlineImage && value.startsWith('data:image/')) return true
  if (/^[a-z][a-z0-9+.-]*:/.test(value)) {
    return value.startsWith('http:') || value.startsWith('https:') || value.startsWith('mailto:')
  }
  // Relative, protocol-relative and anchor URLs.
  return true
}

function filterAttributes(tag: string, rawAttrs: string): string {
  const allowed = ALLOWED_TAGS[tag]
  if (!allowed.length) return ''

  const kept: string[] = []
  const attrPattern = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'`=<>]+))/g
  let match: RegExpExecArray | null

  while ((match = attrPattern.exec(rawAttrs)) !== null) {
    const name = match[1].toLowerCase()
    if (!allowed.includes(name)) continue

    const value = match[2] ?? match[3] ?? match[4] ?? ''
    if ((name === 'href' || name === 'src') && !isSafeUrl(value, tag === 'img')) continue
    kept.push(`${name}="${escapeAttr(value)}"`)
  }

  // Anything opened in a new tab must not get a handle on window.opener.
  if (tag === 'a') {
    const target = kept.find(a => a.startsWith('target='))
    if (target && !kept.some(a => a.startsWith('rel='))) kept.push('rel="noopener noreferrer"')
  }

  return kept.length ? ' ' + kept.join(' ') : ''
}

export function sanitizeArticleHtml(input: unknown): string | null {
  if (typeof input !== 'string') return null

  let html = input

  // Whole dangerous elements. Looped because removing an outer match can reveal
  // a nested one (<scr<script>ipt>), and run before comment stripping so a
  // comment cannot be used to split a tag name.
  const paired = new RegExp(`<(${DANGEROUS})\\b[\\s\\S]*?<\\/\\1\\s*>`, 'gi')
  let previous: string
  do { previous = html; html = html.replace(paired, '') } while (html !== previous)

  // Unclosed or self-closed survivors of the same set.
  html = html.replace(new RegExp(`<\\/?(?:${DANGEROUS})\\b[^>]*>`, 'gi'), '')
  html = html.replace(/<!--[\s\S]*?-->/g, '')

  // Everything left: keep allowlisted tags with filtered attributes, unwrap the
  // rest. Non-tag text is untouched, so entities the editor wrote stay intact.
  html = html.replace(/<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b([^>]*?)(\/?)>/g,
    (_full, closing: string, rawName: string, rawAttrs: string) => {
      const tag = rawName.toLowerCase()
      if (!(tag in ALLOWED_TAGS)) return ''
      if (closing) return `</${tag}>`
      return `<${tag}${filterAttributes(tag, rawAttrs)}>`
    })

  return html
}

export type ArticleSource = { title: string; url: string }

/** Sources render as links on the public page, so the URL gets the same scheme
 *  check and the title is reduced to plain text. */
export function sanitizeSources(input: unknown): ArticleSource[] {
  if (!Array.isArray(input)) return []

  return input.reduce<ArticleSource[]>((acc, raw) => {
    if (!raw || typeof raw !== 'object') return acc
    const entry = raw as Record<string, unknown>

    const url = typeof entry.url === 'string' ? entry.url.trim() : ''
    const title = typeof entry.title === 'string' ? entry.title : ''
    if (!url && !title) return acc

    // Links must be absolute and http(s): a source is by definition external.
    const safe = /^https?:\/\//i.test(url) && isSafeUrl(url, false)

    acc.push({
      title: title.replace(/<[^>]*>/g, '').trim().slice(0, 300),
      url: safe ? url.slice(0, 2000) : '',
    })
    return acc
  }, []).slice(0, 100)
}
