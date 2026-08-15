/**
 * Downscales an oversized photo client-side before it goes to Supabase
 * Storage. A phone camera routinely produces 3000-4000px, multi-MB JPEGs for
 * what ends up rendered as a ~300px avatar or a card thumbnail — crop boxes
 * are stored as fractions (0-1) of the image, so shrinking the source here
 * doesn't affect crop math anywhere downstream.
 *
 * Only touches images above `maxDimension` on their long edge; anything
 * already reasonably sized is returned untouched (no pointless re-encode
 * latency on every upload). Falls back to the original file on any failure
 * (unsupported format, decode error, etc.) so a compression bug can never
 * block an upload.
 */
export async function compressImage(file: File, maxDimension = 2400, quality = 0.85): Promise<File> {
  // SVG has no pixel dimensions to shrink; GIF would lose its animation when
  // flattened onto a canvas — both pass through untouched.
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml' || file.type === 'image/gif') return file

  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const { width, height } = bitmap
    if (Math.max(width, height) <= maxDimension) {
      bitmap.close()
      return file
    }

    const scale = maxDimension / Math.max(width, height)
    const targetW = Math.round(width * scale)
    const targetH = Math.round(height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = targetW
    canvas.height = targetH
    const ctx = canvas.getContext('2d')
    if (!ctx) { bitmap.close(); return file }
    ctx.drawImage(bitmap, 0, 0, targetW, targetH)
    bitmap.close()

    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
    if (!blob) return file

    const newName = file.name.replace(/\.[^.]+$/, '') + '.jpg'
    return new File([blob], newName, { type: 'image/jpeg' })
  } catch {
    return file
  }
}
