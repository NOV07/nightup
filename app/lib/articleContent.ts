// Article bodies are stored as HTML (the editor serialises TipTap to HTML on
// save), so word counts have to look through the markup.
export function countWords(html: unknown) {
  if (typeof html !== 'string') return 0
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length
}

/** True when Postgres/PostgREST rejected a write because `sources` is not in
 *  the schema yet. 20260814010000_article_sources.sql is applied by hand, and
 *  until it is, saving an article must not fail over a citation list — both
 *  article routes retry without the column when this matches. */
export function isMissingSourcesColumn(
  error: { code?: string; message?: string } | null
): boolean {
  if (!error) return false
  return (error.code === '42703' || error.code === 'PGRST204')
    && /sources/i.test(error.message || '')
}
