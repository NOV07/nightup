import { Metadata } from "next";
import LegalDocument from "../components/LegalDocument";
import en from "../legal-content/cookies.en";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: "How Nightup.gr uses cookies.",
  twitter: {
    card: "summary_large_image",
    title: "Cookie Policy | Nightup.gr",
    description: "How Nightup.gr uses cookies.",
    images: ["https://nightup.gr/og-image.png"],
  },
};

export default function CookiesPage() {
  return <LegalDocument en={en} />;
}
