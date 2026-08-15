export function formatPrice(price: string | number | null | undefined, lang: "el" | "en" = "el"): string {
  const free = lang === "en" ? "free entry" : "είσοδος ελεύθερη";
  const from = lang === "en" ? "from" : "από";
  if (price === null || price === undefined || price === "") return "";
  const s = String(price).trim();
  const stripped = s.replace(/^[€$]/i, "").trim();
  if (price === 0 || /^(free|δωρεάν|0)$/i.test(stripped)) return free;
  const num = parseFloat(stripped.replace(/[^0-9.]/g, ""));
  if (isNaN(num)) return "";
  if (num === 0) return free;
  return `${from} ${num % 1 === 0 ? num : num.toFixed(2)}€`;
}
