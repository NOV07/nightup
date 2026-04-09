import { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { events } from "../../lib/data";
import EventInteraction from "./EventInteraction";
import EventCard from "../../components/EventCard";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const event = events.find((e) => e.id === id);
  if (!event) return { title: "Event not found" };
  return { title: event.title };
}

const genreColors: Record<string, string> = {
  Techno: "#E8A020", House: "#A020E8", "Deep House": "#2080E8",
  "Hip-Hop": "#E82060", "R&B": "#E86020", Latin: "#20E860",
  "Open Air": "#60E820", Afrobeats: "#E8A020", "Live Music": "#20E8A0",
};

export default async function EventPage({ params }: Props) {
  const { id } = await params;
  const event = events.find((e) => e.id === id);
  if (!event) notFound();

  const related = events.filter((e) => e.id !== id && (e.genre === event.genre || e.city === event.city)).slice(0, 4);
  const color = genreColors[event.genre] ?? "#E8A020";
  const formattedDate = new Date(event.date).toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div>
      {/* Hero Image */}
      <div className="relative h-64 md:h-96 w-full overflow-hidden">
        <Image src={event.image} alt={event.title} fill className="object-cover" priority />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 30%, #0F0F1A 100%)" }} />
        <div className="absolute bottom-6 left-6">
          <span
            className="text-xs font-semibold px-3 py-1 rounded-full"
            style={{ backgroundColor: color, color: "#0F0F1A" }}
          >
            {event.genre}
          </span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 -mt-4">
        {/* Title & Info */}
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <h1 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">{event.title}</h1>

            {/* Event Meta */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {[
                { icon: "📅", label: "Date", value: formattedDate },
                { icon: "🕐", label: "Time", value: event.time },
                { icon: "📍", label: "Venue", value: event.venue },
                { icon: "🌆", label: "City", value: event.city },
              ].map(({ icon, label, value }) => (
                <div key={label} className="flex items-start gap-3 p-3 rounded-xl" style={{ backgroundColor: "#1A1A2E" }}>
                  <span className="text-lg">{icon}</span>
                  <div>
                    <p className="text-xs text-gray-400">{label}</p>
                    <p className="text-sm font-medium">{value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* About */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-3">About</h2>
              <p className="text-gray-300 leading-relaxed">{event.about}</p>
            </div>

            {/* Lineup */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4">Lineup</h2>
              <div className="flex flex-wrap gap-2">
                {event.lineup.map((artist) => (
                  <span
                    key={artist}
                    className="px-4 py-2 rounded-full text-sm font-medium"
                    style={{ backgroundColor: "#1A1A2E", border: `1px solid ${color}`, color }}
                  >
                    {artist}
                  </span>
                ))}
              </div>
            </div>

            {/* Share */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-3">Share</h2>
              <div className="flex flex-wrap gap-3">
                {["Twitter", "Facebook", "WhatsApp", "Copy link"].map((s) => (
                  <button
                    key={s}
                    className="px-4 py-2 rounded-lg text-xs font-medium transition-colors"
                    style={{ backgroundColor: "#1A1A2E", border: "1px solid #333", color: "#aaa" }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="md:col-span-1">
            <div className="sticky top-20 space-y-4">
              {/* Price & Ticket */}
              <div className="p-6 rounded-2xl" style={{ backgroundColor: "#1A1A2E", border: "1px solid #333" }}>
                <p className="text-xs text-gray-400 mb-1">Price from</p>
                <p className="text-3xl font-bold mb-4" style={{ color: "#E8A020" }}>{event.price}</p>
                <a
                  href={event.ticketUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center py-3 rounded-xl font-semibold transition-opacity hover:opacity-90"
                  style={{ backgroundColor: "#E8A020", color: "#0F0F1A" }}
                >
                  Get Tickets
                </a>
              </div>

              {/* Interested / Going */}
              <EventInteraction
                interestedCount={event.interestedCount}
                goingCount={event.goingCount}
              />
            </div>
          </div>
        </div>

        {/* Related Events */}
        {related.length > 0 && (
          <div className="py-12">
            <h2 className="text-xl font-semibold mb-6">Related Events</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {related.map((e) => (
                <EventCard key={e.id} {...e} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
