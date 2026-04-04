import "server-only";

import type { Platform } from "@/lib/types";
import { isValidHttpsWatchUrl } from "@/lib/url-validation";

const MAX_URL_LENGTH = 2048;
const FETCH_TIMEOUT_MS = 12_000;
const MAX_HTML_BYTES = 500_000;

export type TicketPagePreviewResult = {
  suggestedLabel: string | null;
  platform: Platform | null;
  eventId: string | null;
};

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function extractTitle(html: string): string | null {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch?.[1]) {
    const t = stripTags(titleMatch[1]);
    if (t.length > 0) return t.slice(0, 500);
  }
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1Match?.[1]) {
    const t = stripTags(h1Match[1]);
    if (t.length > 0) return t.slice(0, 500);
  }
  return null;
}

function hostnamePlatform(host: string): Platform | null {
  const h = host.toLowerCase();
  if (h.includes("ticketmaster.")) return "ticketmaster";
  if (h.includes("seatgeek.")) return "seatgeek";
  return "generic";
}

/** Ticketmaster: /event/{eventId} — alphanumeric ID */
function extractTicketmasterEventId(pathname: string): string | null {
  const m = pathname.match(/\/event\/([A-Za-z0-9]+)/);
  return m?.[1] ?? null;
}

/** SeatGeek: first numeric segment of 5+ digits in path */
function extractSeatGeekEventId(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean);
  for (const seg of segments) {
    const m = seg.match(/^(\d{5,})$/);
    if (m) return m[1];
  }
  const anywhere = pathname.match(/\/(\d{6,})(?:\/|$)/);
  return anywhere?.[1] ?? null;
}

export function detectUrlMetadata(url: string): {
  platform: Platform | null;
  eventId: string | null;
} {
  try {
    const u = new URL(url);
    const platform = hostnamePlatform(u.hostname);
    if (platform === "ticketmaster") {
      return { platform, eventId: extractTicketmasterEventId(u.pathname) };
    }
    if (platform === "seatgeek") {
      return { platform, eventId: extractSeatGeekEventId(u.pathname) };
    }
    return { platform: "generic", eventId: null };
  } catch {
    return { platform: null, eventId: null };
  }
}

export async function fetchTicketPagePreview(
  url: string,
): Promise<TicketPagePreviewResult> {
  const trimmed = url.trim();
  const { platform, eventId } = detectUrlMetadata(trimmed);

  if (!isValidHttpsWatchUrl(trimmed) || trimmed.length > MAX_URL_LENGTH) {
    return { suggestedLabel: null, platform, eventId };
  }

  let suggestedLabel: string | null = null;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(trimmed, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "SeatcheckBot/1.0 (+https://seatcheck.local; ticket monitoring)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    clearTimeout(t);

    if (!res.ok) {
      return { suggestedLabel: null, platform, eventId };
    }

    const buf = await res.arrayBuffer();
    const slice = buf.byteLength > MAX_HTML_BYTES ? buf.slice(0, MAX_HTML_BYTES) : buf;
    const html = new TextDecoder("utf-8", { fatal: false }).decode(slice);
    suggestedLabel = extractTitle(html);
  } catch {
    /* network / parse errors — return metadata only */
  }

  return { suggestedLabel, platform, eventId };
}
