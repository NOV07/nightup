import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { articles } from "../lib/data";
import ArticlesClient from "./ArticlesClient";

export const metadata: Metadata = { title: "Articles" };

export default function ArticlesPage() {
  const featured = articles.find((a) => a.featured) ?? articles[0];

  return (
    <div>
      {/* Page Header */}
      <div className="max-w-7xl mx-auto px-4 pt-8 pb-4">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">The Nightup Journal.</h1>
        <p className="text-gray-400">Read between the sets.</p>
      </div>

      {/* Featured Hero */}
      <div className="relative h-64 md:h-80 w-full overflow-hidden">
        <Image src={featured.image} alt={featured.title} fill className="object-cover" priority />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 20%, #0F0F1A 100%)" }} />
        <div className="absolute bottom-8 left-0 right-0 max-w-4xl mx-auto px-4">
          <span
            className="inline-block text-xs font-semibold px-3 py-1 rounded-full mb-3"
            style={{ backgroundColor: "#E8A020", color: "#0F0F1A" }}
          >
            {featured.category}
          </span>
          <h2 className="text-xl md:text-3xl font-bold mb-2 leading-tight">{featured.title}</h2>
          <div className="flex items-center gap-3 text-sm text-gray-400">
            <span>{new Date(featured.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</span>
            <span>·</span>
            <span>{featured.readTime}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-4 pb-8">
        <div className="mb-4 flex justify-end">
          <Link
            href={`/articles/${featured.id}`}
            className="inline-block px-5 py-2 rounded-full text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#E8A020", color: "#0F0F1A" }}
          >
            Read Article →
          </Link>
        </div>
        <ArticlesClient articles={articles} />
      </div>
    </div>
  );
}
