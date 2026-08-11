"use client";

import { useState } from "react";

const btnCls = "inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-all";
const btnStyle = { backgroundColor: "#111120", color: "#888", border: "1px solid #1e1e30" };
const activeStyle = { backgroundColor: "#E8A020", color: "#0F0F1A", border: "1px solid #E8A020" };

// Every button now shares the page URL alone, so no title/artist props: the
// WhatsApp link that used them is gone.
export default function SocialShare() {
  // Tracked separately so each button only ever reports its own click.
  const [copied, setCopied] = useState(false);
  const [igCopied, setIgCopied] = useState(false);

  const copy = (onDone: (v: boolean) => void) => {
    navigator.clipboard.writeText(window.location.href)
      .then(() => {
        onDone(true);
        setTimeout(() => onDone(false), 2000);
      })
      .catch(() => {});
  };

  // Instagram has no share URL to post to, so its button copies the link too —
  // see the hint that appears after the click.
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#444" }}>Share</span>

      <button
        onClick={() => copy(setCopied)}
        className={btnCls}
        style={copied ? activeStyle : btnStyle}
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        {copied ? "Copied!" : "Copy Link"}
      </button>

      <div className="relative">
        <button
          onClick={() => copy(setIgCopied)}
          className={btnCls}
          style={igCopied ? activeStyle : btnStyle}
        >
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
          </svg>
          Instagram
        </button>
        {igCopied && (
          <span
            role="status"
            className="absolute left-0 top-full mt-2 z-20 whitespace-nowrap text-xs px-3 py-1.5 rounded-lg"
            style={{ backgroundColor: "#1A1A2E", color: "#E8A020", border: "1px solid #E8A02040" }}
          >
            Link copied — paste it in your Instagram Story or DM
          </span>
        )}
      </div>
    </div>
  );
}
