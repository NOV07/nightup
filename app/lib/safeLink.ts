/**
 * True only for an in-app path: starts with "/", and the second character is not
 * "/" or "\" (which browsers read as a protocol-relative host). Rejects any
 * backslash or control character (tab/newline are stripped by browsers, so
 * "/\t/host" would otherwise slip through), and anything that is not a string,
 * so "javascript:", "data:" and "https://..." never qualify.
 */
export function isSafeInternalPath(link: unknown): link is string {
  if (typeof link !== 'string' || link.length === 0 || link.length > 300) return false
  if (link[0] !== '/') return false
  if (link[1] === '/' || link[1] === '\') return false
  return !/[\u0000-\u001f\u007f\]/.test(link)
}
