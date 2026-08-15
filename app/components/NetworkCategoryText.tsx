"use client";
import { useLanguage } from "./LanguageContext";
import { networkCategoryLabel } from "../lib/searchData";

/** Renders a stored (Greek) network category value in the active language.
 *  Usable from server components, like <T />. */
export default function NetworkCategoryText({ value }: { value: string | null | undefined }) {
  const { lang } = useLanguage();
  if (!value) return null;
  return <>{networkCategoryLabel(value, lang)}</>;
}
