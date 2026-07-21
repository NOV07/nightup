import type { CropBox } from '../../components/ui/CroppedImage'

export function getAvatarCrop(profile: {
  avatar_url?: string | null
  avatar_crop_x?: number | null
  avatar_crop_y?: number | null
  avatar_crop_width?: number | null
  avatar_crop_height?: number | null
}): CropBox | null {
  if (!profile.avatar_url) return null
  if (profile.avatar_crop_x == null || profile.avatar_crop_y == null || profile.avatar_crop_width == null || profile.avatar_crop_height == null) return null
  return { crop_x: profile.avatar_crop_x, crop_y: profile.avatar_crop_y, crop_width: profile.avatar_crop_width, crop_height: profile.avatar_crop_height }
}

export function getCoverCrop(profile: {
  cover_url?: string | null
  cover_crop_x?: number | null
  cover_crop_y?: number | null
  cover_crop_width?: number | null
  cover_crop_height?: number | null
}): CropBox | null {
  if (!profile.cover_url) return null
  if (profile.cover_crop_x == null || profile.cover_crop_y == null || profile.cover_crop_width == null || profile.cover_crop_height == null) return null
  return { crop_x: profile.cover_crop_x, crop_y: profile.cover_crop_y, crop_width: profile.cover_crop_width, crop_height: profile.cover_crop_height }
}
