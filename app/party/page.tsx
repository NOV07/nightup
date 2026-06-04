import { Metadata } from "next";
import PartyClient from "./PartyClient";
import { getSupabase } from "../lib/supabase";

export const metadata: Metadata = {
  title: "Make Your Party",
  description: "Find venues, DJs, photographers, caterers, and everything you need to plan the perfect party in Greece.",
  twitter: {
    card: "summary_large_image",
    title: "Make Your Party | Nightup.gr",
    description: "Find venues, DJs, photographers, caterers, and everything you need to plan the perfect party in Greece.",
    images: ["https://nightup.gr/og-image.png"],
  },
};
export const dynamic = "force-dynamic";

export default async function PartyPage() {
  let professionalsData: any[] = [];

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("professionals")
    .select("id, name, image_url, category, availability, tags, gallery, city, description, featured")
    .eq("status", "approved")
    .order("featured", { ascending: false });

  if (!error && data) {
    professionalsData = data.map((p: any) => ({
      id: String(p.id),
      name: p.name,
      avatar: p.image_url ?? "",
      category: p.category,
      availability: p.availability ?? null,
      tags: (p.tags as string[]) ?? [],
      gallery: (p.gallery as string[]) ?? [],
      location: p.city ?? "",
      description: p.description ?? "",
      isFeatured: p.featured === true,
    }));
  }

  const professionals = professionalsData ?? []

  return <PartyClient professionals={professionals} />;
}
