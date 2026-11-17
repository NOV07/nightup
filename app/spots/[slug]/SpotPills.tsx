"use client";
import type { ReactNode } from "react";
import { useLanguage } from "../../components/LanguageContext";

const svgProps = {
  viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round",
  style: { width: 18, height: 18, flexShrink: 0, color: "#E8A020" }, "aria-hidden": true,
} as const;

const PinIcon = () => <svg {...svgProps}><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></svg>;
const PhoneIcon = () => <svg {...svgProps}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" /></svg>;
const GlobeIcon = () => <svg {...svgProps}><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 0 1 0 20M12 2a15.3 15.3 0 0 0 0 20" /></svg>;
const IgIcon = () => <svg {...svgProps}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" /></svg>;

const CSS = `
.sp-pills { display: flex; gap: 10px; width: 100%; }
.sp-pill { flex: 1 1 0; min-width: 0; display: flex; align-items: center; justify-content: center; gap: 6px; height: 46px; padding: 0 4px; border-radius: 8px; background: #1A1A28; border: 1px solid rgba(255,255,255,0.055); color: #F4F4F5; font-size: 13px; text-decoration: none; transition: border-color .2s; }
.sp-pill:hover, .sp-pill:focus-visible { border-color: rgba(232,160,32,0.5); outline: none; }
.sp-pill .txt { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
.sp-pill .full { display: none; }
@media (min-width: 700px) { .sp-pill .full { display: inline; } .sp-pill .short { display: none; } .sp-pill { justify-content: flex-start; padding: 0 16px; gap: 8px; font-size: 14px; } }
`;

export interface PillData { mapUrl: string | null; address: string | null; phone: string | null; website: string | null; instagram: string | null }

/** One row of equal pills. A pill without data is not rendered; no data at all, no row. */
export default function SpotPills({ mapUrl, address, phone, website, instagram }: PillData) {
  const { t } = useLanguage();
  const pills: { key: string; href: string; icon: ReactNode; full: string; short: string; external: boolean }[] = [];
  if (address && mapUrl) pills.push({ key: "map", href: mapUrl, icon: <PinIcon />, full: address, short: t("spots_pill_map"), external: true });
  if (phone) pills.push({ key: "tel", href: `tel:${phone}`, icon: <PhoneIcon />, full: phone, short: t("spots_pill_call"), external: false });
  if (website) pills.push({ key: "web", href: website, icon: <GlobeIcon />, full: website.replace(/^https?:\/\//, "").replace(/\/$/, ""), short: t("spots_pill_site"), external: true });
  if (instagram) pills.push({ key: "ig", href: `https://instagram.com/${instagram}`, icon: <IgIcon />, full: `@${instagram}`, short: t("spots_pill_ig"), external: true });
  if (pills.length === 0) return null;
  return (
    <div className="sp-pills">
      <style>{CSS}</style>
      {pills.map((p) => (
        <a key={p.key} className="sp-pill" href={p.href} aria-label={`${p.short}: ${p.full}`}
          {...(p.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
          {p.icon}
          <span className="txt full">{p.full}</span>
          <span className="txt short">{p.short}</span>
        </a>
      ))}
    </div>
  );
}
