/** The currencies an event price can be stored in. Mirrors the CHECK constraint
 *  on events.currency (supabase/migrations/..._event_currency*.sql) — keep the
 *  two in step. */
export const CURRENCIES = ["EUR", "USD", "GBP", "SEK", "NOK", "DKK", "CHF", "PLN"] as const;
export type CurrencyCode = (typeof CURRENCIES)[number];

/** How each currency is written out. Keyed by code, never by symbol: the three
 *  Scandinavian crowns all display as "kr", so a symbol does not identify a
 *  currency and nothing may map back from one. `space` follows local
 *  convention — "22 kr" and "CHF 22" read wrong glued together, "$22" and
 *  "220€" read wrong apart. */
const FORMATS: Record<CurrencyCode, { symbol: string; placement: "prefix" | "suffix"; space: boolean }> = {
  EUR: { symbol: "€",   placement: "suffix", space: false },
  USD: { symbol: "$",   placement: "prefix", space: false },
  GBP: { symbol: "£",   placement: "prefix", space: false },
  SEK: { symbol: "kr",  placement: "suffix", space: true },
  NOK: { symbol: "kr",  placement: "suffix", space: true },
  DKK: { symbol: "kr",  placement: "suffix", space: true },
  CHF: { symbol: "CHF", placement: "prefix", space: true },
  PLN: { symbol: "zł",  placement: "suffix", space: true },
};

/** Anything unknown (legacy rows, a bad payload) reads as EUR, which is what the
 *  column defaults to. */
export function normalizeCurrency(currency?: string | null): CurrencyCode {
  const code = String(currency ?? "").toUpperCase();
  return (CURRENCIES as readonly string[]).includes(code) ? (code as CurrencyCode) : "EUR";
}

/** Display symbol only. Not unique across currencies — SEK, NOK and DKK all
 *  return "kr" — so never use the result to identify a currency. */
export function currencySymbol(currency?: string | null): string {
  return FORMATS[normalizeCurrency(currency)].symbol;
}

function withSymbol(amount: string, currency?: string | null): string {
  const { symbol, placement, space } = FORMATS[normalizeCurrency(currency)];
  const gap = space ? " " : "";
  return placement === "prefix" ? `${symbol}${gap}${amount}` : `${amount}${gap}${symbol}`;
}

/** The amount with its symbol and nothing else. For compact summaries — the
 *  form's review row and live preview — which state the exact price rather than
 *  a "from" price. Goes through the same placement table as formatPrice, so a
 *  krona never comes out as "kr22". */
export function formatMoney(price: string | number | null | undefined, currency?: string | null): string {
  return withSymbol(String(price ?? ""), currency);
}

/** Form input -> value for the numeric events.price column.
 *  Every write path goes through this: a "€22" string reaching a numeric column
 *  is what used to make admin save/approve fail. */
export function parsePriceInput(price: string | number | null | undefined): number | null {
  if (price === null || price === undefined || price === "") return null;
  const num = parseFloat(String(price).replace(/[^0-9.]/g, ""));
  return Number.isFinite(num) ? num : null;
}

// Leading or trailing currency marker on a legacy string value, stripped before
// the "is this free" test. Longest alternatives first so CHF wins over C.
const MARKER = /^\s*(CHF|zł|kr|[€$£])\s*|\s*(CHF|zł|kr|[€$£])\s*$/gi;

export function formatPrice(
  price: string | number | null | undefined,
  lang: "el" | "en" = "el",
  currency?: string | null,
): string {
  const free = lang === "en" ? "free entry" : "είσοδος ελεύθερη";
  const from = lang === "en" ? "from" : "από";
  if (price === null || price === undefined || price === "") return "";
  const s = String(price).trim();
  const stripped = s.replace(MARKER, "").trim();
  if (price === 0 || /^(free|δωρεάν|0)$/i.test(stripped)) return free;
  const num = parseFloat(stripped.replace(/[^0-9.]/g, ""));
  if (isNaN(num)) return "";
  if (num === 0) return free;
  const amount = num % 1 === 0 ? String(num) : num.toFixed(2);
  return `${from} ${withSymbol(amount, currency)}`;
}
