import "server-only";

const NEGATIVE = new Set([
  "Sold Out",
  "Unavailable",
  "No Tickets Available",
  "Not Available",
]);

const POSITIVE = new Set(["On Sale Now", "Available"]);

export type AvailabilityState = "none" | "negative" | "positive" | "mixed";

export function classifyAvailability(keywords: string[]): AvailabilityState {
  let hasNeg = false;
  let hasPos = false;
  for (const k of keywords) {
    if (NEGATIVE.has(k)) hasNeg = true;
    if (POSITIVE.has(k)) hasPos = true;
  }
  if (hasNeg && hasPos) return "mixed";
  if (hasNeg) return "negative";
  if (hasPos) return "positive";
  return "none";
}

function normalizeKeywordSet(kw: string[]): string[] {
  return [...new Set(kw)].sort();
}

function setsEqual(a: string[], b: string[]): boolean {
  const x = normalizeKeywordSet(a);
  const y = normalizeKeywordSet(b);
  if (x.length !== y.length) return false;
  return x.every((v, i) => v === y[i]);
}

/**
 * No prior snapshot: pass `prevKeywords === null` — no availability alert (first successful check).
 * Unchanged keyword set: no alert.
 * Negative-to-negative only: silent (e.g. "Sold Out" → "Unavailable"); all other state changes alert.
 */
export function shouldAlertAvailability(
  prevKeywords: string[] | null,
  nextKeywords: string[],
): boolean {
  if (prevKeywords == null) return false;
  if (setsEqual(prevKeywords, nextKeywords)) return false;
  const ps = classifyAvailability(prevKeywords);
  const ns = classifyAvailability(nextKeywords);
  if (ps === "negative" && ns === "negative") return false;
  return true;
}
