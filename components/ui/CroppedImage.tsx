import Image from 'next/image'
import type { CSSProperties, SyntheticEvent } from 'react'

/** Crop box as fractions (0-1) of the original image, matching the crop_x/y/width/height DB columns. */
export interface CropBox {
  crop_x: number
  crop_y: number
  crop_width: number
  crop_height: number
}

interface CroppedImageProps {
  src: string
  alt: string
  crop?: CropBox | null
  className?: string
  style?: CSSProperties
  sizes?: string
  priority?: boolean
  /** Only applies to the uncropped next/image and data-uri <img> branches — the
   *  background-image crop branch has no equivalent load-error event to hook. */
  onError?: (e: SyntheticEvent<HTMLImageElement, Event>) => void
}

/**
 * Drop-in replacement for `<Image fill .../>` inside a `position: relative` wrapper.
 * With no crop, renders next/image with the site's usual object-fit: cover (zero
 * behavior change for existing images). With a crop, renders a background-image
 * div instead: object-fit/object-position can only pan a "cover"-fit image and
 * can't reproduce an arbitrary zoomed-in crop rectangle, so background-size /
 * background-position (computed from the crop box) is used instead. That does
 * mean cropped images skip next/image's automatic optimization — a deliberate
 * trade-off for correctly reproducing the stored crop.
 *
 * `data:` URIs (base64 photos uploaded through the admin panel without going
 * through Storage) bypass next/image entirely and fall back to a plain `<img>`,
 * matching what every call site already did individually before this existed.
 */
export default function CroppedImage({ src, alt, crop, className, style, sizes, priority, onError }: CroppedImageProps) {
  const isDataUri = src.startsWith('data:')

  if (!crop) {
    if (isDataUri) {
      return (
        <img
          src={src}
          alt={alt}
          className={className}
          onError={onError}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', ...style }}
        />
      )
    }
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className={className}
        onError={onError}
        style={{ objectFit: 'cover', ...style }}
      />
    )
  }

  const { crop_x, crop_y, crop_width, crop_height } = crop
  const bgSizeX = crop_width > 0 ? 100 / crop_width : 100
  const bgSizeY = crop_height > 0 ? 100 / crop_height : 100
  const bgPosX = crop_width < 1 ? (crop_x / (1 - crop_width)) * 100 : 0
  const bgPosY = crop_height < 1 ? (crop_y / (1 - crop_height)) * 100 : 0

  return (
    <div
      role="img"
      aria-label={alt}
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `url(${src})`,
        backgroundSize: `${bgSizeX}% ${bgSizeY}%`,
        backgroundPosition: `${bgPosX}% ${bgPosY}%`,
        backgroundRepeat: 'no-repeat',
        ...style,
      }}
    />
  )
}
