import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSupabase } from "../../lib/supabase";
import type { Spot } from "../types";
import SpotProfileClient from "./SpotProfileClient";

export const dynamic = "force-dynamic";

const COLS =
  "id, name, slug, category, subcategory, city, neighborhood, address, lat, lng, description, cover_image, gallery, price_level, rating, phone, website, instagram, opening_hours, is_sponsored";

async function getSpot(slug: string): Promise<Spot | null> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("spots").select(COLS)
      .eq("slug", slug).eq("is_published", true).single();
    if (error || !data) return null;
    return {
      id: String(data.id), name: data.name, slug: data.slug,
      category: data.category, subcategory: data.subcategory,
      city: data.city, neighborhood: data.neighborhood, address: data.address,
      lat: data.lat, lng: data.lng, description: data.description,
      coverImage: data.cover_image, priceLevel: data.price_level,
      rating: data.rating, phone: data.phone, website: data.website,
      instagram: data.instagram, isSponsored: data.is_sponsored === true,
      gallery: Array.isArray(data.gallery) ? data.gallery : [],
      openingHours: data.opening_hours ?? null,
    } as Spot & { gallery: string[]; openingHours: any };
  } catch { return null; }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const spot = await getSpot(slug);
  if (!spot) return { title: "Spot" };
  const image = spot.coverImage ?? "https://nightup.gr/og-image.png";
  const description = spot.description ?? `${spot.name} στην ${spot.city}`;
  return {
    title: spot.name,
    description,
    openGraph: {
      title: spot.name,
      description,
      images: [{ url: image, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: spot.name,
      description,
      images: [image],
    },
  };
}

export default async function SpotProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const spot = await getSpot(slug);
  if (!spot) notFound();
  return <SpotProfileClient spot={spot as any} />;
}
