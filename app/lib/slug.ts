// Greek-aware slug generation.
//
// The slugify in app/api/articles/route.ts only transliterates vowels, so a
// mostly-Greek name collapses to punctuation ("Κήπος" -> "-p-s"). Spot names
// are routinely Greek and the slug is the public URL, so this maps the whole
// alphabet including digraphs and final sigma.

const GREEK: Record<string, string> = {
  α: 'a', ά: 'a', β: 'v', γ: 'g', δ: 'd', ε: 'e', έ: 'e', ζ: 'z',
  η: 'i', ή: 'i', θ: 'th', ι: 'i', ί: 'i', ϊ: 'i', ΐ: 'i', κ: 'k',
  λ: 'l', μ: 'm', ν: 'n', ξ: 'x', ο: 'o', ό: 'o', π: 'p', ρ: 'r',
  σ: 's', ς: 's', τ: 't', υ: 'y', ύ: 'y', ϋ: 'y', ΰ: 'y', φ: 'f',
  χ: 'ch', ψ: 'ps', ω: 'o', ώ: 'o',
}

// Applied before the per-letter pass, where Greek pairs make one Latin sound.
const DIGRAPHS: [RegExp, string][] = [
  [/ου/g, 'ou'], [/αυ/g, 'af'], [/ευ/g, 'ef'],
  [/ντ/g, 'nt'], [/μπ/g, 'b'], [/γκ/g, 'gk'], [/τσ/g, 'ts'], [/τζ/g, 'tz'],
]

export function slugify(input: string): string {
  let s = (input || '').toLowerCase().normalize('NFC')
  for (const [re, to] of DIGRAPHS) s = s.replace(re, to)
  s = s.replace(/[Ͱ-Ͽἀ-῿]/g, ch => GREEK[ch] ?? '')
  // Strip accents left on Latin characters (é -> e) before the final filter.
  s = s.normalize('NFD').replace(/[̀-ͯ]/g, '')
  return s.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

/**
 * Appends -2, -3 … until the slug is free. `taken` is the set of slugs already
 * in the table; the caller fetches it so this stays synchronous and testable.
 */
export function uniqueSlug(base: string, taken: Set<string>): string {
  const root = base || 'spot'
  if (!taken.has(root)) return root
  let n = 2
  while (taken.has(`${root}-${n}`)) n++
  return `${root}-${n}`
}
