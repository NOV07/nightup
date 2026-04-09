import { Metadata } from "next";
import RadioClient from "./RadioClient";
import { radioStations, tracklist } from "../lib/data";

export const metadata: Metadata = { title: "Radio" };

export default function RadioPage() {
  return <RadioClient stations={radioStations} tracklist={tracklist} />;
}
