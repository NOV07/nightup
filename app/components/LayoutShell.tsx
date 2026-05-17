"use client";

import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import Chatbot from "./Chatbot";
import RadioStrip from "./RadioStrip";
import MusicPlayerBar from "./MusicPlayerBar";
import MobileNav from "./MobileNav";
import { Footer } from "@/components/layout/Footer";

// Routes that render full-screen with no nav/footer/players
const STANDALONE_ROUTES = ["/coming-soon"];

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isStandalone = STANDALONE_ROUTES.some((r) => pathname.startsWith(r));

  if (isStandalone) {
    return <>{children}</>;
  }

  return (
    <>
      <Navbar />
      <main className="flex-1 pb-4">{children}</main>
      <Footer />
      <Chatbot />
      <RadioStrip />
      <MusicPlayerBar />
      <MobileNav />
    </>
  );
}
