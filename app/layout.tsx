import type { Metadata } from "next";
import { Geist, Spectral, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { RadioProvider } from "./components/RadioContext";
import { TonightProvider } from "./components/TonightContext";
import { LanguageProvider } from "./components/LanguageContext";
import { PlayerProvider } from "./components/PlayerContext";
import LayoutShell from "./components/LayoutShell";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

const spectral = Spectral({
  weight: ["400", "600"],
  style: ["normal", "italic"],
  subsets: ["latin", "latin-ext"],
  variable: "--font-spectral",
});

const inter = Inter({
  weight: ["400", "500", "600"],
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  weight: ["400"],
  subsets: ["latin"],
  variable: "--font-jetbrains",
});

const OG_IMAGE = "https://nightup.gr/og-image.png";

export const metadata: Metadata = {
  title: { default: "Nightup.gr – Find Your Night", template: "%s | Nightup.gr" },
  description: "Greece's #1 nightlife and events discovery platform. Find events, venues, DJs, and everything you need for an unforgettable night out.",
  keywords: ["nightlife", "events", "Greece", "Athens", "parties", "clubs", "DJs", "Thessaloniki"],
  robots: { index: true, follow: true },
  openGraph: {
    siteName: "Nightup.gr",
    locale: "el_GR",
    type: "website",
    title: "Nightup.gr – Find Your Night",
    description: "Greece's #1 nightlife and events discovery platform. Find events, venues, DJs, and everything you need for an unforgettable night out.",
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: "Nightup.gr" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Nightup.gr – Find Your Night",
    description: "Greece's #1 nightlife and events discovery platform.",
    images: [OG_IMAGE],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="el" className={`${geist.variable} ${spectral.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen flex flex-col" style={{ backgroundColor: "#0F0F1A", color: "#fff" }}>
        <LanguageProvider>
          <RadioProvider>
            <TonightProvider>
              <PlayerProvider>
                <LayoutShell>
                  {children}
                </LayoutShell>
              </PlayerProvider>
            </TonightProvider>
          </RadioProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
