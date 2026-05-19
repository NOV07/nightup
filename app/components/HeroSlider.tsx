"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";

interface Slide {
  id: string;
  type: "event" | "article" | "release";
  eyebrow: string;
  title: string;
  subtitle: string;
  meta: string[];
  ctaLabel: string;
  ctaHref: string;
  image?: string;
  bgColor: string;
}

const GRADIENT = "linear-gradient(to top, rgba(15,15,26,1) 0%, rgba(15,15,26,0.6) 45%, rgba(15,15,26,0.1) 100%)";

export default function HeroSlider({ slides }: { slides: Slide[] }) {
  if (!slides || slides.length === 0) return null;
  const total = slides.length;
  // We clone: [...slides, slides[0]] for seamless loop
  const extended = [...slides, slides[0]];

  const [index, setIndex] = useState(0); // visual index in extended
  const [transitioning, setTransitioning] = useState(false);
  const [textVisible, setTextVisible] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isJumping = useRef(false);

  // Real slide index (for dots, text)
  const cur = index % total;

  const slideTo = (newIndex: number) => {
    if (transitioning) return;
    setTextVisible(false);
    setTransitioning(true);
    setIndex(newIndex);

    // After transition ends
    setTimeout(() => {
      // If we landed on the clone (last position),
      // instantly jump to real position without animation
      if (newIndex === total) {
        isJumping.current = true;
        setTransitioning(false);
        setIndex(0);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            isJumping.current = false;
          });
        });
      } else {
        setTransitioning(false);
      }
      // Fade text back in
      setTimeout(() => setTextVisible(true), 50);
    }, 650);
  };

  const next = () => slideTo(index + 1);
  const prev = () => {
    const target = index === 0 ? total - 1 : index - 1;
    slideTo(target);
  };
  const goTo = (i: number) => slideTo(i);

  const touchStartX = useRef<number | null>(null);
  const MIN_SWIPE = 50;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(delta) < MIN_SWIPE) { touchStartX.current = null; return; }
    if (delta > 0) { next(); resetTimer(); } else { prev(); resetTimer(); }
    touchStartX.current = null;
  };

  const resetTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(next, 5500);
  };

  useEffect(() => {
    resetTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [index]);

  const slide = slides[cur];

  return (
    <section
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{
        position: "relative",
        height: "clamp(280px, 55vw, 480px)",
        overflow: "hidden",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>

      {/* Sliding track */}
      <div style={{
        display: "flex",
        width: `${extended.length * 100}%`,
        height: "100%",
        transform: `translateX(-${(index * 100) / extended.length}%)`,
        transition: (transitioning && !isJumping.current)
          ? "transform 0.65s cubic-bezier(0.25,0.1,0.25,1)"
          : "none",
        willChange: "transform",
      }}>
        {extended.map((s, i) => (
          <div key={`${s.id}-${i}`} style={{
            width: `${100 / extended.length}%`,
            height: "100%",
            position: "relative",
            flexShrink: 0,
            overflow: "hidden",
          }}>
            {/* Ken Burns on active */}
            <div style={{
              position: "absolute", inset: 0,
              transform: (i === index || i % total === cur)
                ? "scale(1.04)" : "scale(1)",
              transition: "transform 8s ease",
            }}>
              {s.image ? (
                <Image
                  src={s.image}
                  alt={s.title}
                  fill
                  style={{ objectFit: "cover" }}
                  priority={i === 0}
                />
              ) : (
                <div style={{
                  position: "absolute", inset: 0,
                  background: s.bgColor,
                }} />
              )}
            </div>
            <div style={{
              position: "absolute", inset: 0,
              background: GRADIENT,
            }} />
          </div>
        ))}
      </div>

      {/* Text — fades out/in on slide change */}
      <div
        className="hero-slide-body"
        style={{
          position: "absolute", bottom: 0,
          left: 0, right: 0,
          padding: "36px 180px 36px 36px",
          zIndex: 10,
          opacity: textVisible ? 1 : 0,
          transform: textVisible
            ? "translateY(0)"
            : "translateY(6px)",
          transition: "opacity 0.45s ease, transform 0.45s ease",
        }}
      >
        <p style={{
          fontFamily: "var(--font-mono)",
          fontSize: "9px", letterSpacing: "0.2em",
          textTransform: "uppercase", color: "var(--gold)",
          marginBottom: "10px",
          display: "flex", alignItems: "center", gap: "10px",
        }}>
          <span style={{
            width: "20px", height: "1px",
            background: "var(--gold)",
            display: "inline-block", flexShrink: 0,
          }} />
          {slide.eyebrow}
        </p>
        <h1
          className="hero-slide-title"
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "clamp(22px, 3vw, 32px)",
            fontWeight: 400, lineHeight: 1.2,
            color: "var(--text-primary)",
            maxWidth: "560px", marginBottom: "8px",
          }}
        >
          {slide.title}
        </h1>
        <p style={{
          fontFamily: "var(--font-serif)",
          fontStyle: "italic", fontSize: "14px",
          color: "var(--text-secondary)",
          maxWidth: "440px", lineHeight: 1.6,
          marginBottom: "18px",
        }}>
          {slide.subtitle}
        </p>
        <div style={{
          display: "flex", alignItems: "center",
          gap: "20px", flexWrap: "wrap",
        }}>
          {slide.meta.map((m, i) => (
            <span key={i} style={{
              fontFamily: "var(--font-mono)",
              fontSize: "9px", letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
            }}>{m}</span>
          ))}
        </div>
      </div>

      {/* CTA */}
      <Link
        href={slide.ctaHref}
        style={{
          position: "absolute",
          bottom: "36px", right: "36px",
          zIndex: 11,
          display: "inline-flex", alignItems: "center",
          fontFamily: "var(--font-mono)",
          fontSize: "10px", letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--bg-primary)",
          background: "var(--gold)",
          padding: "10px 24px",
          borderRadius: "6px",
          textDecoration: "none",
          opacity: textVisible ? 1 : 0,
          transition: "opacity 0.45s ease",
        }}
      >
        {slide.ctaLabel}
      </Link>

      {/* Left arrow */}
      <button
        onClick={() => { prev(); resetTimer(); }}
        className="hero-arrow hero-arrow-left"
        aria-label="Previous"
        style={{
          position: "absolute", left: "24px",
          top: "50%", transform: "translateY(-50%)",
          background: "none", border: "none",
          padding: "10px", cursor: "pointer",
          opacity: 0, transition: "opacity 0.3s ease",
          zIndex: 10,
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24"
          fill="none" className="corner-mark">
          <polyline points="14,4 6,12 14,20"
            stroke="#A1A1AA" strokeWidth="1"
            fill="none" strokeLinecap="square" />
          <line x1="6" y1="12" x2="20" y2="12"
            stroke="#A1A1AA" strokeWidth="1"
            strokeLinecap="square" />
        </svg>
      </button>

      {/* Right arrow */}
      <button
        onClick={() => { next(); resetTimer(); }}
        className="hero-arrow hero-arrow-right"
        aria-label="Next"
        style={{
          position: "absolute", right: "24px",
          top: "50%", transform: "translateY(-50%)",
          background: "none", border: "none",
          padding: "10px", cursor: "pointer",
          opacity: 0, transition: "opacity 0.3s ease",
          zIndex: 10,
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24"
          fill="none" className="corner-mark">
          <polyline points="10,4 18,12 10,20"
            stroke="#A1A1AA" strokeWidth="1"
            fill="none" strokeLinecap="square" />
          <line x1="18" y1="12" x2="4" y2="12"
            stroke="#A1A1AA" strokeWidth="1"
            strokeLinecap="square" />
        </svg>
      </button>

      {/* Dots */}
      <div style={{
        position: "absolute", bottom: "10px", right: "36px",
        display: "flex", gap: "5px", zIndex: 12,
      }}>
        {slides.map((_, i) => (
          <div
            key={i}
            onClick={() => { goTo(i); resetTimer(); }}
            style={{
              height: "2px",
              width: i === cur ? "32px" : "18px",
              background: i === cur
                ? "var(--gold)"
                : "rgba(255,255,255,0.15)",
              cursor: "pointer",
              transition: "all 0.4s ease",
              borderRadius: "1px",
            }}
          />
        ))}
      </div>
    </section>
  );
}
