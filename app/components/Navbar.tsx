"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "./LanguageContext";
import { createBrowserClient } from '@supabase/ssr'
import AuthModal from '../../components/auth/AuthModal'
import SignOutButton from '../../components/auth/SignOutButton'
import NavSearch from "./NavSearch"
import SearchBar, { type SearchTab } from "../../components/SearchBar"
import { useTonightModal } from "./TonightContext"
import NotificationBell from "../../components/ui/NotificationBell"

function NightwavesIcon() {
  return (
    <svg width="14" height="10" viewBox="0 0 16 12" fill="none" aria-hidden="true"
      style={{ display: "inline", verticalAlign: "middle" }}>
      <path d="M0 6h1.5M1.5 6V3M1.5 3V6M3 6V1M3 1V6M4.5 6V4M4.5 4V6M6 6V2M6 2V6M7.5 6V0M7.5 0V6M9 6V2M9 2V6M10.5 6V4M10.5 4V6M12 6V1M12 1V6M13.5 6V3M13.5 3V6M15 6h1"
        stroke="#E8A020" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}

const links = [
  { href: "/",          label: "Home" },
  { href: "/events",    label: "Events" },
  { href: "/network",   label: "Network" },
  { href: "/spots",     label: "Spots" },
  { href: "/nightwaves",label: "Nightwaves", icon: <NightwavesIcon /> },
  { href: "/magazine",  label: "Magazine" },
  { href: "/about",     label: "About" },
];

function LangToggle({ compact = false }: { compact?: boolean }) {
  const { lang, toggleLang } = useLanguage();
  return (
    <button
      onClick={toggleLang}
      title={lang === "el" ? "Switch to English" : "Αλλαγή σε Ελληνικά"}
      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold transition-all hover:opacity-80 flex-shrink-0"
      style={{ backgroundColor: "#1A1A2E", border: "1px solid rgba(255,255,255,0.08)", color: "#E8A020", borderRadius: "6px" }}
    >
      <span>{lang === "el" ? "🇬🇷" : "🇬🇧"}</span>
      {!compact && <span>{lang === "el" ? "ΕΛ" : "EN"}</span>}
    </button>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const { open: openTonight } = useTonightModal();
  const [open, setOpen] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTab, setSearchTab] = useState<SearchTab>("search");

  const handleTabClick = useCallback((tab: SearchTab) => {
    if (searchOpen && searchTab === tab) {
      setSearchOpen(false);
    } else {
      setSearchTab(tab);
      setSearchOpen(true);
    }
  }, [searchOpen, searchTab]);

  const handleSearchClose = useCallback(() => setSearchOpen(false), []);

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Get initial user
    supabase.auth.getUser().then(({ data }) => setUser(data.user))

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <>
      <header
        className="sticky top-0 z-40 border-b"
        style={{
          backgroundColor: "rgba(10,10,18,0.85)",
          borderColor: "rgba(255,255,255,0.05)",
          backdropFilter: "blur(20px) saturate(160%)",
          WebkitBackdropFilter: "blur(20px) saturate(160%)",
        }}
      >
        {/* Mobile */}
        <div className="flex md:hidden items-center justify-between h-14 px-4">
          <Link href="/" className="flex items-baseline gap-0.5 select-none" onClick={() => setOpen(false)}>
            <span className="font-thin tracking-[0.2em] text-xl uppercase text-white">Night</span>
            <span className="font-thin tracking-[0.2em] text-xl uppercase" style={{ color: "#E8A020" }}>up</span>
          </Link>
          <div className="flex items-center gap-2">
            <LangToggle compact />
            {user && <NotificationBell />}
            <button
              onClick={() => { handleTabClick("search"); setOpen(false); }}
              className="p-2 rounded-lg transition-colors"
              style={{ color: searchOpen ? "#E8A020" : "#666" }}
              aria-label="Search"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round">
                <circle cx="11" cy="11" r="7" />
                <line x1="16.5" y1="16.5" x2="21" y2="21" />
              </svg>
            </button>
            <button
              onClick={() => setOpen((o) => !o)}
              className="p-2 rounded-lg transition-colors"
              style={{ color: open ? "#E8A020" : "#666" }}
              aria-label={open ? "Close menu" : "Open menu"}
            >
              {open ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Desktop */}
        <div className="hidden md:flex max-w-7xl mx-auto px-6 items-center justify-between h-[60px]">
          <Link href="/" className="flex items-baseline gap-0.5 select-none group">
            <span className="font-thin tracking-[0.2em] text-xl uppercase text-white group-hover:text-gray-100 transition-colors">Night</span>
            <span className="font-thin tracking-[0.2em] text-xl uppercase transition-colors" style={{ color: "#E8A020" }}>up</span>
          </Link>

          <div className="nav-search-wrapper">
            <NavSearch activeTab={searchOpen ? searchTab : null} onTabClick={handleTabClick} />
          </div>

          <nav className="flex items-center gap-1 nav-desktop-links">
            {links.map((l) => {
              const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className="nav-link relative flex items-center gap-1.5 text-sm px-3 py-2 transition-all"
                  style={{
                    color: active ? "#E8A020" : "rgba(255,255,255,0.5)",
                    backgroundColor: active ? "rgba(232,160,32,0.07)" : "transparent",
                    borderRadius: "6px",
                  }}
                >
                  {(l as any).icon}
                  {l.label}
                  {active && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                      style={{ backgroundColor: "#E8A020" }} />
                  )}
                </Link>
              );
            })}
            <div className="ml-2 nav-lang-toggle">
              <LangToggle />
            </div>
            {user ? (
              <div className="flex items-center gap-2 ml-2">
                <NotificationBell />
                <Link href="/dashboard" className="text-xs px-3 py-2 rounded-lg transition" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Dashboard
                </Link>
                <SignOutButton className="px-4 py-1.5 border border-[var(--gold)] text-[var(--gold)] text-[13px] uppercase tracking-[0.08em] transition hover:bg-[var(--gold)] hover:text-[var(--bg-primary)]" />
              </div>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                className="ml-2 transition"
                style={{ background: "transparent", border: "1px solid var(--gold)", color: "var(--gold)", borderRadius: "6px", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.08em", padding: "6px 16px" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--gold)"; e.currentTarget.style.color = "var(--bg-primary)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--gold)"; }}
              >
                Sign In
              </button>
            )}
          </nav>
        </div>
      </header>

      {/* Mobile slide-down */}
      {open && (
        <div
          className="fixed top-14 left-0 right-0 z-30 md:hidden border-b"
          style={{
            backgroundColor: "rgba(10,10,18,0.97)",
            borderColor: "rgba(255,255,255,0.05)",
            backdropFilter: "blur(20px)",
          }}
        >
          <nav className="px-3 py-3 flex flex-col gap-0.5">
            {links.map((l) => {
              const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 py-3 px-4 text-sm font-medium transition-colors"
                  style={{
                    color: active ? "#E8A020" : "rgba(255,255,255,0.6)",
                    backgroundColor: active ? "rgba(232,160,32,0.08)" : "transparent",
                  }}
                >
                  {(l as any).icon}
                  {l.label}
                </Link>
              );
            })}
            <button
              onClick={() => { openTonight(); setOpen(false); }}
              className="flex items-center gap-3 py-3 px-4 text-sm font-semibold w-full text-left"
              style={{ color: "#F5B335", backgroundColor: "rgba(232,160,32,0.06)" }}
            >
              <span>✦</span> Απόψε
            </button>
            <div className="px-4 py-3 border-t mt-1" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              <LangToggle />
            </div>
            <div className="px-4 pb-3">
              {user ? (
                <div className="flex gap-2">
                  <Link href="/dashboard" onClick={() => setOpen(false)} className="flex-1 text-center border border-white/20 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-white/5 transition">
                    Dashboard
                  </Link>
                  <SignOutButton className="flex-1 border border-[var(--gold)] text-[var(--gold)] text-[13px] uppercase tracking-[0.08em] py-2 transition hover:bg-[var(--gold)] hover:text-[var(--bg-primary)]" />
                </div>
              ) : (
                <button
                  onClick={() => { setShowAuth(true); setOpen(false) }}
                  className="w-full transition"
                  style={{ background: "transparent", border: "1px solid var(--gold)", color: "var(--gold)", borderRadius: "6px", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.08em", padding: "10px 16px" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--gold)"; e.currentTarget.style.color = "var(--bg-primary)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--gold)"; }}
                >
                  Sign In
                </button>
              )}
            </div>
          </nav>
        </div>
      )}

      <SearchBar
        open={searchOpen}
        activeTab={searchTab}
        onClose={handleSearchClose}
        onTabChange={(tab) => { setSearchTab(tab); setSearchOpen(true); }}
      />

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  );
}
