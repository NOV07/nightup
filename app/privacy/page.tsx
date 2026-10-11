import { Metadata } from "next";
import LegalDocument from "../components/LegalDocument";
import en from "../legal-content/privacy.en";
import el from "../legal-content/privacy.el";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Nightup.gr collects and uses your data.",
  twitter: {
    card: "summary_large_image",
    title: "Privacy Policy | Nightup.gr",
    description: "How Nightup.gr collects and uses your data.",
    images: ["https://nightup.gr/og-image.png"],
  },
};

export default function PrivacyPage() {
  return <LegalDocument en={en} el={el} />;
}
