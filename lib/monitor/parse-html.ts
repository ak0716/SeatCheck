import "server-only";

import * as cheerio from "cheerio";

const PRICE_RE = /\$[\d,]+(\.\d{2})?/;

const KEYWORD_PHRASES = [
  "Sold Out",
  "Unavailable",
  "No Tickets Available",
  "Not Available",
  "On Sale Now",
  "Available",
] as const;

const MAX_RAW = 50_000;

function extractKeywords(fullText: string): string[] {
  const lower = fullText.toLowerCase();
  const found = new Set<string>();
  for (const phrase of KEYWORD_PHRASES) {
    if (lower.includes(phrase.toLowerCase())) {
      found.add(phrase);
    }
  }
  return [...found];
}

export type ParsedHtml = {
  priceText: string | null;
  keywords: string[];
  rawText: string;
};

export function parseHtml(html: string, watchId: string): ParsedHtml {
  let $: cheerio.CheerioAPI;
  try {
    $ = cheerio.load(html);
  } catch (e) {
    throw new Error(`Cheerio parse failed: ${String(e)}`);
  }

  const containers = $("main, article, [role=main], .content");
  let scope;
  if (containers.length > 0) {
    scope = containers;
  } else {
    console.warn(
      `[${watchId}] price selector fell back to body — page has unusual structure.`,
    );
    scope = $("body");
  }

  let priceText: string | null = null;

  const attrHost = scope.filter("[data-price]").first();
  const attrNested = scope.find("[data-price]").first();
  const attrEl = attrHost.length ? attrHost : attrNested;
  const attrVal = attrEl.attr("data-price")?.trim();
  if (attrVal) {
    const m = attrVal.match(PRICE_RE);
    if (m) priceText = m[0];
  }

  if (!priceText) {
    const priceCost = scope
      .find("*")
      .filter((_, el) => {
        const cls = $(el).attr("class");
        if (!cls) return false;
        const lc = cls.toLowerCase();
        return lc.includes("price") || lc.includes("cost");
      })
      .first();
    const blob = priceCost.length ? priceCost.text().trim() : "";
    if (blob) {
      const m = blob.match(PRICE_RE);
      if (m) priceText = m[0];
    }
  }

  if (!priceText) {
    console.warn(
      `[${watchId}] price extraction found no match in scoped content.`,
    );
  }

  const fullText = scope.text().replace(/\s+/g, " ").trim();
  const keywords = extractKeywords(fullText);
  const rawText =
    fullText.length > MAX_RAW ? fullText.slice(0, MAX_RAW) : fullText;

  return { priceText, keywords, rawText };
}
