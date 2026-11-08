import { Suspense } from "react";
import type { Metadata } from "next";
import MapClient from "./MapClient";
import { getMapPoints } from "./data";

// Revalidated at once by revalidatePublicPaths('spots' | 'wellness_spots') when
// the admin changes a row; this window is only the fallback.
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Χάρτης - Nightup",
  description: "Ο χάρτης της Nightup: spots και σημεία ευεξίας στην Αθήνα, με φίλτρα ανά κατηγορία.",
  alternates: { canonical: "/map" },
};

export default async function MapPage() {
  const points = await getMapPoints();
  return (
    <Suspense fallback={<div style={{ background: "#0F0F1A", minHeight: "60vh" }} />}>
      <MapClient points={points} />
    </Suspense>
  );
}
