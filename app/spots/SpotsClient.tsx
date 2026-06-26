"use client";

import { useState, useEffect, useRef } from "react";
import SpotCard from "../components/SpotCard";
import { SPOT_CATEGORIES, SUBCATEGORIES, type Spot, type SpotCategory } from "./types";
import { SpotCategoryIcon } from "../lib/spotIcons";

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

  useEffect(() => {
    const segments: [string, boolean][] = [
      ['Πού πάμε ', false],
      ['απόψε;', true],
    ]
    const fullText = segments.map(s => s[0]).join('')
    const goldStart = segments[0][0].length
    const typed = document.getElementById('hero-typed')
    const cursor = document.getElementById('hero-cursor')
    const eyebrow = document.getElementById('hero-eyebrow')
    if (!typed || !cursor || !eyebrow) return
    let i = 0
    const interval = setInterval(() => {
      if (i >= fullText.length) {
        clearInterval(interval)
        setTimeout(() => { eyebrow.style.animation = 'cn-eyebrow 0.8s ease-out forwards' }, 200)
        setTimeout(() => { if (cursor) cursor.style.display = 'none' }, 1700)
        return
      }
      typed.innerHTML = ''
      const before = fullText.slice(0, Math.min(i + 1, goldStart))
      const after = i >= goldStart ? fullText.slice(goldStart, i + 1) : ''
      before.split('\n').forEach((line, idx) => {
        if (idx > 0) typed.appendChild(document.createElement('br'))
        typed.appendChild(document.createTextNode(line))
      })
      if (after) {
        const span = document.createElement('span')
        span.style.cssText = 'color:#E8A020;font-style:italic'
        span.textContent = after
        typed.appendChild(span)
      }
      i++
    }, 38)
    return () => clearInterval(interval)
  }, [])

  return (
    <div style={{ background: "#0F0F1A", minHeight: "100vh" }}>
      {/* ── Cinematic Hero ──────────────────────────────── */}
      <div style={{ position: 'relative', background: '#080808', overflow: 'hidden', minHeight: '280px', display: 'flex', alignItems: 'flex-end', padding: '32px 0 48px' }}>
        <style>{`
          @keyframes cn-flash { 0%{opacity:1} 100%{opacity:0} }
          @keyframes cn-float { from{transform:translateY(0) translateX(0);opacity:var(--op)} to{transform:translateY(-40px) translateX(var(--dx));opacity:calc(var(--op)*0.2)} }
          @keyframes cn-trail { 0%{transform:translateY(0);opacity:0} 10%{opacity:1} 90%{opacity:0.5} 100%{transform:translateY(-100px);opacity:0} }
          @keyframes cn-flare { 0%,100%{opacity:0.03;transform:scale(1)} 50%{opacity:0.08;transform:scale(1.12)} }
          @keyframes cn-blink { 0%,100%{opacity:1} 50%{opacity:0} }
          @keyframes cn-eyebrow { from{opacity:0;letter-spacing:0.6em} to{opacity:1;letter-spacing:0.35em} }
          @keyframes cn-particles-in { from{opacity:0} to{opacity:1} }
        `}</style>

        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'radial-gradient(ellipse 60% 80% at 20% 60%, rgba(232,160,32,0.35), transparent 60%)', animation: 'cn-flash 0.15s ease-out forwards', pointerEvents: 'none', zIndex: 20 }} />

        {([[20,20,200],[45,50,280],[70,15,160],[85,60,220]] as [number,number,number][]).map(([l,t,s],i) => (
          <div key={`f${i}`} style={{ position: 'absolute', width: s, height: s, left: `${l}%`, top: `${t}%`, transform: 'translate(-50%,-50%)', borderRadius: '50%', background: 'radial-gradient(circle, rgba(232,160,32,0.06) 0%, transparent 70%)', animation: `cn-flare ${6+i*2}s ease-in-out infinite`, animationDelay: `${i*1.5}s`, pointerEvents: 'none', zIndex: 1 }} />
        ))}

        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, animation: 'cn-particles-in 2s ease-out forwards', animationDelay: '0.15s', opacity: 0, pointerEvents: 'none', zIndex: 1 }}>
          {[...Array(50)].map((_, i) => {
            const size = i%5===0 ? 2.5 : i%3===0 ? 1.5 : 1
            const op = 0.15+(i%6)*0.08
            const dx = ((i*7)%60)-30
            const dur = 8+(i%5)*3
            const blur = i%4===0
            return (
              <div key={`p${i}`} style={{ position: 'absolute', width: size, height: size, borderRadius: '50%', background: i%7===0 ? '#E8A020' : '#ffffff', opacity: op, left: `${(i*13+7)%96}%`, top: `${(i*19+5)%90}%`, filter: blur ? 'blur(1px)' : 'none', ['--op' as any]: op, ['--dx' as any]: `${dx}px`, animation: `cn-float ${dur}s ease-in-out infinite alternate`, animationDelay: `${(i*0.3)%4}s` }} />
            )
          })}
          {[...Array(14)].map((_,i) => (
            <div key={`t${i}`} style={{ position: 'absolute', width: '1px', height: `${10+(i%4)*8}px`, left: `${(i*17+3)%95}%`, top: `${60+(i%4)*8}%`, background: `linear-gradient(to top, transparent, rgba(255,255,255,${0.1+(i%3)*0.08}), transparent)`, animation: `cn-trail ${4+(i%4)*1.5}s ease-in infinite`, animationDelay: `${(i*0.6)%5}s` }} />
          ))}
        </div>

        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '100px', background: 'linear-gradient(transparent, #0F0F1A)', pointerEvents: 'none', zIndex: 5 }} />
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '160px', background: 'linear-gradient(to right, #0F0F1A, transparent)', pointerEvents: 'none', zIndex: 5 }} />

        <div style={{ position: 'relative', zIndex: 10, maxWidth: '80rem', margin: '0 auto', padding: '0 24px' }}>
          <div id="hero-eyebrow" style={{ fontSize: '9px', letterSpacing: '0.35em', textTransform: 'uppercase', color: '#E8A020', marginBottom: '10px', opacity: 0, fontFamily: 'var(--font-sans)' }}>Spots</div>
          <h1 style={{ fontFamily: 'var(--font-spectral)', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 300, color: '#fff', lineHeight: 1.15, margin: 0, minHeight: '4rem' }}>
            <span id="hero-typed"></span>
            <span id="hero-cursor" style={{ display: 'inline-block', width: '2px', height: '0.85em', background: '#E8A020', verticalAlign: 'middle', marginLeft: '3px', animation: 'cn-blink 0.7s step-end infinite' }} />
          </h1>
          <p style={{ marginTop: '12px', color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>
            Όλα τα spots της Αθήνας — φαγητό, ποτό, νύχτα, θέαμα και άλλα.
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
                <SpotCategoryIcon category={c.key} size={14} /> {c.label}
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
              <div style={{ marginBottom: '22px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.4)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <SpotCategoryIcon category={c.key} size={14} />
                      {c.label}
                    </p>
                    <div style={{ width: '24px', height: '1px', background: '#E8A020', marginTop: '6px' }} />
                  </div>
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em' }}>
                    {items.length} spots
                  </span>
                </div>
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
    border: `1px solid ${active ? "rgba(232,160,32,0.15)" : "rgba(255,255,255,0.06)"}`,
    padding: "7px 14px", borderRadius: 6, cursor: "pointer", transition: "all .2s",
  };
}
