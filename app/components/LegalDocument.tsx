"use client";

import { useLanguage } from "./LanguageContext";
import type { LegalContent } from "../legal-content/types";

// Renders a legal page in the visitor's selected language. Falls back to
// English when no Greek version is supplied.
export default function LegalDocument({ en, el }: { en: LegalContent; el?: LegalContent }) {
  const { lang } = useLanguage();
  const { eyebrow, title, updated, sections } = lang === "el" && el ? el : en;

  return (
    <div style={{ backgroundColor: "#0F0F1A", minHeight: "100vh", color: "#F4F4F5" }}>
      <div style={{ maxWidth: "760px", margin: "0 auto", padding: "64px 24px 80px" }}>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "9px", letterSpacing: "0.25em", textTransform: "uppercase", color: "#E8A020", marginBottom: "16px" }}>
          {eyebrow}
        </p>
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 400, marginBottom: "8px" }}>
          {title}
        </h1>
        <p style={{ color: "rgba(255,255,255,0.50)", fontSize: "13px", marginBottom: "48px" }}>
          {updated}
        </p>

        {sections.map(({ title, blocks }) => (
          <div key={title} style={{ marginBottom: "36px" }}>
            <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#F4F4F5", marginBottom: "10px" }}>{title}</h2>
            {blocks.map((block, i) =>
              Array.isArray(block) ? (
                <ul key={i} style={{ fontSize: "14px", lineHeight: 1.75, color: "rgba(255,255,255,0.55)", listStyle: "disc", margin: i ? "10px 0 0" : 0, paddingLeft: "20px" }}>
                  {block.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p key={i} style={{ fontSize: "14px", lineHeight: 1.75, color: "rgba(255,255,255,0.55)", marginTop: i ? "10px" : 0 }}>{block}</p>
              )
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
