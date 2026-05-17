import { Metadata } from "next";
import ApplyClient from "./ApplyClient";

export const metadata: Metadata = {
  title: "Become an Organizer — Nightup",
  description: "Apply to promote your events on Nightup. Reach thousands of nightlife enthusiasts across Greece.",
};

export default function ApplyPage() {
  return <ApplyClient />;
}
