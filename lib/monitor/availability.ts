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

