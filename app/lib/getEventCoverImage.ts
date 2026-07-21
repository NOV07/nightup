export function getEventCoverImage(event: { image_url?: string | null; has_copyright_restriction?: boolean | null }): string {
  if (event.has_copyright_restriction || !event.image_url) {
    return '/images/nightup-event-fallback.png'
  }
  return event.image_url
}
