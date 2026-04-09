import { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { professionals } from "../../lib/data";
import ContactModal from "./ContactModal";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const pro = professionals.find((p) => p.id === id);
  if (!pro) return { title: "Professional not found" };
  return { title: pro.name };
}

function StarRating({ stars }: { stars: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} className="w-4 h-4" fill={i <= Math.round(stars) ? "#E8A020" : "#333"} viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

export default async function ProfessionalPage({ params }: Props) {
  const { id } = await params;
  const pro = professionals.find((p) => p.id === id);
  if (!pro) notFound();

  const related = professionals.filter((p) => p.id !== id && p.category === pro.category).slice(0, 4);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Back */}
      <Link href="/party" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-8 transition-colors">
        ← Back to Party
      </Link>

      <div className="grid md:grid-cols-3 gap-10">
        {/* Left: Profile */}
        <div className="md:col-span-1">
          <div className="sticky top-24">
            {/* Avatar */}
            <div className="relative w-32 h-32 mx-auto md:mx-0 rounded-full overflow-hidden mb-4" style={{ boxShadow: "0 0 0 4px #E8A020" }}>
              <Image src={pro.avatar} alt={pro.name} fill className="object-cover" />
            </div>

            <h1 className="text-2xl font-bold mb-1">{pro.name}</h1>
            <p className="text-sm mb-2" style={{ color: "#E8A020" }}>{pro.category}</p>

            <div className="flex items-center gap-2 mb-2">
              <StarRating stars={pro.stars} />
              <span className="text-sm text-gray-400">{pro.stars} ({pro.reviewCount} reviews)</span>
            </div>

            <p className="text-sm text-gray-400 mb-6">📍 {pro.location}</p>

            <ContactModal name={pro.name} phone={pro.contact} email={pro.email} />
          </div>
        </div>

        {/* Right: Details */}
        <div className="md:col-span-2 space-y-8">
          {/* Description */}
          <div>
            <h2 className="text-xl font-semibold mb-3">About</h2>
            <p className="text-gray-300 leading-relaxed">{pro.description}</p>
          </div>

          {/* Photo Gallery */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Gallery</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {pro.photos.map((photo, i) => (
                <div key={i} className="relative aspect-[4/3] rounded-xl overflow-hidden">
                  <Image src={photo} alt={`Gallery ${i + 1}`} fill className="object-cover hover:scale-105 transition-transform duration-300" />
                </div>
              ))}
            </div>
          </div>

          {/* Reviews */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Reviews</h2>
            <div className="space-y-4">
              {pro.reviews.map((review, i) => (
                <div key={i} className="p-4 rounded-xl" style={{ backgroundColor: "#1A1A2E" }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-sm">{review.name}</p>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <svg key={s} className="w-3 h-3" fill={s <= review.rating ? "#E8A020" : "#333"} viewBox="0 0 24 24">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-gray-400">{review.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Related */}
      {related.length > 0 && (
        <div className="mt-16">
          <h2 className="text-xl font-semibold mb-6">Similar Professionals</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {related.map((p) => (
              <Link
                key={p.id}
                href={`/party/${p.id}`}
                className="block rounded-xl overflow-hidden transition-transform hover:-translate-y-1"
                style={{ backgroundColor: "#1A1A2E" }}
              >
                <div className="relative h-28">
                  <Image src={p.avatar} alt={p.name} fill className="object-cover" />
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  <p className="text-xs text-gray-400">{p.location}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
