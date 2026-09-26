/** The currencies an event price can be stored in. Mirrors the CHECK constraint
 *  on events.currency (supabase/migrations/..._add_event_currency.sql) — keep
 *  the two in step. */
export const CURRENCIES = ["EUR", "USD", "GBP"] as const;
export type CurrencyCode = (typeof CURRENCIES)[number];

const SYMBOLS: Record<CurrencyCode, string> = { EUR: "€", USD: "$", GBP: "£" };

/** Anything unknown (legacy rows, a bad payload) reads as EUR, which is what the
 *  column defaults to. */
export function normalizeCurrency(currency?: string | null): CurrencyCode {
  const code = String(currency ?? "").toUpperCase();
  return (CURRENCIES as readonly string[]).includes(code) ? (code as CurrencyCode) : "EUR";
}

export function currencySymbol(currency?: string | null): string {
  return SYMBOLS[normalizeCurrency(currency)];
}

/** Form input -> value for the numeric events.price column.
 *  Every write path goes through this: a "€22" string reaching a numeric column
 *  is what used to make admin save/approve fail. */
export function parsePriceInput(price: string | number | null | undefined): number | null {
  if (price === null || price === undefined || price === "") return null;
  const num = parseFloat(String(price).replace(/[^0-9.]/g, ""));
  return Number.isFinite(num) ? num : null;
}

export function formatPrice(
  price: string | number | null | undefined,
  lang: "el" | "en" = "el",
  currency?: string | null,
): string {
  const free = lang === "en" ? "free entry" : "είσοδος ελεύθερη";
  const from = lang === "en" ? "from" : "από";
  if (price === null || price === undefined || price === "") return "";
  const s = String(price).trim();
  const stripped = s.replace(/^[€$£]/i, "").trim();
  if (price === 0 || /^(free|δωρεάν|0)$/i.test(stripped)) return free;
  const num = parseFloat(stripped.replace(/[^0-9.]/g, ""));
  if (isNaN(num)) return "";
  if (num === 0) return free;
  const code = normalizeCurrency(currency);
  const amount = num % 1 === 0 ? String(num) : num.toFixed(2);
  // Euro trails the amount the way Greek prices are written; dollar and pound
  // lead it. Keeps EUR output byte-identical to before currency existed.
  return code === "EUR" ? `${from} ${amount}${SYMBOLS.EUR}` : `${from} ${SYMBOLS[code]}${amount}`;
}
