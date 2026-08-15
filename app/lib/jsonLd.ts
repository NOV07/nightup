/**
 * Safe to drop into `<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ... }} />`.
 * Plain `JSON.stringify` does not escape `<`, so a string field containing
 * `</script>` (an event title, description, etc. — user-submitted, not
 * necessarily reviewed for markup) closes the script tag early and lets
 * whatever follows run as real HTML/script. The escaped form is semantically
 * invisible to JSON parsers but makes that breakout impossible.
 */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}
