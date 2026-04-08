import { NextResponse } from "next/server";
import fetch from "node-fetch";

import { fetchTicketPagePreview } from "@/lib/ticket-url-preview";
import { isValidHttpsWatchUrl } from "@/lib/url-validation";

const MAX_BODY = 4096;
const DISCOVERY_LOOKUP_TIMEOUT_MS = 5000;
const DISCOVERY_EVENTS_SEARCH =
  "https://app.ticketmaster.com/discovery/v2/events.json";
const USER_AGENT = "Mozilla/5.0 (compatible; Seatcheck/1.0)";

/** Ticketmaster Discovery search-by-URL response subset. */
type TicketmasterDiscoveryEventsSearchJson = {
  _embedded?: {
    events?: Array<{ id?: string }>;
  };
};

type DiscoveryLookupOk = { ok: true; id: string };
type DiscoveryLookupFail = { ok: false; reason: string };
type DiscoveryLookupResult = DiscoveryLookupOk | DiscoveryLookupFail;

async function resolveTicketmasterDiscoveryEventId(
  originalUrl: string,
): Promise<DiscoveryLookupResult> {
  const key = process.env.TICKETMASTER_API_KEY?.trim();
  if (!key) {
    return { ok: false, reason: "no_api_key" };
  }

  const apiUrl = `${DISCOVERY_EVENTS_SEARCH}?apikey=${encodeURIComponent(key)}&url=${encodeURIComponent(originalUrl)}`;

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

    const rawId = data._embedded?.events?.[0]?.id;
    if (typeof rawId === "string" && rawId.trim() !== "") {
      return { ok: true, id: rawId.trim() };
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

    const result = await fetchTicketPagePreview(url);

    if (result.platform === "ticketmaster") {
      const lookup = await resolveTicketmasterDiscoveryEventId(url);
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
