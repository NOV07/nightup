import { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { articles } from "../../lib/data";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const article = articles.find((a) => a.id === id);
  if (!article) return { title: "Article not found" };
  return { title: article.title };
}

function renderBody(text: string) {
  return text.split("\n\n").map((para, i) => {
    if (para.startsWith("**") && para.endsWith("**")) {
      return (
        <h3 key={i} className="text-xl font-bold mt-6 mb-2" style={{ color: "#E8A020" }}>
          {para.replace(/\*\*/g, "")}
        </h3>
      );
    }
    if (para.includes("**")) {
      const parts = para.split(/\*\*(.+?)\*\*/g);
      return (
        <p key={i} className="text-gray-300 leading-relaxed mb-4">
          {parts.map((part, j) =>
            j % 2 === 1 ? <strong key={j} style={{ color: "#E8A020" }}>{part}</strong> : part
          )}
        </p>
      );
    }
    return (
      <p key={i} className="text-gray-300 leading-relaxed mb-4">
        {para}
      </p>
    );
  });
}

export default async function ArticlePage({ params }: Props) {
  const { id } = await params;
  const article = articles.find((a) => a.id === id);
  if (!article) notFound();

  const related = articles.filter((a) => a.id !== id && a.category === article.category).slice(0, 3);

  const formattedDate = new Date(article.date).toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div>
      {/* Hero */}
      <div className="relative h-64 md:h-96 w-full overflow-hidden">
        <Image src={article.image} alt={article.title} fill className="object-cover" priority />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 30%, #0F0F1A 100%)" }} />
      </div>

      <div className="max-w-3xl mx-auto px-4">
        {/* Meta */}
        <div className="py-6">
          <Link href="/articles" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-6 transition-colors">
            ← All Articles
          </Link>
          <span
            className="inline-block text-xs font-semibold px-3 py-1 rounded-full mb-4"
            style={{ backgroundColor: "#E8A020", color: "#0F0F1A" }}
          >
            {article.category}
          </span>
          <h1 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">{article.title}</h1>
          <div className="flex items-center gap-3 text-sm text-gray-400">
            <span>{formattedDate}</span>
            <span>·</span>
            <span>{article.readTime}</span>
          </div>
        </div>

        {/* Body */}
        <article className="prose-nightup pb-16">
          {renderBody(article.body)}
        </article>

        {/* Share */}
        <div className="pb-10 border-t pt-8" style={{ borderColor: "#1A1A2E" }}>
          <p className="text-sm text-gray-400 mb-3">Share this article:</p>
          <div className="flex gap-3">
            {["Twitter", "Facebook", "WhatsApp"].map((s) => (
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

      {/* Related */}
      {related.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 pb-12">
          <h2 className="text-xl font-semibold mb-6">Related Articles</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {related.map((a) => (
              <Link
                key={a.id}
                href={`/articles/${a.id}`}
                className="group block rounded-2xl overflow-hidden transition-transform hover:-translate-y-1"
                style={{ backgroundColor: "#1A1A2E" }}
              >
                <div className="relative h-40 overflow-hidden">
                  <Image src={a.image} alt={a.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="p-4">
                  <p className="text-xs font-semibold mb-1" style={{ color: "#E8A020" }}>{a.category}</p>
                  <h3 className="text-sm font-medium line-clamp-2">{a.title}</h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
