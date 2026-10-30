// Next hands dynamic path params to the page still percent-encoded
// ("me:true" arrives as "me%3Atrue"), so usernames are decoded on the way in
// and encoded when a link is built.

export function decodeUsername(raw: string): string {
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}

export function profileHref(username: string): string {
  return `/profile/${encodeURIComponent(username)}`
}
