"use client";

export default function EventHeroImage({ imageUrl, title }: { imageUrl: string | null; title: string }) {
  return (
    <div style={{ position: "relative", width: "100%", height: "clamp(260px, 42vw, 440px)", overflow: "hidden", background: "linear-gradient(to bottom, #1a1a2e 0%, #0F0F1A 100%)" }}>
      {imageUrl && (
        <img
          src={imageUrl}
          alt={title}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
        />
      )}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(15,15,26,0.2), rgba(15,15,26,0.85))" }} />
    </div>
  );
}
