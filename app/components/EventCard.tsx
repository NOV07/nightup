import Link from "next/link";
import Image from "next/image";

interface EventCardProps {
  id: string;
  title: string;
  image: string;
  genre: string;
  price: string;
  date: string;
  venue: string;
  city: string;
  interestedCount: number;
  goingCount: number;
}

const genreColors: Record<string, string> = {
  Techno: "#E8A020",
  House: "#A020E8",
  "Deep House": "#2080E8",
  "Hip-Hop": "#E82060",
  "R&B": "#E86020",
  Latin: "#20E860",
  "Open Air": "#60E820",
  Afrobeats: "#E8A020",
  "Live Music": "#20E8A0",
};

export default function EventCard({
  id, title, image, genre, price, date, venue, city, interestedCount, goingCount,
}: EventCardProps) {
  const color = genreColors[genre] ?? "#E8A020";
  const formattedDate = new Date(date).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });

  return (
    <Link href={`/events/${id}`} className="group block rounded-2xl overflow-hidden transition-transform hover:-translate-y-1" style={{ backgroundColor: "#1A1A2E" }}>
      {/* Image */}
      <div className="relative h-48 overflow-hidden">
        <Image src={image} alt={title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        {/* Genre pill */}
        <span className="absolute top-3 left-3 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: color, color: "#0F0F1A" }}>
          {genre}
        </span>
        {/* Price */}
        <span className="absolute top-3 right-3 text-xs font-bold px-2 py-0.5 rounded-full bg-black/70 text-white">
          {price}
        </span>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-base mb-1 line-clamp-2 leading-snug">{title}</h3>
        <p className="text-xs mb-1" style={{ color: "#E8A020" }}>{formattedDate}</p>
        <p className="text-xs text-gray-400 mb-3">{venue} · {city}</p>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            {interestedCount.toLocaleString()} interested
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {goingCount.toLocaleString()} going
          </span>
        </div>
      </div>
    </Link>
  );
}
