"use client";

import { useAutoTranslate } from "./LanguageContext";

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
    return <p key={i} className="text-gray-300 leading-relaxed mb-4">{para}</p>;
  });
}

/**
 * Translates an article body (preserving **bold** markers) then renders it.
 */
export default function TranslatedArticleBody({ body }: { body: string }) {
  const { text: translated } = useAutoTranslate(body);
  return <>{renderBody(translated)}</>;
}
