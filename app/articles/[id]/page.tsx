import { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getSupabase } from "../../lib/supabase";
import TranslatedText from "../../components/TranslatedText";
import TranslatedArticleBody from "../../components/TranslatedArticleBody";

interface Props {
  params: Promise<{ id: string }>;
}

async function getArticle(id: string) {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("articles")
      .select("*")
      .eq("id", id)
      .eq("status", "published")
      .single();

    if (!error && data) {
      return {
        id: String(data.id),
        title: data.title,
        category: data.category,
        date: data.published_at ?? "",
        readTime: data.read_time ?? "",
        image: data.hero_image ?? "",
        excerpt: data.excerpt ?? "",
        body: data.content ?? "",
        featured: data.featured ?? false,
      };
    }
  } catch {}

  return null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const article = await getArticle(id);
  if (!article) return { title: "Article not found" };
  return {
    title: article.title,
    description: article.excerpt || article.title,
  };
}

export default async function ArticlePage({ params }: Props) {
  const { id } = await params;
  const article = await getArticle(id);
  if (!article) notFound();

  const formattedDate = new Date(article.date).toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div>
      <div className="relative h-64 md:h-96 w-full overflow-hidden">
        <Image src={article.image} alt={article.title} fill sizes="100vw" className="object-cover" priority />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 30%, #0F0F1A 100%)" }} />
      </div>

      <div className="max-w-3xl mx-auto px-4">
        <div className="py-6">
          <Link href="/articles" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-6 transition-colors">
            ← All Articles
          </Link>
          <span className="inline-block text-xs font-semibold px-3 py-1 rounded-full mb-4" style={{ backgroundColor: "#E8A020", color: "#0F0F1A" }}>
            {article.category}
          </span>
          <h1 className="text-3xl md:text-4xl font-bold mb-4 leading-tight"><TranslatedText text={article.title} /></h1>
          <div className="flex items-center gap-3 text-sm text-gray-400">
            <span>{formattedDate}</span>
            <span>·</span>
            <span>{article.readTime}</span>
          </div>
        </div>

        <article className="prose-nightup pb-16">
          <TranslatedArticleBody body={article.body} />
        </article>

        <div className="pb-10 border-t pt-8" style={{ borderColor: "#1A1A2E" }}>
          <p className="text-sm text-gray-400 mb-3">Share this article:</p>
          <div className="flex flex-wrap gap-3">
            <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=${encodeURIComponent("https://nightup.gr")}`} target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-lg text-xs font-medium hover:border-white/40" style={{ backgroundColor: "#1A1A2E", border: "1px solid #333", color: "#aaa" }}>Twitter / X</a>
            <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent("https://nightup.gr")}`} target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-lg text-xs font-medium hover:border-white/40" style={{ backgroundColor: "#1A1A2E", border: "1px solid #333", color: "#aaa" }}>Facebook</a>
            <a href={`https://wa.me/?text=${encodeURIComponent(article.title + " https://nightup.gr")}`} target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-lg text-xs font-medium hover:border-white/40" style={{ backgroundColor: "#1A1A2E", border: "1px solid #333", color: "#aaa" }}>WhatsApp</a>
          </div>
        </div>
      </div>

    </div>
  );
}
