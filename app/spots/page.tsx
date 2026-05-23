import type { Metadata } from "next";
import { getAllSpots } from "./data";
import SpotsClient from "./SpotsClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Spots — Nightup",
  description: "Όλα τα spots της Αθήνας — φαγητό, ποτό, νύχτα, θέαμα και άλλα.",
};

export default async function SpotsPage() {
  const spots = await getAllSpots();
  return <SpotsClient spots={spots} />;
}
