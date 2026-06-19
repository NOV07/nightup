export function formatPrice(price: string | number | null | undefined): string {
  if (price === null || price === undefined || price === "") return "";
  const s = String(price).trim();
  const stripped = s.replace(/^[€$]/i, "").trim();
  if (price === 0 || /^(free|δωρεάν|0)$/i.test(stripped)) return "είσοδος ελεύθερη";
  const num = parseFloat(stripped.replace(/[^0-9.]/g, ""));
  if (isNaN(num)) return "";
  if (num === 0) return "είσοδος ελεύθερη";
  return `από ${num % 1 === 0 ? num : num.toFixed(2)}€`;
}
