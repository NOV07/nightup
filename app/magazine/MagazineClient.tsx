"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Spectral } from "next/font/google";

const spectral = Spectral({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

interface Article {
  id: string;
  title: string;
  category: string;
  date: string;
  readTime: string;
  image: string;
  excerpt: string;
  featured: boolean;
  series?: string | null;
}

interface SeriesItem {
  slug: string;
  count: number;
}

function formatSlug(slug: string) {
  return slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

export default function MagazineClient({
  articles,
  series,
  fallbackImage,
}: {
  articles: Article[];
  series: SeriesItem[];
  fallbackImage: string;
}) {
  const categories = ["All", ...Array.from(new Set(articles.map((a) => a.category).filter(Boolean))).sort()];
  const [activeCategory, setActiveCategory] = useState("All");

  const filtered =
    activeCategory === "All" ? articles : articles.filter((a) => a.category === activeCategory);

  const featured = filtered.find((a) => a.featured) ?? filtered[0];
  const remaining = featured ? filtered.filter((a) => a.id !== featured.id) : [];
  const tier2 = remaining.slice(0, 2);
  const compact = remaining.slice(2);

  useEffect(() => {
    const segments: [string, boolean][] = [
      ['The Nightup Journal\n', false],
      ['Read between the sets', true],
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
    <>
      <style>{`
        .mag-tier2-card { border: 1px solid transparent; transition: border-color 0.2s; }
        .mag-tier2-card:hover { border-color: rgba(232,160,32,0.30); }
        .mag-series-card { border: 1px solid rgba(255,255,255,0.07); transition: border-color 0.2s; }
        .mag-series-card:hover { border-color: rgba(232,160,32,0.40); }
        .mag-compact-row + .mag-compact-row { border-top: 1px solid rgba(255,255,255,0.10); }
        .mag-compact-title { color: #ffffff; transition: color 150ms; }
        .mag-compact-row:hover .mag-compact-title { color: #E8A020; }
      `}</style>

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
          <div id="hero-eyebrow" style={{ fontSize: '9px', letterSpacing: '0.35em', textTransform: 'uppercase', color: '#E8A020', marginBottom: '10px', opacity: 0, fontFamily: 'var(--font-sans)' }}>Magazine</div>
          <h1 style={{ fontFamily: 'var(--font-spectral)', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 300, color: '#fff', lineHeight: 1.15, margin: 0, minHeight: '4rem' }}>
            <span id="hero-typed"></span>
            <span id="hero-cursor" style={{ display: 'inline-block', width: '2px', height: '0.85em', background: '#E8A020', verticalAlign: 'middle', marginLeft: '3px', animation: 'cn-blink 0.7s step-end infinite' }} />
          </h1>
          <p style={{ marginTop: '12px', color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>
            Συνεντεύξεις, κριτικές, features και ιστορίες από την ελληνική νυχτερινή σκηνή.
          </p>
        </div>
      </div>

      {/* Filter pills */}
      <div className="max-w-7xl mx-auto px-4 pb-6">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className="whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-all flex-shrink-0"
              style={{
                backgroundColor: activeCategory === cat ? "#E8A020" : "#1A1A28",
                color: activeCategory === cat ? "#0F0F1A" : "rgba(255,255,255,0.5)",
                border: `1px solid ${activeCategory === cat ? "#E8A020" : "rgba(255,255,255,0.1)"}`,
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-center py-20" style={{ color: "rgba(255,255,255,0.3)" }}>
          Δεν υπάρχουν άρθρα σε αυτή την κατηγορία.
        </p>
      ) : (
        <>
          {/* 1. Featured full-bleed hero */}
          {featured && (
            <div className="relative w-full overflow-hidden" style={{ minHeight: "480px" }}>
              <Image
                src={featured.image || fallbackImage}
                alt={featured.title}
                fill
                priority
                sizes="100vw"
                className="object-cover object-center"
              />
              <div
                className="absolute inset-0"
                style={{ background: "linear-gradient(to top, rgba(0,0,0,0.80) 0%, transparent 100%)" }}
              />
              <div className="absolute bottom-0 left-0 right-0 max-w-5xl mx-auto px-6 pb-10">
                <span
                  className="inline-block text-xs font-bold mb-4 px-3 py-1"
                  style={{ backgroundColor: "#E8A020", color: "#0F0F1A", borderRadius: "6px", letterSpacing: "0.08em", textTransform: "uppercase" }}
                >
                  {featured.category}
                </span>
                <h2
                  className={`${spectral.className} block mb-3 text-white`}
                  style={{ fontSize: "2.5rem", fontWeight: 400, lineHeight: 1.2 }}
                >
                  {featured.title}
                </h2>
                {featured.excerpt && (
                  <p className="mb-5 line-clamp-2" style={{ color: "rgba(255,255,255,0.70)", fontSize: "1rem", lineHeight: 1.6 }}>
                    {featured.excerpt}
                  </p>
                )}
                <Link
                  href={`/magazine/${featured.id}`}
                  className="text-sm font-semibold hover:underline"
                  style={{ color: "#E8A020" }}
                >
                  Διάβασε →
                </Link>
              </div>
            </div>
          )}

          {/* 2. Tier-2: 2 articles side by side */}
          {tier2.length > 0 && (
            <div className="max-w-7xl mx-auto px-4 mt-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {tier2.map((a) => (
                  <Link
                    key={a.id}
                    href={`/magazine/${a.id}`}
                    className="mag-tier2-card group block overflow-hidden"
                    style={{ backgroundColor: "#1A1A28", borderRadius: "6px" }}
                  >
                    <div className="relative overflow-hidden" style={{ aspectRatio: "16/9" }}>
                      <Image
                        src={a.image || fallbackImage}
                        alt={a.title}
                        fill
                        sizes="(max-width: 640px) 100vw, 50vw"
                        className="object-cover"
                      />
                      <span
                        className="absolute top-3 left-3 text-xs font-bold px-2 py-0.5"
                        style={{ backgroundColor: "#E8A020", color: "#0F0F1A", borderRadius: "6px", textTransform: "uppercase", letterSpacing: "0.06em" }}
                      >
                        {a.category}
                      </span>
                    </div>
                    <div className="p-5">
                      <h3
                        className={`${spectral.className} mb-2 text-white`}
                        style={{ fontSize: "1.25rem", fontWeight: 400, lineHeight: 1.3 }}
                      >
                        {a.title}
                      </h3>
                      {a.excerpt && (
                        <p className="text-sm line-clamp-2 mb-3" style={{ color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>
                          {a.excerpt}
                        </p>
                      )}
                      {a.readTime && (
                        <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{a.readTime}</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* 3. Series strip */}
          {series.length > 0 && (
            <div className="max-w-7xl mx-auto px-4" style={{ marginTop: '48px', marginBottom: '48px' }}>
              <p
                className="text-xs font-bold uppercase mb-4"
                style={{ color: "rgba(255,255,255,0.40)", letterSpacing: "0.15em" }}
              >
                Σειρές
              </p>
              <div className="flex gap-4 overflow-x-auto pb-3">
                {series.map(({ slug, count }) => (
                  <Link
                    key={slug}
                    href={`/magazine/series/${encodeURIComponent(slug)}`}
                    className="mag-series-card flex-shrink-0 block"
                    style={{ width: "200px", backgroundColor: "#16213E", borderRadius: "6px", padding: "16px" }}
                  >
                    <p className={`${spectral.className} text-base text-white mb-1`} style={{ fontStyle: "italic" }}>
                      {formatSlug(slug)}
                    </p>
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.50)" }}>
                      {count} {count === 1 ? "άρθρο" : "άρθρα"}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* 4. Compact list */}
          {compact.length > 0 && (
            <div className="max-w-7xl mx-auto px-4 mt-10 pb-16">
              {compact.map((a) => (
                <Link
                  key={a.id}
                  href={`/magazine/${a.id}`}
                  className="mag-compact-row flex items-center gap-4 py-4"
                  style={{ textDecoration: "none" }}
                >
                  <div
                    className="relative flex-shrink-0 overflow-hidden"
                    style={{ width: "80px", height: "80px", borderRadius: "4px" }}
                  >
                    <Image
                      src={a.image || fallbackImage}
                      alt={a.title}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span
                      className="text-xs font-bold block mb-1"
                      style={{ color: "#E8A020", textTransform: "uppercase", letterSpacing: "0.06em" }}
                    >
                      {a.category}
                    </span>
                    <p className={`${spectral.className} mag-compact-title text-base leading-snug line-clamp-2`}>
                      {a.title}
                    </p>
                    {a.date && (
                      <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.40)" }}>
                        {new Date(a.date).toLocaleDateString("el-GR", { day: "numeric", month: "long", year: "numeric" })}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
