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
