"use client";

import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import Navbar from "./Navbar";
import Chatbot from "./Chatbot";
import RadioStrip from "./RadioStrip";
import MusicPlayerBar from "./MusicPlayerBar";
import { Footer } from "@/components/layout/Footer";
import TonightModal from "./TonightModal";
import TonightFAB from "./TonightFAB";
import { useTonightModal } from "./TonightContext";
import type { Spot } from "../spots/types";

const SPOT_COLS =
  "id, name, slug, category, subcategory, city, neighborhood, address, lat, lng, description, cover_image, price_level, rating, instagram, is_sponsored";

function mapSpot(s: any): Spot {
  return {
    id: String(s.id),
    name: s.name,
    slug: s.slug,
    category: s.category,
    subcategory: s.subcategory,
    city: s.city,
    neighborhood: s.neighborhood,
    address: s.address,
    lat: s.lat,
    lng: s.lng,
    description: s.description,
    coverImage: s.cover_image,
    priceLevel: s.price_level,
    rating: s.rating,
    instagram: s.instagram,
    isSponsored: s.is_sponsored === true,
  };
}

// Routes that render full-screen with no nav/footer/players
const STANDALONE_ROUTES = ["/coming-soon"];

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isStandalone = STANDALONE_ROUTES.some((r) => pathname.startsWith(r));
  const { isOpen, open, close } = useTonightModal();
  const [spots, setSpots] = useState<Spot[]>([]);

  // Fetch spots once on mount for TonightModal
  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    supabase
      .from("spots")
      .select(SPOT_COLS)
      .eq("is_published", true)
      .order("is_sponsored", { ascending: false })
      .order("rating", { ascending: false })
      .then(({ data }) => { if (data) setSpots(data.map(mapSpot)); });
  }, []);

  // Auto-open on every visit
  useEffect(() => {
    open();
  }, []);

  if (isStandalone) {
    return <>{children}</>;
  }

  return (
    <>
      <Navbar />
      <main className="tonight-blurable flex-1 pb-4">{children}</main>
      <Footer />
      <Chatbot />
      <RadioStrip />
      <MusicPlayerBar />
      <TonightFAB />
      <TonightModal open={isOpen} onClose={close} spots={spots} />
    </>
  );
}
