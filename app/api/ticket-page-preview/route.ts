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

/**
 * Path segment immediately before `/event/{id}` (same id as urlDerivedId), or null
 * when the URL is only `/event/{id}` with no preceding segment or id mismatch.
 */
function extractSlugBeforeEvent(
  ticketmasterPageUrl: string,
  urlDerivedId: string,
): string | null {
  const idNorm = urlDerivedId.trim().toLowerCase();
  if (!idNorm) return null;

  let pathname: string;
  try {
    pathname = new URL(ticketmasterPageUrl).pathname;
  } catch {
    return null;
  }

  const segments = pathname.split("/").filter(Boolean);
  for (let i = 0; i < segments.length - 1; i++) {
    if (segments[i].toLowerCase() !== "event") continue;
    const pathId = segments[i + 1];
    if (!pathId || pathId.toLowerCase() !== idNorm) continue;
    if (i === 0) return null;
    return segments[i - 1] ?? null;
  }

  return null;
}

/** First up to 3 hyphen-separated tokens from the slug, joined with spaces. */
function slugToDiscoveryKeyword(slug: string): string | null {
  const parts = slug.split("-").filter((p) => p.length > 0);
  if (parts.length === 0) return null;
  return parts.slice(0, 3).join(" ");
}

/**
 * Resolves Discovery API event id: keyword search from URL slug, then URL path match.
 * @param ticketmasterPageUrl Full Ticketmaster event page URL
 * @param urlDerivedId Path segment after /event/ from the same URL
 */
async function resolveTicketmasterDiscoveryEventId(
  ticketmasterPageUrl: string,
  urlDerivedId: string,
): Promise<DiscoveryLookupResult> {
  const key = process.env.TICKETMASTER_API_KEY?.trim();
  if (!key) {
    return { ok: false, reason: "no_api_key" };
  }

  const idKeyword = urlDerivedId.trim();
  if (!idKeyword) {
    return { ok: false, reason: "empty_url_derived_id" };
  }

  const slug = extractSlugBeforeEvent(ticketmasterPageUrl, idKeyword);
  if (slug === null) {
    return { ok: false, reason: "no_slug" };
  }

  const keyword = slugToDiscoveryKeyword(slug);
  if (!keyword) {
    return { ok: false, reason: "empty_keyword" };
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

    const pathSegment = `/event/${idKeyword}`.toLowerCase();

    for (const ev of events) {
      const eventUrl = ev.url;
      if (typeof eventUrl !== "string" || eventUrl.trim() === "") continue;
      if (!eventUrl.toLowerCase().includes(pathSegment)) continue;
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

    const result = await fetchTicketPagePreview(url);

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
