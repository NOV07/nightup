"use client";

import { useState } from "react";

const FALLBACK_BG = "#0F0F1A";

export default function ComingSoonPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;

    // Client-side email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/coming-soon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      if (res.ok) {
        setStatus("success");
      } else {
        setStatus("error");
        setErrorMsg("Something went wrong. Please try again.");
      }
    } catch {
      setStatus("error");
      setErrorMsg("Something went wrong. Please try again.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center px-6 text-center overflow-hidden"
      style={{ backgroundColor: FALLBACK_BG }}
    >
      {/* Ambient glow */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(232,160,32,0.07) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 max-w-md w-full">
        {/* Logo */}
        <div className="flex items-baseline justify-center gap-1 mb-2">
          <span className="font-thin tracking-[0.35em] text-6xl uppercase text-white">Night</span>
          <span className="font-thin tracking-[0.35em] text-6xl uppercase" style={{ color: "#E8A020" }}>up</span>
        </div>

        {/* Tagline */}
        <p className="text-xs tracking-[0.6em] uppercase mb-14" style={{ color: "#E8A020" }}>
          find your night
        </p>

        {/* Headline */}
        <h1 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">Έρχεται σύντομα.</h1>
        <p className="text-gray-400 mb-10 leading-relaxed text-sm md:text-base">
          Greece's nightlife is about to go digital. Events, radio, party planning — all in one place.
          Be the first to know when we launch.
        </p>

        {/* Email signup */}
        {status === "success" ? (
          <div
            className="py-4 px-6 rounded-2xl text-sm font-semibold"
            style={{ backgroundColor: "rgba(232,160,32,0.12)", border: "1px solid #E8A020", color: "#E8A020" }}
          >
            You&apos;re on the list. We&apos;ll be in touch soon. 🌙
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              required
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={254}
              disabled={status === "loading"}
              className="flex-1 px-4 py-3 rounded-xl text-sm focus-gold"
              style={{
                backgroundColor: "#1A1A2E",
                color: "#fff",
                border: "1px solid #333",
                outline: "none",
              }}
              aria-label="Email address"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="px-6 py-3 rounded-xl font-semibold text-sm whitespace-nowrap hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: "#E8A020", color: "#0F0F1A" }}
            >
              {status === "loading" ? "Saving…" : "Get Early Access"}
            </button>
          </form>
        )}

        {errorMsg && (
          <p className="mt-3 text-xs text-red-400">{errorMsg}</p>
        )}

        {/* Divider */}
        <div className="flex items-center gap-4 my-10">
          <div className="flex-1 border-t" style={{ borderColor: "#1A1A2E" }} />
          <span className="text-xs text-gray-600 uppercase tracking-widest">Follow us</span>
          <div className="flex-1 border-t" style={{ borderColor: "#1A1A2E" }} />
        </div>

        {/* Social links */}
        <div className="flex items-center justify-center gap-8">
          <a
            href="https://instagram.com/nightup.gr"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-2 text-gray-500 hover:text-white group"
            aria-label="Follow us on Instagram"
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: "#1A1A2E", border: "1px solid #333" }}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            </div>
            <span className="text-xs">Instagram</span>
          </a>

          <a
            href="https://tiktok.com/@nightup.gr"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-2 text-gray-500 hover:text-white group"
            aria-label="Follow us on TikTok"
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: "#1A1A2E", border: "1px solid #333" }}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.93a8.16 8.16 0 004.77 1.52V7.01a4.85 4.85 0 01-1-.32z" />
              </svg>
            </div>
            <span className="text-xs">TikTok</span>
          </a>
        </div>

        <p className="text-xs mt-14" style={{ color: "#333" }}>© 2026 Nightup.gr · All rights reserved</p>
      </div>
    </div>
  );
}
