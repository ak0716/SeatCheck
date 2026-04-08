import "server-only";

import fetch from "node-fetch";

import { FETCH_TIMEOUT_MS } from "@/lib/monitor/fetch-page";

const USER_AGENT = "Mozilla/5.0 (compatible; Seatcheck/1.0)";
const DISCOVERY_BASE = "https://app.ticketmaster.com/discovery/v2/events";

/** Thrown on HTTP 429 — caller must stop the entire cron batch (api-integration.md). */
export class TicketmasterRateLimitError extends Error {
  override readonly name = "TicketmasterRateLimitError";
  constructor(message = "Ticketmaster API rate limited (429)") {
    super(message);
  }
}

export function isTicketmasterRateLimitError(e: unknown): e is TicketmasterRateLimitError {
  return e instanceof TicketmasterRateLimitError;
}

/** Discovery API subset — verify fields against https://developer.ticketmaster.com/ */
export type TicketmasterDiscoveryEventJson = {
  priceRanges?: Array<{ min?: number }>;
  dates?: { status?: { code?: string } };
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Delays 5s → 15s → 30s with ~10% jitter (attempt 0, 1, 2 after first failure). */
function backoffDelayMs(attemptAfterFirstFailure: number): number {
  const bases = [5000, 15_000, 30_000];
  const base = bases[Math.min(attemptAfterFirstFailure, bases.length - 1)] ?? 30_000;
  const jitter = base * 0.1 * Math.random();
  return base + jitter;
}

function parseMinPrice(data: TicketmasterDiscoveryEventJson): number | null {
  const ranges = data.priceRanges;
  if (!ranges || ranges.length === 0) return null;
  let best: number | null = null;
  for (const r of ranges) {
    const m = r.min;
    if (typeof m !== "number" || !Number.isFinite(m)) continue;
    if (best === null || m < best) best = m;
  }
  return best;
}

function parseOnSale(data: TicketmasterDiscoveryEventJson): boolean {
  const code = data.dates?.status?.code;
  if (typeof code !== "string") return false;
  return code.toLowerCase() === "onsale";
}

type DiscoveryFetchResult =
  | { ok: true; json: TicketmasterDiscoveryEventJson }
  | { ok: false; status: number; body: string };

async function fetchDiscoveryEventOnce(
  eventId: string,
  apiKey: string,
): Promise<DiscoveryFetchResult> {
  const url = `${DISCOVERY_BASE}/${encodeURIComponent(eventId)}.json?apikey=${encodeURIComponent(apiKey)}`;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
      },
      redirect: "follow",
    });
    const body = await res.text();
    if (res.status === 429) {
      return { ok: false, status: 429, body };
    }
    if (res.status >= 500 && res.status <= 599) {
      return { ok: false, status: res.status, body };
    }
    if (!res.ok) {
      return { ok: false, status: res.status, body };
    }
    let json: TicketmasterDiscoveryEventJson;
    try {
      json = JSON.parse(body) as TicketmasterDiscoveryEventJson;
    } catch {
      throw new Error(`Ticketmaster: invalid JSON response for event ${eventId}`);
    }
    return { ok: true, json };
  } finally {
    clearTimeout(t);
  }
}

/**
 * Ticketmaster Discovery API — event detail.
 * 5xx / network: up to 3 retries with exponential backoff. 429: throws TicketmasterRateLimitError (no retry).
 */
export async function fetchTicketmasterData(
  eventId: string,
): Promise<{ minPrice: number | null; available: boolean }> {
  const apiKey = process.env.TICKETMASTER_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("TICKETMASTER_API_KEY is not configured");
  }

  const trimmedId = eventId.trim();
  if (!trimmedId) {
    throw new Error("Ticketmaster event_id is empty");
  }

  const urlForLog = `${DISCOVERY_BASE}/${encodeURIComponent(trimmedId)}.json?apikey=[REDACTED]`;
  console.log(`[ticketmaster DEBUG] fetching ${urlForLog}`);

  const MAX_ATTEMPTS = 4;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      await sleep(backoffDelayMs(attempt - 1));
    }

    try {
      const result = await fetchDiscoveryEventOnce(trimmedId, apiKey);

      if (!result.ok) {
        if (result.status === 429) {
          throw new TicketmasterRateLimitError();
        }
        if (result.status >= 500 && result.status <= 599) {
          if (attempt === MAX_ATTEMPTS - 1) {
            throw new Error(
              `Ticketmaster HTTP ${result.status} after ${MAX_ATTEMPTS} attempts: ${result.body.slice(0, 200)}`,
            );
          }
          continue;
        }
        throw new Error(
          `Ticketmaster HTTP ${result.status}: ${result.body.slice(0, 300)}`,
        );
      }

      const minPrice = parseMinPrice(result.json);
      const available = parseOnSale(result.json);
      return { minPrice, available };
    } catch (e) {
      if (e instanceof TicketmasterRateLimitError) throw e;
      const isAbort = e instanceof Error && e.name === "AbortError";
      const isNetwork =
        e instanceof TypeError ||
        (e instanceof Error && (e.message.includes("fetch") || isAbort));

      if (attempt === MAX_ATTEMPTS - 1) {
        throw e instanceof Error ? e : new Error(String(e));
      }

      if (isNetwork || isAbort) {
        continue;
      }
      throw e instanceof Error ? e : new Error(String(e));
    }
  }

  throw new Error("Ticketmaster: exhausted retries");
}
