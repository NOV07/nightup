import { Metadata } from "next";
import RadioClient from "./RadioClient";

export const metadata: Metadata = {
  title: "Radio",
  description: "Listen to Nightup Radio — live synced streams of House, Techno, R&B, and Greek music. All users hear the same track at the same moment.",
  twitter: {
    card: "summary_large_image",
    title: "Radio | Nightup.gr",
    description: "Listen to Nightup Radio — live synced streams of House, Techno, R&B, and Greek music.",
    images: ["https://nightup.gr/og-image.png"],
  },
};

export default function RadioPage() {
  return <RadioClient />;
}
