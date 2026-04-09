import { Metadata } from "next";
import { professionals } from "../lib/data";
import PartyClient from "./PartyClient";

export const metadata: Metadata = { title: "Make Your Party" };

export default function PartyPage() {
  return <PartyClient professionals={professionals} />;
}
