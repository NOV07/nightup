"use client";

import { useAutoTranslate } from "./LanguageContext";

/**
 * Renders translated text as a React fragment — wrap with whatever element you need.
 * Falls back to the original text while the translation is loading or if lang === "el".
 */
export default function TranslatedText({ text }: { text: string }) {
  const { text: translated } = useAutoTranslate(text);
  return <>{translated}</>;
}
