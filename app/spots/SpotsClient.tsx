"use client";

import { useState, useEffect, useRef } from "react";
import SpotCard from "../components/SpotCard";
import { SPOT_CATEGORIES, SUBCATEGORIES, type Spot, type SpotCategory } from "./types";

export default function SpotsClient({ spots }: { spots: Spot[] }) {
  const [active, setActive] = useState<SpotCategory>("drink");
  const [subFilter, setSubFilter] = useState<Record<string, string | null>>({});
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const byCat = (c: SpotCategory) => spots.filter((s) => s.category === c);

  const jump = (c: SpotCategory) => {
    setActive(c);
    sectionRefs.current[c]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    const onScroll = () => {
      let cur: SpotCategory = SPOT_CATEGORIES[0].key;
      for (const { key } of SPOT_CATEGORIES) {
        const el = sectionRefs.current[key];
        if (el && window.scrollY >= el.offsetTop - 160) cur = key;
      }
      setActive(cur);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div style={{ background: "#0F0F1A", minHeight: "100vh" }}>
      <div style={{ maxWidth: "80rem", margin: "0 auto", padding: "0 24px" }}>
        <div style={{ position: "relative", padding: "54px 0 30px", overflow: "hidden" }}>
          <div style={{ position: "absolute", width: 340, height: 340, borderRadius: "50%", background: "#E8A020", opacity: 0.07, filter: "blur(80px)", top: -160, left: -80 }} />
          <h1 style={{ fontFamily: "var(--font-spectral), Georgia, serif", fontWeight: 700, fontSize: 46, letterSpacing: "-1.4px", lineHeight: 1, position: "relative" }}>
            Πού πάμε <em style={{ fontStyle: "italic", fontWeight: 600, color: "#E8A020" }}>απόψε;</em>
          </h1>
          <p style={{ color: "#A1A1AA", fontSize: 16, marginTop: 14, maxWidth: 540, lineHeight: 1.55 }}>
            Όλα τα spots της Αθήνας — φαγητό, ποτό, νύχτα, θέαμα και άλλα. Διάλεξε κατηγορία και βρες πού να πας.
          </p>
        </div>
      </div>

      <div style={{ position: "sticky", top: 60, zIndex: 30, background: "rgba(15,15,26,0.9)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: "80rem", margin: "0 auto", padding: "14px 24px", display: "flex", gap: 9, overflowX: "auto" }} className="hide-scroll">
          {SPOT_CATEGORIES.map((c) => {
            const on = active === c.key;
            return (
              <button
                key={c.key}
                onClick={() => jump(c.key)}
                style={{
                  whiteSpace: "nowrap", fontSize: 13, fontWeight: 600,
                  color: on ? "#F5B335" : "#A1A1AA",
                  background: on ? "rgba(232,160,32,0.12)" : "#1A1A28",
                  border: `1px solid ${on ? "rgba(232,160,32,0.15)" : "rgba(255,255,255,0.05)"}`,
                  padding: "9px 16px", borderRadius: 6, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 7,
                  transition: "all .25s cubic-bezier(.22,.61,.36,1)",
                }}
              >
                {c.emoji} {c.label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ maxWidth: "80rem", margin: "0 auto", padding: "0 24px" }}>
        {SPOT_CATEGORIES.map((c) => {
          const items = byCat(c.key);
          if (!items.length) return null;
          return (
            <div
              key={c.key}
              ref={(el) => { sectionRefs.current[c.key] = el; }}
              style={{ padding: "40px 0 8px", scrollMarginTop: 130 }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
                <span style={{ fontSize: 26 }}>{c.emoji}</span>
                <span style={{ fontFamily: "var(--font-spectral), Georgia, serif", fontWeight: 600, fontSize: 27, letterSpacing: "-0.5px" }}>{c.label}</span>
                <span style={{ fontSize: 13, color: "#71717A", fontWeight: 500, marginLeft: "auto" }}>{items.length} spots</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
                <button
                  onClick={() => setSubFilter((p) => ({ ...p, [c.key]: null }))}
                  style={subChipStyle(!subFilter[c.key])}
                >
                  Όλα
                </button>
                {SUBCATEGORIES[c.key].map((sub) => {
                  const n = items.filter((s) => s.subcategory === sub.value).length;
                  if (n === 0) return null;
                  const on = subFilter[c.key] === sub.value;
                  return (
                    <button
                      key={sub.value}
                      onClick={() => setSubFilter((p) => ({ ...p, [c.key]: on ? null : sub.value }))}
                      style={subChipStyle(on)}
                    >
                      {sub.label} · {n}
                    </button>
                  );
                })}
              </div>
              <div className="spots-grid">
                {items
                  .filter((s) => !subFilter[c.key] || s.subcategory === subFilter[c.key])
                  .map((s) => <SpotCard key={s.id} spot={s} />)}
              </div>
            </div>
          );
        })}
        <div style={{ height: 60 }} />
      </div>

      <style jsx>{`
        .hide-scroll::-webkit-scrollbar { display: none; }
        .hide-scroll { scrollbar-width: none; }
        .spots-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
        @media (max-width: 900px) { .spots-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 600px) { .spots-grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}

function subChipStyle(active: boolean): React.CSSProperties {
  return {
    whiteSpace: "nowrap", fontSize: 12.5, fontWeight: 600,
    color: active ? "#F5B335" : "#A1A1AA",
    background: active ? "rgba(232,160,32,0.12)" : "#1A1A28",
    border: `1px solid ${active ? "rgba(232,160,32,0.15)" : "rgba(255,255,255,0.05)"}`,
    padding: "7px 13px", borderRadius: 6, cursor: "pointer", transition: "all .2s",
  };
}
