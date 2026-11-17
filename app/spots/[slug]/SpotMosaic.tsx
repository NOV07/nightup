"use client";
import Link from "next/link";
import CroppedImage, { type CropBox } from "../../../components/ui/CroppedImage";
import { GalleryThumb } from "../../../components/ui/GalleryLightbox";
import type { GalleryItem } from "../../lib/types";
import { useLanguage } from "../../components/LanguageContext";

const CSS = `
.sp-mosaic { display: grid; gap: 6px; grid-template-columns: 1fr 1fr; grid-template-rows: 260px 110px; border-radius: 10px; overflow: hidden; }
.sp-mosaic[data-n="0"] { grid-template-rows: 260px; }
.sp-mosaic .cover { grid-column: 1 / -1; grid-row: 1; position: relative; overflow: hidden; background: #1A1A28; }
.sp-mosaic .tile { position: relative; overflow: hidden; padding: 0; border: 0; cursor: pointer; background: #1A1A28; display: block; width: 100%; height: 100%; }
.sp-mosaic .cover[role="button"]:focus-visible { outline: 2px solid #E8A020; outline-offset: -2px; }
.sp-mosaic .tile:focus-visible { outline: 2px solid #E8A020; outline-offset: -2px; }
.sp-mosaic .tile img { transition: transform .35s; }
.sp-mosaic .tile:hover img { transform: scale(1.03); }
.sp-mosaic .t3, .sp-mosaic .t4 { display: none; }
.sp-mosaic[data-n="1"] .t1 { grid-column: 1 / -1; }
.sp-mosaic .more { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(10,10,18,0.6); color: #fff; font-size: 20px; font-weight: 700; }
.sp-allphotos { display: none; }
@media (min-width: 900px) {
  .sp-mosaic { grid-template-columns: 2fr 1fr 1fr; grid-template-rows: 1fr 1fr; height: 420px; }
  .sp-mosaic[data-n="0"] { grid-template-columns: 1fr; grid-template-rows: 1fr 1fr; }
  .sp-mosaic .cover { grid-column: 1; grid-row: 1 / 3; }
  .sp-mosaic .t3, .sp-mosaic .t4 { display: block; }
  .sp-mosaic .more { display: none; }
  .sp-mosaic[data-n="1"], .sp-mosaic[data-n="2"] { grid-template-columns: 2fr 1fr; }
  .sp-mosaic[data-n="1"] .t1 { grid-column: 2; grid-row: 1 / 3; }
  .sp-mosaic[data-n="2"] .t1 { grid-column: 2; grid-row: 1; }
  .sp-mosaic[data-n="2"] .t2 { grid-column: 2; grid-row: 2; }
  .sp-mosaic[data-n="3"] .t1 { grid-column: 2; grid-row: 1 / 3; }
  .sp-mosaic[data-n="3"] .t2 { grid-column: 3; grid-row: 1; }
  .sp-mosaic[data-n="3"] .t3 { grid-column: 3; grid-row: 2; }
  .sp-mosaic[data-n="4"] .t1 { grid-column: 2; grid-row: 1; }
  .sp-mosaic[data-n="4"] .t2 { grid-column: 3; grid-row: 1; }
  .sp-mosaic[data-n="4"] .t3 { grid-column: 2; grid-row: 2; }
  .sp-mosaic[data-n="4"] .t4 { grid-column: 3; grid-row: 2; }
  .sp-allphotos { display: inline-flex; }
}
`;

const chip: React.CSSProperties = { color: "#fff", fontSize: 14, fontWeight: 600, background: "rgba(0,0,0,0.45)", padding: "8px 14px", borderRadius: 6, backdropFilter: "blur(8px)" };

/** `total` is what the lightbox holds; `coverIndex` is where the cover sits in it (null: the cover is a placeholder and does not open);
 *  `offset` is the lightbox index of gallery[0]. */
export default function SpotMosaic({ cover, coverCrop, name, gallery, total, coverIndex, offset, sponsored, onOpen }: {
  cover: string; coverCrop: CropBox | null; name: string; gallery: GalleryItem[]; total: number; coverIndex: number | null; offset: number; sponsored: boolean; onOpen: (i: number) => void;
}) {
  const { t } = useLanguage();
  const n = Math.min(4, gallery.length);
  const hiddenOnMobile = gallery.length - 2;

  return (
    <div style={{ position: "relative" }}>
      <style>{CSS}</style>
      <div className="sp-mosaic" data-n={n}>
        <div className="cover" {...(coverIndex !== null ? {
          role: "button", tabIndex: 0, "aria-label": `${t("media_photo")}: ${name}`,
          onClick: () => onOpen(coverIndex),
          onKeyDown: (e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(coverIndex); } },
          style: { cursor: "pointer" },
        } : {})}>
          <CroppedImage src={cover} alt={name} crop={coverCrop} sizes="(min-width: 900px) 50vw, 100vw" priority />
        </div>
        {gallery.slice(0, n).map((g, i) => (
          <button key={i} type="button" className={`tile t${i + 1}`} onClick={() => onOpen(i + offset)}
            aria-label={`${g.type === "video" ? t("media_video") : t("media_photo")} ${i + 1}`}>
            <GalleryThumb item={g} alt="" />
            {i === 1 && hiddenOnMobile > 0 && <span className="more" aria-hidden>+{hiddenOnMobile}</span>}
          </button>
        ))}
      </div>
      <Link href="/spots" style={{ ...chip, position: "absolute", top: 16, left: 16 }}>‹ Spots</Link>
      {sponsored && (
        <span style={{ position: "absolute", left: 16, bottom: 16, background: "rgba(10,10,18,0.78)", color: "#E8A020", fontSize: 10, fontWeight: 700, letterSpacing: "0.6px", padding: "5px 10px", borderRadius: 4, border: "1px solid rgba(232,160,32,0.15)" }}>{t("spots_sponsored")}</span>
      )}
      {total > 0 && (
        <button type="button" className="sp-allphotos" onClick={() => onOpen(0)}
          style={{ ...chip, position: "absolute", right: 16, bottom: 16, fontSize: 13, cursor: "pointer", border: 0, alignItems: "center" }}>
          {t("spots_all_photos")} · {total}
        </button>
      )}
    </div>
  );
}
