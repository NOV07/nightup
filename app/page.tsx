import Link from "next/link";
import Image from "next/image";
import { events, articles, radioStations } from "./lib/data";
import EventCard from "./components/EventCard";
import HeroSearch from "./components/HeroSearch";
import HomeMiniRadio from "./components/HomeMiniRadio";

export default function HomePage() {
  const featuredEvents = events.slice(0, 4);
  const latestArticles = articles.slice(0, 3);

  return (
    <div>
      {/* Hero */}
      <section
        className="relative min-h-[70vh] flex flex-col items-center justify-center text-center px-4 overflow-hidden"
        style={{ background: "linear-gradient(180deg, #0F0F1A 0%, #1A1A2E 50%, #0F0F1A 100%)" }}
      >
        <div
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl pointer-events-none"
          style={{ backgroundColor: "#E8A020" }}
        />
        <div
          className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full opacity-5 blur-3xl pointer-events-none"
          style={{ backgroundColor: "#A020E8" }}
        />

        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="flex items-baseline justify-center gap-1 mb-2">
            <span className="font-thin tracking-[0.3em] text-5xl md:text-7xl uppercase text-white">Night</span>
            <span className="font-thin tracking-[0.3em] text-5xl md:text-7xl uppercase" style={{ color: "#E8A020" }}>up</span>
          </div>
          <p className="text-sm md:text-base tracking-[0.5em] uppercase text-gray-400 mb-8">find your night</p>
          <p className="text-lg md:text-xl text-gray-300 mb-10">
            Greece's #1 platform for events, parties, and nightlife. Athens to Mykonos — we've got your night covered.
          </p>
          <HeroSearch />
        </div>
      </section>

      {/* Live Radio */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex items-center gap-3 mb-6">
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: "#E8A020" }} />
          <h2 className="text-xs font-semibold tracking-widest uppercase" style={{ color: "#E8A020" }}>Live Radio</h2>
        </div>
        <HomeMiniRadio stations={radioStations} />
      </section>

      {/* Recommended Events */}
      <section className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Recommended Events</h2>
          <Link href="/events" className="text-sm transition-colors" style={{ color: "#E8A020" }}>
            View all →
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {featuredEvents.map((e) => (
            <EventCard key={e.id} {...e} />
          ))}
        </div>
      </section>

      {/* Latest Articles */}
      <section className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Latest Articles</h2>
          <Link href="/articles" className="text-sm transition-colors" style={{ color: "#E8A020" }}>
            View all →
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {latestArticles.map((a) => (
            <Link
              key={a.id}
              href={`/articles/${a.id}`}
              className="group block rounded-2xl overflow-hidden transition-transform hover:-translate-y-1"
              style={{ backgroundColor: "#1A1A2E" }}
            >
              <div className="relative h-44">
                <Image src={a.image} alt={a.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <span
                  className="absolute bottom-3 left-3 text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: "#E8A020", color: "#0F0F1A" }}
                >
                  {a.category}
                </span>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-sm mb-1 line-clamp-2">{a.title}</h3>
                <p className="text-xs text-gray-400">{a.readTime}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* New Releases */}
      <section className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-xl font-semibold">New Releases</h2>
          <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: "#E8A020", color: "#0F0F1A" }}>
            NEW
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {articles.slice(3, 7).map((a) => (
            <Link
              key={a.id}
              href={`/articles/${a.id}`}
              className="flex items-center gap-4 p-4 rounded-xl transition-colors hover:opacity-80"
              style={{ backgroundColor: "#1A1A2E" }}
            >
              <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                <Image src={a.image} alt={a.title} fill className="object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-semibold" style={{ color: "#E8A020" }}>
                  {a.category}
                </span>
                <h4 className="text-sm font-medium line-clamp-2 mt-0.5">{a.title}</h4>
                <p className="text-xs text-gray-500 mt-1">{a.readTime}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section
        className="mx-4 my-8 rounded-2xl p-8 md:p-12 text-center overflow-hidden relative"
        style={{ background: "linear-gradient(135deg, #1A1A2E, #16213E)" }}
      >
        <div
          className="absolute inset-0 opacity-10"
          style={{ background: "radial-gradient(circle at 50% 50%, #E8A020, transparent 60%)" }}
        />
        <div className="relative z-10">
          <h2 className="text-2xl md:text-3xl font-semibold mb-3">Planning a Party?</h2>
          <p className="text-gray-400 mb-6">
            Find venues, DJs, photographers, and everything else for your perfect event.
          </p>
          <Link
            href="/party"
            className="inline-block px-8 py-3 rounded-full font-semibold transition-transform hover:scale-105"
            style={{ backgroundColor: "#E8A020", color: "#0F0F1A" }}
          >
            Explore Professionals
          </Link>
        </div>
      </section>
    </div>
  );
}
