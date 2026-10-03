"use client";
import { useLanguage } from "./LanguageContext";
import { formatPrice } from "../lib/formatPrice";
import T from "./T";

/** formatPrice in the viewer's language, for server components that cannot read it. */
export default function PriceLabel({ price, currency }: { price: string | number | null | undefined; currency?: string | null }) {
  const { lang } = useLanguage();
  return <>{formatPrice(price, lang, currency) || <T k="events_free_entry_fallback" />}</>;
}
