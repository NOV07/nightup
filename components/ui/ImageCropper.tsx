'use client'
import { useCallback, useState } from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import { useLanguage } from '@/app/components/LanguageContext'

const GOLD = '#E8A020'
const SURFACE = '#1A1A28'
const BORDER = 'rgba(232,160,32,0.25)'

/** Crop box as fractions (0-1) of the original image, matching the crop_x/y/width/height DB columns. */
export interface CropBox {
  crop_x: number
  crop_y: number
  crop_width: number
  crop_height: number
}

interface ImageCropperProps {
  imageUrl: string
  /** width / height, e.g. 16/9 for cards, 1 for avatars */
  aspect: number
  initialCrop?: CropBox | null
  onConfirm: (crop: CropBox) => void
  onCancel: () => void
}

function toPercentArea(box: CropBox): Area {
  return {
    x: box.crop_x * 100,
    y: box.crop_y * 100,
    width: box.crop_width * 100,
    height: box.crop_height * 100,
  }
}

export default function ImageCropper({ imageUrl, aspect, initialCrop, onConfirm, onCancel }: ImageCropperProps) {
  const { t } = useLanguage()
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPercent, setCroppedAreaPercent] = useState<Area | null>(
    initialCrop ? toPercentArea(initialCrop) : null
  )

  const handleCropComplete = useCallback((croppedArea: Area) => {
    setCroppedAreaPercent(croppedArea)
  }, [])

  function handleConfirm() {
    if (!croppedAreaPercent) return
    onConfirm({
      crop_x: croppedAreaPercent.x / 100,
      crop_y: croppedAreaPercent.y / 100,
      crop_width: croppedAreaPercent.width / 100,
      crop_height: croppedAreaPercent.height / 100,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-lg relative" style={{ backgroundColor: '#0F0F1A', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '1.5rem' }}>
        <button
          onClick={onCancel}
          aria-label={t('image_crop_close')}
          className="absolute top-2 right-2 w-11 h-11 flex items-center justify-center text-white/40 hover:text-white transition text-xl"
        >
          ✕
        </button>

        <h2 className="text-lg font-bold text-white mb-4">{t('image_crop_title')}</h2>

        <div className="relative w-full" style={{ height: 360, backgroundColor: SURFACE, borderRadius: 6, overflow: 'hidden' }}>
          <Cropper
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={handleCropComplete}
            initialCroppedAreaPercentages={initialCrop ? toPercentArea(initialCrop) : undefined}
            style={{
              containerStyle: { backgroundColor: SURFACE },
              cropAreaStyle: { border: `2px solid ${GOLD}` },
            }}
          />
        </div>

        <div className="flex items-center gap-3 mt-4">
          <span className="text-xs font-bold uppercase tracking-wider flex-shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {t('image_crop_zoom')}
          </span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={e => setZoom(Number(e.target.value))}
            className="flex-1"
            style={{ accentColor: GOLD }}
            aria-label={t('image_crop_zoom')}
          />
        </div>

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 text-sm font-medium transition-colors"
            style={{ backgroundColor: SURFACE, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: 'rgba(255,255,255,0.6)' }}
          >
            {t('image_crop_cancel')}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 py-3 text-sm font-bold transition-opacity hover:opacity-90"
            style={{ backgroundColor: GOLD, color: '#0F0F1A', borderRadius: 6 }}
          >
            {t('image_crop_confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}
