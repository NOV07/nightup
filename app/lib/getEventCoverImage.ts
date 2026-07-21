import type { CropBox } from '../../components/ui/CroppedImage'

export function getEventCoverImage(event: { image_url?: string | null; has_copyright_restriction?: boolean | null }): string {
  if (event.has_copyright_restriction || !event.image_url) {
    return '/images/nightup-event-fallback.png'
  }
  return event.image_url
}

/** Null whenever getEventCoverImage() would return the generic fallback — a
 *  crop stored against the original photo doesn't apply to that fallback image. */
export function getEventCrop(event: {
  image_url?: string | null
  has_copyright_restriction?: boolean | null
  crop_x?: number | null
  crop_y?: number | null
  crop_width?: number | null
  crop_height?: number | null
}): CropBox | null {
  if (event.has_copyright_restriction || !event.image_url) return null
  if (event.crop_x == null || event.crop_y == null || event.crop_width == null || event.crop_height == null) return null
  return { crop_x: event.crop_x, crop_y: event.crop_y, crop_width: event.crop_width, crop_height: event.crop_height }
}
