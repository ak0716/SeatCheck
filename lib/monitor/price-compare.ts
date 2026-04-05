import "server-only";

export function parseDollarString(priceText: string | null): number | null {
  if (!priceText) return null;
  const m = priceText.match(/\$[\d,]+(\.\d{2})?/);
  const slice = m ? m[0] : priceText;
  const n = slice.replace(/[$,]/g, "");
  const v = parseFloat(n);
  return Number.isFinite(v) ? v : null;
}
