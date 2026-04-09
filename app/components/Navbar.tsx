"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const links = [
  { href: "/", label: "Home" },
  { href: "/events", label: "Events" },
  { href: "/party", label: "Make Your Party" },
  { href: "/radio", label: "Radio" },
  { href: "/articles", label: "Articles" },
  { href: "/about", label: "About" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <header
        className="sticky top-0 z-40 border-b"
        style={{ backgroundColor: "rgba(15,15,26,0.95)", borderColor: "#1A1A2E", backdropFilter: "blur(12px)" }}
      >
        {/* Mobile header */}
        <div className="flex md:hidden items-center justify-between h-14 px-4">
          <Link href="/" className="flex items-baseline gap-0.5 select-none" onClick={() => setOpen(false)}>
            <span className="font-thin tracking-[0.2em] text-xl uppercase text-white">Night</span>
            <span className="font-thin tracking-[0.2em] text-xl uppercase" style={{ color: "#E8A020" }}>up</span>
          </Link>
          <button
            onClick={() => setOpen((o) => !o)}
            className="p-2 text-gray-400 hover:text-white transition-colors"
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Desktop header */}
        <div className="hidden md:flex max-w-7xl mx-auto px-6 items-center justify-between h-16">
          <Link href="/" className="flex items-baseline gap-0.5 select-none">
            <span className="font-thin tracking-[0.2em] text-xl uppercase text-white">Night</span>
            <span className="font-thin tracking-[0.2em] text-xl uppercase" style={{ color: "#E8A020" }}>up</span>
            <span className="ml-3 text-xs tracking-widest text-gray-500 uppercase hidden lg:block">find your night</span>
          </Link>

          <nav className="flex items-center gap-6">
            {links.map((l) => {
              const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className="text-sm tracking-wide transition-colors"
                  style={{ color: active ? "#E8A020" : "#aaa" }}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Mobile slide-down menu */}
      {open && (
        <div
          className="fixed top-14 left-0 right-0 z-30 md:hidden border-b"
          style={{ backgroundColor: "#0F0F1A", borderColor: "#1A1A2E" }}
        >
          <nav className="px-4 py-3 flex flex-col gap-1">
            {links.map((l) => {
              const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="py-3 px-4 rounded-lg text-base font-medium transition-colors"
                  style={{
                    color: active ? "#E8A020" : "#ccc",
                    backgroundColor: active ? "rgba(232,160,32,0.1)" : "transparent",
                  }}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </>
  );
}
