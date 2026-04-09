import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { RadioProvider } from "./components/RadioContext";
import MiniPlayer from "./components/MiniPlayer";
import MobileNav from "./components/MobileNav";
import Chatbot from "./components/Chatbot";
import Navbar from "./components/Navbar";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: { default: "Nightup.gr – Find Your Night", template: "%s | Nightup.gr" },
  description: "Greece's #1 party and events discovery platform. Find events, venues, DJs, and everything you need for an unforgettable night.",
  keywords: ["nightlife", "events", "Greece", "Athens", "parties", "clubs", "DJs"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="el" className={geist.variable}>
      <body className="min-h-screen flex flex-col" style={{ backgroundColor: "#0F0F1A", color: "#fff" }}>
        <RadioProvider>
          <Navbar />
          <main className="flex-1 pb-28 md:pb-14">{children}</main>
          <Footer />
          <MiniPlayer />
          <MobileNav />
          <Chatbot />
        </RadioProvider>
      </body>
    </html>
  );
}

function Footer() {
  return (
    <footer className="border-t pb-28 md:pb-14" style={{ borderColor: "#1A1A2E", backgroundColor: "#0A0A14" }}>
      <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
        <div className="col-span-2 md:col-span-1">
          <div className="flex items-baseline gap-0.5 mb-3">
            <span className="font-thin tracking-[0.2em] text-xl uppercase">Night</span>
            <span className="font-thin tracking-[0.2em] text-xl uppercase" style={{ color: "#E8A020" }}>up</span>
          </div>
          <p className="text-sm text-gray-400 mb-4">find your night</p>
          <p className="text-xs text-gray-600">Greece's #1 party and events discovery platform.</p>
        </div>

        <div>
          <h4 className="text-xs font-semibold tracking-widest uppercase text-gray-400 mb-4">Discover</h4>
          <ul className="space-y-2 text-sm text-gray-500">
            {[["Events", "/events"], ["Radio", "/radio"], ["Articles", "/articles"]].map(([l, h]) => (
              <li key={h}><a href={h} className="hover:text-white transition-colors">{l}</a></li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-semibold tracking-widest uppercase text-gray-400 mb-4">Party</h4>
          <ul className="space-y-2 text-sm text-gray-500">
            {[["Make Your Party", "/party"], ["Find Venues", "/party"], ["Find Artists", "/party"]].map(([l, h]) => (
              <li key={l}><a href={h} className="hover:text-white transition-colors">{l}</a></li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-semibold tracking-widest uppercase text-gray-400 mb-4">Company</h4>
          <ul className="space-y-2 text-sm text-gray-500">
            {[["About", "/about"], ["Contact", "/about"], ["Submit Event", "/about"]].map(([l, h]) => (
              <li key={l}><a href={h} className="hover:text-white transition-colors">{l}</a></li>
            ))}
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-6 border-t flex flex-col md:flex-row items-center justify-between gap-2" style={{ borderColor: "#1A1A2E" }}>
        <p className="text-xs text-gray-600">© 2026 Nightup.gr. All rights reserved.</p>
        <div className="flex gap-4 text-xs text-gray-600">
          <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
        </div>
      </div>
    </footer>
  );
}
