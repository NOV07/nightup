import Link from "next/link";

/**
 * «See them on the map»: a full-width row that is one link to /map. The same look as the «Near you» card of /events
 * (gold-tinted round icon on the left, title and a line under it, chevron on the right). `href` carries the filters
 * of the page (see app/lib/mapLink.ts).
 */
export default function MapLinkRow({ href, title, description, testId }: { href: string; title: string; description: string; testId: string }) {
  return (
    <>
      <style>{`
        .map-row { display: flex; align-items: center; gap: 14px; box-sizing: border-box; width: 100%; min-height: 68px; padding: 12px 16px; border-radius: 12px; text-decoration: none; background: rgba(255,255,255,0.03); border: 1px solid rgba(232,160,32,0.2); transition: background .15s, border-color .15s; }
        .map-row:hover { background: rgba(232,160,32,0.07); border-color: rgba(232,160,32,0.4); }
        .map-row:focus-visible { outline: 2px solid #E8A020; outline-offset: 2px; }
      `}</style>
      <Link href={href} className="map-row" data-testid={testId} aria-label={`${title}. ${description}`}>
        <span aria-hidden="true" style={{ flex: "none", width: 44, height: 44, borderRadius: "50%", background: "rgba(232,160,32,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E8A020" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>
        </span>
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2, fontFamily: "var(--font-sans)" }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{description}</span>
        </span>
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E8A020" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none" }}><path d="M9 6l6 6-6 6" /></svg>
      </Link>
    </>
  );
}
