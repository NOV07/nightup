import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSupabase } from "../../lib/supabase";
import { createClient } from "../../lib/supabase-server";
import { SPOT_PAGE_COLS, mapSpotPage } from "../mapSpot";
import SpotProfileClient, { type SpotOwner } from "./SpotProfileClient";
import type { HostedEvent } from "../../../components/profile/HostedEventCard";
import type { ProfileListing } from "../../../components/profile/ProfileListings";
import { getAvatarCrop } from "../../lib/profileCrop";
import SpotViewTracker from "./SpotViewTracker";

export const revalidate = 300;

async function getSpot(slug: string) {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("spots").select(SPOT_PAGE_COLS)
      .eq("slug", slug).eq("is_published", true).single();
    if (error || !data) return null;
    return mapSpotPage(data);
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
    alternates: { canonical: `/spots/${slug}` },
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

  const supabase = await createClient();

  // What the owner publishes shows on this one page. Nothing to fetch for spots
  // without an owner account.
  let owner: SpotOwner | null = null;
  let events: HostedEvent[] = [];
  let listings: ProfileListing[] = [];
  if (spot.ownerId) {
    const today = new Date().toISOString().split("T")[0];
    const [{ data: ownerRow }, { data: ev }, { data: li }] = await Promise.all([
      supabase
        .from("profiles")
        .select("username, display_name, avatar_url, avatar_crop_x, avatar_crop_y, avatar_crop_width, avatar_crop_height")
        .eq("id", spot.ownerId)
        .maybeSingle(),
      supabase
        .from("events")
        .select("id, title, image_url, has_copyright_restriction, crop_x, crop_y, crop_width, crop_height, date, time, venue, city, ticket_url")
        .eq("profile_id", spot.ownerId)
        .eq("status", "approved")
        .gte("date", today)
        .order("date", { ascending: true })
        .order("time", { ascending: true })
        .limit(6),
      supabase
        .from("listings")
        .select("id, type, role, title, description, city")
        .eq("profile_id", spot.ownerId)
        .eq("is_active", true)
        .order("created_at", { ascending: false }),
    ]);
    if (ownerRow?.username) {
      // Same placeholder filter as the profile page.
      const avatar = ownerRow.avatar_url && !ownerRow.avatar_url.includes("pravatar") && !ownerRow.avatar_url.includes("picsum")
        ? ownerRow.avatar_url : null;
      owner = {
        id: spot.ownerId,
        username: ownerRow.username,
        avatarUrl: avatar,
        avatarCrop: avatar ? getAvatarCrop(ownerRow) : null,
      };
    }
    events = (ev ?? []) as HostedEvent[];
    listings = (li ?? []) as ProfileListing[];
  }

  return (
    <>
      <SpotViewTracker spotId={String(spot.id)} />
      <SpotProfileClient
        spot={spot as any}
        owner={owner}
        events={events}
        listings={listings}
      />
    </>
  );
}
