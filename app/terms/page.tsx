import { Metadata } from "next";
import LegalDocument from "../components/LegalDocument";
import en from "../legal-content/terms.en";
import el from "../legal-content/terms.el";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms and conditions for using Nightup.gr.",
  twitter: {
    card: "summary_large_image",
    title: "Terms of Service | Nightup.gr",
    description: "Terms and conditions for using Nightup.gr.",
    images: ["https://nightup.gr/og-image.png"],
  },
};

export default function TermsPage() {
  return <LegalDocument en={en} el={el} />;
}
