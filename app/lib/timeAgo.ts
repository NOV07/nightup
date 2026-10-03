import type { Lang } from './translations'

/**
 * Relative time for a timestamp, in the viewer's language.
 * - `long`:  "2 hours ago" / "πριν 2 ώρες", "yesterday", then a short date after a week
 * - `short`: "2h ago" / "2ω πριν", days up to a month, then a short date
 */
export function timeAgo(dateStr: string, lang: Lang, style: 'long' | 'short' = 'long'): string {
  const d = new Date(dateStr)
  const mins  = Math.floor((Date.now() - d.getTime()) / 60000)
  const hours = Math.floor(mins / 60)
  const days  = Math.floor(hours / 24)
  const en = lang === 'en'
  const date = () => d.toLocaleDateString(en ? 'en-GB' : 'el-GR', { day: 'numeric', month: 'short' })

  if (mins < 1) return en ? 'just now' : 'μόλις τώρα'

  if (style === 'short') {
    if (mins < 60)  return en ? `${mins}m ago` : `${mins}λ πριν`
    if (hours < 24) return en ? `${hours}h ago` : `${hours}ω πριν`
    if (days < 30)  return en ? `${days}d ago` : `${days}μ πριν`
    return date()
  }

  if (mins < 60) {
    return en ? `${mins} min ago` : `πριν ${mins} ${mins === 1 ? 'λεπτό' : 'λεπτά'}`
  }
  if (hours < 24) {
    return en
      ? `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`
      : `πριν ${hours} ${hours === 1 ? 'ώρα' : 'ώρες'}`
  }
  if (days === 1) return en ? 'yesterday' : 'χθες'
  if (days < 7)   return en ? `${days} days ago` : `πριν ${days} μέρες`
  return date()
}
