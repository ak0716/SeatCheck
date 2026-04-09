import { NextResponse } from "next/server";
import fetch from "node-fetch";

import { fetchTicketPagePreview } from "@/lib/ticket-url-preview";
import { isValidHttpsWatchUrl } from "@/lib/url-validation";

const MAX_BODY = 4096;
const DISCOVERY_LOOKUP_TIMEOUT_MS = 5000;
const DISCOVERY_EVENTS_SEARCH =
  "https://app.ticketmaster.com/discovery/v2/events.json";
const USER_AGENT = "Mozilla/5.0 (compatible; Seatcheck/1.0)";

/** Ticketmaster Discovery search response subset (keyword search). */
type TicketmasterDiscoveryEventsSearchJson = {
  _embedded?: {
    events?: Array<{ id?: string; url?: string }>;
  };
};

type DiscoveryLookupOk = { ok: true; id: string };
type DiscoveryLookupFail = { ok: false; reason: string };
type DiscoveryLookupResult = DiscoveryLookupOk | DiscoveryLookupFail;

function urlsMatchCaseInsensitive(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * Resolves Discovery API event id using keyword search + URL match.
 * @param originalUrl Full Ticketmaster page URL the user entered
 * @param urlDerivedId Path segment after /event/ from the same URL
 */
async function resolveTicketmasterDiscoveryEventId(
  originalUrl: string,
  urlDerivedId: string,
): Promise<DiscoveryLookupResult> {
  const key = process.env.TICKETMASTER_API_KEY?.trim();
  if (!key) {
    return { ok: false, reason: "no_api_key" };
  }

  const keyword = urlDerivedId.trim();
  if (!keyword) {
    return { ok: false, reason: "empty_url_derived_id" };
  }

  const apiUrl = `${DISCOVERY_EVENTS_SEARCH}?apikey=${encodeURIComponent(key)}&keyword=${encodeURIComponent(keyword)}`;

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), DISCOVERY_LOOKUP_TIMEOUT_MS);
  try {
    const res = await fetch(apiUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
      },
      redirect: "follow",
    });

    if (!res.ok) {
      return { ok: false, reason: `http_${res.status}` };
    }

    let data: TicketmasterDiscoveryEventsSearchJson;
    try {
      data = (await res.json()) as TicketmasterDiscoveryEventsSearchJson;
    } catch {
      return { ok: false, reason: "parse_error" };
    }

    const events = data._embedded?.events;
    if (!events || events.length === 0) {
      return { ok: false, reason: "no_match" };
    }

    for (const ev of events) {
      const eventUrl = ev.url;
      if (typeof eventUrl !== "string" || eventUrl.trim() === "") continue;
      if (!urlsMatchCaseInsensitive(eventUrl, originalUrl)) continue;
      const rawId = ev.id;
      if (typeof rawId === "string" && rawId.trim() !== "") {
        return { ok: true, id: rawId.trim() };
      }
    }

    return { ok: false, reason: "no_match" };
  } catch (e) {
    const name = e instanceof Error ? e.name : "";
    if (name === "AbortError") {
      return { ok: false, reason: "timeout" };
    }
    return { ok: false, reason: "network_error" };
  } finally {
    clearTimeout(t);
  }
}

export async function POST(request: Request) {
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY) {
      return NextResponse.json({ error: "Body too large" }, { status: 400 });
    }
    let body: unknown;
    try {
      body = JSON.parse(raw) as unknown;
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const url = (body as { url?: unknown }).url;
    if (typeof url !== "string" || !isValidHttpsWatchUrl(url)) {
      return NextResponse.json(
        { error: "url must be a valid https:// URL with a host" },
        { status: 400 },
      );
    }

    console.log(`[ticket-page-preview DEBUG] url=${url}`);

    const result = await fetchTicketPagePreview(url);

    const discoveryLookupAttempted =
      result.platform === "ticketmaster" && Boolean(result.eventId);
    console.log(
      `[ticket-page-preview DEBUG] platform=${result.platform ?? "null"}`,
    );
    console.log(`[ticket-page-preview DEBUG] eventId=${result.eventId ?? "null"}`);
    console.log(
      `[ticket-page-preview DEBUG] discoveryLookupAttempted=${discoveryLookupAttempted}`,
    );

    if (result.platform === "ticketmaster" && result.eventId) {
      const lookup = await resolveTicketmasterDiscoveryEventId(
        url,
        result.eventId,
      );
      if (lookup.ok) {
        return NextResponse.json({ ...result, eventId: lookup.id });
      }
      console.warn(
        `[ticket-page-preview] Ticketmaster Discovery event ID lookup failed; using URL-derived id (${lookup.reason})`,
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "Unexpected server error", details: String(error) },
      { status: 500 },
    );
  }
}
