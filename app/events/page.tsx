import { Metadata } from "next";
import { Suspense } from "react";
import { events } from "../lib/data";
import EventsClient from "./EventsClient";

export const metadata: Metadata = { title: "Events" };

export default function EventsPage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-8 text-gray-400">Loading events...</div>}>
      <EventsClient events={events} />
    </Suspense>
  );
}
