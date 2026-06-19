import Link from "next/link";
import { SocialIcon } from "@/components/icons/SocialIcon";

const SHORTCUTS = [
  { kbd: "DISCOVER", title: "Βρες events", desc: "Tonight, this week, by genre", href: "/events" },
  { kbd: "LISTEN", title: "Nightwaves", desc: "Μείγματα, κυκλοφορίες, ραδιόφωνο", href: "/nightwaves" },
  { kbd: "NETWORK", title: "Network", desc: "Χώροι, ήχος, στούντιο, παραγωγοί", href: "/network" },
  { kbd: "READ", title: "Magazine", desc: "Συνεντεύξεις, κριτικές, αφιερώματα", href: "/magazine" },
];

const SOCIALS = [
  { name: "Instagram", href: "https://instagram.com/nightup.gr", icon: "instagram" },
  { name: "TikTok", href: "https://tiktok.com/@nightup.gr", icon: "tiktok" },
  { name: "Facebook", href: "https://facebook.com/nightup.gr", icon: "facebook" },
  { name: "Threads", href: "https://threads.net/@nightup.gr", icon: "threads" },
  { name: "Discord", href: "https://discord.gg/nightup", icon: "discord" },
  { name: "Spotify", href: "https://open.spotify.com/user/nightup", icon: "spotify" },
  { name: "SoundCloud", href: "https://soundcloud.com/nightup", icon: "soundcloud" },
];

function FooterColumn({ label, links }: { label: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <div className="text-[11px] tracking-widest text-zinc-500 mb-2">{label}</div>
      <div className="flex flex-col gap-1.5">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="text-xs text-zinc-300 hover:text-amber-400 transition-colors"
          >
            {l.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="bg-[#0a0a14] text-zinc-200" style={{ paddingBottom: "calc(56px + env(safe-area-inset-bottom) + 16px)" }}>
      <div className="max-w-screen-2xl mx-auto px-6 lg:px-12 pt-12 pb-6 border-t border-white/5">

        {/* Top row: logo + tagline + socials */}
        <div className="flex flex-wrap justify-between items-end gap-4 mb-8">
          <div>
            <div className="flex items-baseline gap-0.5 select-none">
              <span className="font-thin tracking-[0.2em] text-xl uppercase text-white">Night</span>
              <span className="font-thin tracking-[0.2em] text-xl uppercase" style={{ color: "#E8A020" }}>up</span>
            </div>
            <p className="text-xs text-zinc-400 mt-2">Βρες τη βραδιά σου.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {SOCIALS.map((s) => (
              <Link
                key={s.name}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.name}
                className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <SocialIcon name={s.icon} className="w-4 h-4 text-zinc-300" />
              </Link>
            ))}
          </div>
        </div>

        {/* Shortcut cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {SHORTCUTS.map((s) => (
            <Link
              key={s.kbd}
              href={s.href}
              className="group bg-amber-500/5 border border-amber-500/20 hover:border-amber-500/40 hover:bg-amber-500/10 rounded-xl p-4 transition-all"
            >
              <div className="text-[11px] tracking-widest text-amber-400 mb-1">{s.kbd}</div>
              <div className="text-sm font-medium text-white mb-0.5">{s.title}</div>
              <div className="text-[11px] text-zinc-500">{s.desc}</div>
            </Link>
          ))}
        </div>

        {/* Lower meta row */}
        <div className="grid md:grid-cols-[1.5fr_1fr_1fr_1fr] gap-7 py-5 border-t border-white/5 border-b border-white/5">
          <div>
            <div className="text-[11px] tracking-widest text-zinc-500 mb-2">NEWSLETTER</div>
            {/* TODO: connect to newsletter API */}
            <form className="flex border border-white/15 rounded-md overflow-hidden" onSubmit={(e) => e.preventDefault()}>
              <input
                type="email"
                placeholder="your@email.com"
                className="flex-1 bg-transparent border-none px-3 py-2 text-xs text-white outline-none placeholder:text-zinc-500"
              />
              <button
                type="submit"
                className="bg-amber-500 hover:bg-amber-400 text-zinc-900 px-4 py-2 text-[11px] font-medium tracking-wider transition-colors"
              >
                JOIN
              </button>
            </form>
          </div>

          <FooterColumn label="SUBMIT" links={[
            { label: "Καταχώρηση event", href: "/submit/event" },
            { label: "Καταχώρηση προφίλ", href: "/submit/professional" },
            { label: "Καταχώρηση μουσικής", href: "/submit/release" },
          ]} />

          <FooterColumn label="COMPANY" links={[
            { label: "About", href: "/about" },
            { label: "Contact", href: "/about#contact" },
          ]} />

          <FooterColumn label="LEGAL" links={[
            { label: "Privacy", href: "/privacy" },
            { label: "Terms", href: "/terms" },
            { label: "Cookies", href: "/cookies" },
          ]} />
        </div>

        <div className="pt-4 text-[11px] text-zinc-500 text-center">
          © {new Date().getFullYear()} Nightup. Made for the nightlife.
        </div>
      </div>
    </footer>
  );
}
