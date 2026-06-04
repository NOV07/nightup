import { Metadata } from "next";
import ApplyClient from "./ApplyClient";

export const metadata: Metadata = {
  title: "Become an Organizer — Nightup",
  description: "Apply to promote your events on Nightup. Reach thousands of nightlife enthusiasts across Greece.",
  twitter: {
    card: "summary_large_image",
    title: "Become an Organizer | Nightup.gr",
    description: "Apply to promote your events on Nightup. Reach thousands of nightlife enthusiasts across Greece.",
    images: ["https://nightup.gr/og-image.png"],
  },
};

export default function ApplyPage() {
  return <ApplyClient />;
}
