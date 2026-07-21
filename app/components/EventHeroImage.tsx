"use client";

import CroppedImage, { type CropBox } from "../../components/ui/CroppedImage";

export default function EventHeroImage({ imageUrl, title, crop }: { imageUrl: string; title: string; crop?: CropBox | null; genre?: string; venue?: string; date?: string }) {
  return (
    <div style={{ position: "relative", width: "100%", height: "clamp(260px, 42vw, 440px)", overflow: "hidden", background: "linear-gradient(to bottom, #1a1a2e 0%, #0F0F1A 100%)" }}>
      <CroppedImage
        src={imageUrl}
        alt={title}
        crop={crop}
        sizes="100vw"
        priority
        style={{ objectFit: "cover" }}
      />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(15,15,26,0.2), rgba(15,15,26,0.85))" }} />
    </div>
  );
}
