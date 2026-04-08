---
name: Discovery event ID in preview
overview: "Extend [`app/api/ticket-page-preview/route.ts`](app/api/ticket-page-preview/route.ts) only: after `fetchTicketPagePreview`, optionally replace `eventId` using Ticketmaster Discovery `GET /discovery/v2/events.json?apikey=...&url=...`, with a 5s `node-fetch` call, typed JSON parsing, silent fallback to URL-parsed ID, and one `console.warn` on failure."
todos:
  - id: route-discovery-lookup
    content: Add typed Discovery events.json lookup + 5s node-fetch in ticket-page-preview/route.ts; merge eventId when platform is ticketmaster
    status: completed
  - id: route-fallback-warn
    content: Single console.warn on any lookup failure; always return 200 with fetchTicketPagePreview result on fallback
    status: completed
isProject: false
---

# Ticketmaster Discovery ID in ticket-page-preview (route only)

## Context

- `[lib/ticket-url-preview.ts](lib/ticket-url-preview.ts)` is unchanged; it keeps returning the venue-style ID from `/event/{id}` in the path.
- `[app/api/ticket-page-preview/route.ts](app/api/ticket-page-preview/route.ts)` today calls `fetchTicketPagePreview(url)` and returns JSON as-is (lines 31–32).

Per [.cursor/rules/api-integration.md](.cursor/rules/api-integration.md): use typed shapes for API JSON; `apikey` as query param (same pattern as existing `[lib/monitor/ticketmaster.ts](lib/monitor/ticketmaster.ts)`).

## Implementation (single file)

**File:** `[app/api/ticket-page-preview/route.ts](app/api/ticket-page-preview/route.ts)`

1. **Imports**
  - Add `node-fetch` (default import), matching the rest of the repo.
2. **Constants**
  - `DISCOVERY_LOOKUP_TIMEOUT_MS = 5000`  
  - Discovery search base: `https://app.ticketmaster.com/discovery/v2/events.json`  
  - Optional: reuse a simple `User-Agent` string consistent with other server fetches (e.g. existing preview bot string or `Mozilla/5.0 (compatible; Seatcheck/1.0)`).
3. **Types (local to this file)**
  - Minimal interface for the search response, e.g. `_embedded?: { events?: Array<{ id?: string }> }`, so `events[0].id` is read safely.
4. **Helper: `resolveTicketmasterDiscoveryEventId(originalUrl: string): Promise<string | null>`** (or inline logic)
  - Read `process.env.TICKETMASTER_API_KEY?.trim()`; if missing, return `null` (caller treats as failure → fallback + warn).  
  - Build URL: `.../events.json?apikey=${encodeURIComponent(key)}&url=${encodeURIComponent(originalUrl)}`.  
  - `AbortController` + 5s timeout; `fetch` with `signal`.  
  - If `!res.ok`, return `null`.  
  - Parse JSON in try/catch; on success return `_embedded?.events?.[0]?.id` if `typeof id === 'string' && id.length > 0`, else `null`.  
  - Do **not** retry.
5. **POST handler flow**
  - `const result = await fetchTicketPagePreview(url);` (unchanged).  
  - If `result.platform === "ticketmaster"`:  
    - `const discoveryId = await resolveTicketmasterDiscoveryEventId(url);`  
    - If `discoveryId != null`: return `NextResponse.json({ ...result, eventId: discoveryId })`.  
    - If `discoveryId == null`: `**console.warn`** once with a short, fixed prefix (e.g. `[ticket-page-preview] Ticketmaster Discovery event ID lookup failed; using URL-derived id`) — optionally append a terse reason (`no_api_key` | `http_${status}` | `no_match` | `parse_error`) in the same line so Vercel logs stay scannable **without** multiple warn calls per request.  
    - Return `NextResponse.json(result)` (original `eventId`).
  - Else: return `NextResponse.json(result)` as today.
6. **Failure semantics**
  - Any network/timeout/abort/non-200/empty events/missing id: treat as lookup failed → **one** `console.warn`, **never** throw from the lookup path; response still 200 with preview payload and URL-derived `eventId` so watch creation is never blocked.

## Out of scope (per constraints)

- No edits to `[lib/ticket-url-preview.ts](lib/ticket-url-preview.ts)`, `[app/api/watches/route.ts](app/api/watches/route.ts)`, or monitor code.

## Verification (manual)

- POST preview with a real Ticketmaster event URL; response `eventId` should match Discovery format when lookup succeeds.  
- With `TICKETMASTER_API_KEY` unset or invalid URL: response still succeeds with path-derived id and a single warn in logs.

