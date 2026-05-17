import { Metadata } from "next";
import RadioClient from "./RadioClient";

export const metadata: Metadata = {
  title: "Radio",
  description: "Listen to Nightup Radio — live synced streams of House, Techno, R&B, and Greek music. All users hear the same track at the same moment.",
};

export default function RadioPage() {
  return <RadioClient />;
}
