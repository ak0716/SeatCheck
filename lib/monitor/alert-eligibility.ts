import "server-only";

import { classifyAvailability } from "@/lib/monitor/availability";
import { parseDollarString } from "@/lib/monitor/price-compare";

export type SnapshotForAlert = {
  extracted_price: string | null;
  extracted_keywords: string[] | null;
  raw_text: string | null;
};

const NEGATIVE_SUBSTRINGS = [
  "sold out",
  "unavailable",
  "no tickets available",
  "not available",
  "no seats",
  "currently unavailable",
] as const;

const POSITIVE_SUBSTRINGS = [
  "on sale now",
  "add to cart",
  "add to basket",
  "in stock",
  "buy now",
  "buy tickets",
  "select tickets",
  "get tickets",
  "purchase tickets",
] as const;

function normalizeRaw(text: string | null | undefined): string {
  return (text ?? "").toLowerCase().replace(/\s+/g, " ").trim();
}

function rawTextHasNegative(lower: string): boolean {
  for (const n of NEGATIVE_SUBSTRINGS) {
    if (lower.includes(n)) return true;
  }
  return false;
}

function rawTextHasPositive(lower: string): boolean {
  if (/\bavailable\b/.test(lower)) return true;
  for (const p of POSITIVE_SUBSTRINGS) {
    if (lower.includes(p)) return true;
  }
  return false;
}

/**
 * Tickets appear available: explicit positive signals in keywords or page text,
 * and no stronger negative/unambiguous mixed-keyword state. Conservative when unclear.
 */
export function appearsAvailable(snapshot: SnapshotForAlert): boolean {
  const kw = snapshot.extracted_keywords ?? [];
  const lower = normalizeRaw(snapshot.raw_text);
  const textNeg = rawTextHasNegative(lower);
  const textPos = rawTextHasPositive(lower);
  const ks = classifyAvailability(kw);
  const kwNeg = ks === "negative" || ks === "mixed";
  const kwPos = ks === "positive";
  if (kwNeg || textNeg) return false;
  if (kwPos || textPos) return true;
  return false;
}

/** When threshold is null, price is not part of the gate (always true). */
export function meetsPriceThreshold(
  threshold: number | null,
  extractedPrice: string | null,
): boolean {
  if (threshold == null) return true;
  const n = parseDollarString(extractedPrice);
  if (n == null) return false;
  return n <= threshold;
}

export type CriteriaBreakdown = {
  met: boolean;
  availabilityMet: boolean;
  priceMet: boolean;
};

export function evaluateWatchCriteria(
  priceThreshold: number | null,
  snapshot: SnapshotForAlert,
): CriteriaBreakdown {
  const availabilityMet = appearsAvailable(snapshot);
  const priceMet = meetsPriceThreshold(priceThreshold, snapshot.extracted_price);
  return {
    met: availabilityMet && priceMet,
    availabilityMet,
    priceMet,
  };
}

export function shouldAlertOnTransition(
  hasPreviousSnapshot: boolean,
  previousMet: boolean,
  currentMet: boolean,
): boolean {
  return hasPreviousSnapshot && !previousMet && currentMet;
}

export function hasUsableSnapshotSignals(snapshot: SnapshotForAlert): boolean {
  const price = snapshot.extracted_price?.trim();
  const kw = snapshot.extracted_keywords ?? [];
  const raw = normalizeRaw(snapshot.raw_text);
  return Boolean(price) || kw.length > 0 || raw.length > 0;
}
