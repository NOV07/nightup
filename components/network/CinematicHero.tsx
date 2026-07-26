'use client'
import { useEffect } from 'react'
import Link from 'next/link'

const GOLD = '#E8A020'

interface Props {
  eyebrow: string
  /** Pulsing dot before the eyebrow — used by the "LIVE NETWORK" hero. */
  eyebrowDot?: boolean
  /** Title typed out first, in plain white. */
  titleBefore: string
  /** Tail of the title, typed in gold italic. */
  titleEm: string
  subtitle: string
  backHref?: string
  backLabel?: string
  /** Extra content inside the tail, revealed with the subtitle. */
  children?: React.ReactNode
}

// Cinematic hero — camera flash, drifting flares, particles and light trails
// behind a title that types itself out. The eyebrow fades in first, then the
// title types, then the back link + subtitle + any extra tail content fade in.
export default function CinematicHero({
  eyebrow, eyebrowDot, titleBefore, titleEm, subtitle, backHref, backLabel, children,
}: Props) {
  useEffect(() => {
    const fullText = titleBefore + titleEm
    const goldStart = titleBefore.length
    const typed = document.getElementById('hero-typed')
    const cursor = document.getElementById('hero-cursor')
    const tail = document.getElementById('hero-tail')
    if (!typed || !cursor || !tail) return
    const back = document.getElementById('hero-back')
    let i = 0
    let interval: ReturnType<typeof setInterval> | undefined
    const timeouts: ReturnType<typeof setTimeout>[] = []
    const start = setTimeout(() => {
      interval = setInterval(() => {
        if (i >= fullText.length) {
          clearInterval(interval)
          timeouts.push(setTimeout(() => {
            tail.style.animation = 'cn-fade-in 0.8s ease-out forwards'
            tail.style.pointerEvents = 'auto'
            if (back) {
              back.style.animation = 'cn-fade-in 0.8s ease-out forwards'
              back.style.pointerEvents = 'auto'
            }
          }, 200))
          timeouts.push(setTimeout(() => { cursor.style.display = 'none' }, 1700))
          return
        }
        typed.innerHTML = ''
        const before = fullText.slice(0, Math.min(i + 1, goldStart))
        const after = i >= goldStart ? fullText.slice(goldStart, i + 1) : ''
        typed.appendChild(document.createTextNode(before))
        if (after) {
          const span = document.createElement('span')
          span.style.cssText = 'color:#E8A020;font-style:italic'
          span.textContent = after
          typed.appendChild(span)
        }
        i++
      }, 38)
    }, 700)
    return () => {
      clearTimeout(start)
      clearInterval(interval)
      timeouts.forEach(clearTimeout)
    }
  }, [titleBefore, titleEm])

  return (
    <div style={{ position: 'relative', background: '#080808', overflow: 'hidden', minHeight: '280px', display: 'flex', alignItems: 'flex-end', padding: '32px 0 48px' }}>
      <style>{`
        @keyframes cn-flash { 0%{opacity:1} 100%{opacity:0} }
        @keyframes cn-float { from{transform:translateY(0) translateX(0);opacity:var(--op)} to{transform:translateY(-40px) translateX(var(--dx));opacity:calc(var(--op)*0.2)} }
        @keyframes cn-trail { 0%{transform:translateY(0);opacity:0} 10%{opacity:1} 90%{opacity:0.5} 100%{transform:translateY(-100px);opacity:0} }
        @keyframes cn-flare { 0%,100%{opacity:0.03;transform:scale(1)} 50%{opacity:0.08;transform:scale(1.12)} }
        @keyframes cn-eyebrow { from{opacity:0;letter-spacing:0.6em} to{opacity:1;letter-spacing:0.35em} }
        @keyframes cn-particles-in { from{opacity:0} to{opacity:1} }
        @keyframes cn-blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes cn-fade-in { from{opacity:0} to{opacity:1} }
      `}</style>

      {/* Camera-flash burst on mount */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'radial-gradient(ellipse 60% 80% at 20% 60%, rgba(232,160,32,0.35), transparent 60%)', animation: 'cn-flash 0.15s ease-out forwards', pointerEvents: 'none', zIndex: 20 }} />

      {/* Slow gold flares */}
      {([[20,20,200],[45,50,280],[70,15,160],[85,60,220]] as [number,number,number][]).map(([l,tp,s],i) => (
        <div key={`f${i}`} style={{ position: 'absolute', width: s, height: s, left: `${l}%`, top: `${tp}%`, transform: 'translate(-50%,-50%)', borderRadius: '50%', background: 'radial-gradient(circle, rgba(232,160,32,0.06) 0%, transparent 70%)', animation: `cn-flare ${6+i*2}s ease-in-out infinite`, animationDelay: `${i*1.5}s`, pointerEvents: 'none', zIndex: 1 }} />
      ))}

      {/* Particles + light trails */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, animation: 'cn-particles-in 2s ease-out forwards', animationDelay: '0.15s', opacity: 0, pointerEvents: 'none', zIndex: 1 }}>
        {[...Array(50)].map((_, i) => {
          const size = i%5===0 ? 2.5 : i%3===0 ? 1.5 : 1
          const op = 0.15+(i%6)*0.08
          const dx = ((i*7)%60)-30
          const dur = 8+(i%5)*3
          const blur = i%4===0
          return (
            <div key={`p${i}`} style={{ position: 'absolute', width: size, height: size, borderRadius: '50%', background: i%7===0 ? GOLD : '#ffffff', opacity: op, left: `${(i*13+7)%96}%`, top: `${(i*19+5)%90}%`, filter: blur ? 'blur(1px)' : 'none', ['--op' as string]: op, ['--dx' as string]: `${dx}px`, animation: `cn-float ${dur}s ease-in-out infinite alternate`, animationDelay: `${(i*0.3)%4}s` } as React.CSSProperties} />
          )
        })}
        {[...Array(14)].map((_, i) => (
          <div key={`t${i}`} style={{ position: 'absolute', width: '1px', height: `${10+(i%4)*8}px`, left: `${(i*17+3)%95}%`, top: `${60+(i%4)*8}%`, background: `linear-gradient(to top, transparent, rgba(255,255,255,${0.1+(i%3)*0.08}), transparent)`, animation: `cn-trail ${4+(i%4)*1.5}s ease-in infinite`, animationDelay: `${(i*0.6)%5}s` }} />
        ))}
      </div>

      {/* Fades into the page background */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '100px', background: 'linear-gradient(transparent, #0F0F1A)', pointerEvents: 'none', zIndex: 5 }} />
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '160px', background: 'linear-gradient(to right, #0F0F1A, transparent)', pointerEvents: 'none', zIndex: 5 }} />

      <div style={{ position: 'relative', zIndex: 10, maxWidth: '72rem', margin: '0 auto', padding: '0 24px', width: '100%' }}>
        {backHref && (
          <div id="hero-back" style={{ opacity: 0, pointerEvents: 'none', marginBottom: 14 }}>
            <Link
              href={backHref}
              className="text-xs transition-colors hover:text-white"
              style={{ color: 'rgba(255,255,255,0.45)' }}
            >
              {backLabel}
            </Link>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, fontSize: 9, letterSpacing: '0.35em', textTransform: 'uppercase', color: GOLD, fontFamily: 'var(--font-sans)', opacity: 0, animation: 'cn-eyebrow 0.8s ease-out forwards', animationDelay: '0.2s' }}>
          {eyebrowDot && (
            <span className="animate-live-pulse" style={{ width: 7, height: 7, borderRadius: '50%', background: GOLD, display: 'inline-block', flexShrink: 0 }} />
          )}
          <span>{eyebrow}</span>
        </div>
        <h1 style={{ fontFamily: 'var(--font-spectral)', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 300, color: '#fff', lineHeight: 1.15, margin: 0, minHeight: '4rem' }}>
          <span id="hero-typed"></span>
          <span id="hero-cursor" style={{ display: 'inline-block', width: '2px', height: '0.85em', background: GOLD, verticalAlign: 'middle', marginLeft: '3px', animation: 'cn-blink 0.7s step-end infinite' }} />
        </h1>
        <div id="hero-tail" style={{ opacity: 0, pointerEvents: 'none' }}>
          <p style={{ marginTop: '12px', color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>
            {subtitle}
          </p>
          {children}
        </div>
      </div>
    </div>
  )
}
