"use client";
import { useLanguage } from "./LanguageContext";
import { tr, type TranslationKey } from "../lib/translations";

export default function T({ k }: { k: TranslationKey }) {
  const { lang } = useLanguage();
  return <>{tr(k, lang)}</>;
}
