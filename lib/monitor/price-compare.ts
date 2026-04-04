import "server-only";

export function parseDollarString(priceText: string | null): number | null {
  if (!priceText) return null;
  const m = priceText.match(/\$[\d,]+(\.\d{2})?/);
  const slice = m ? m[0] : priceText;
  const n = slice.replace(/[$,]/g, "");
  const v = parseFloat(n);
  return Number.isFinite(v) ? v : null;
}

/**
 * First snapshot (no prior snapshot row): alert if threshold set and price <= threshold.
 * Otherwise: alert when prev numeric > threshold and curr <= threshold.
 * threshold null means no price alert.
 */
export function shouldAlertPriceDrop(
  hasPrevSnapshot: boolean,
  prevExtractedPrice: string | null,
  currExtractedPrice: string | null,
  threshold: number | null,
): boolean {
  if (threshold == null) return false;
  const curr = parseDollarString(currExtractedPrice);
  if (curr == null) return false;
  if (!hasPrevSnapshot) {
    return curr <= threshold;
  }
  if (prevExtractedPrice == null) return false;
  const prev = parseDollarString(prevExtractedPrice);
  if (prev == null) return false;
  return prev > threshold && curr <= threshold;
}
