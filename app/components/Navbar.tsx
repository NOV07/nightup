"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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

  return (
    <header
      className="sticky top-0 z-40 border-b hidden md:block"
      style={{ backgroundColor: "rgba(15,15,26,0.95)", borderColor: "#1A1A2E", backdropFilter: "blur(12px)" }}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
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
  );
}
