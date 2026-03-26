# api-integration.md
# Seatcheck — Platform API Integration Rules
# Place this file in .cursor/rules/

## What this file covers
Implementation rules for the API Monitor Engine (Section 6.3 of the PRD).
Read this before working on Phases 5 and 6.

---

## General Rules

- Before writing any parser, fetch and read the live API documentation:
  - Ticketmaster: https://developer.ticketmaster.com/products-and-docs/apis/commerce/
  - SeatGeek: https://platform.seatgeek.com
- Do not hardcode field names without verifying them in the live docs first.
- All API calls must be typed. Define TypeScript interfaces for all response shapes before writing any parser.
- If live documentation shows field names that differ from the examples in this file: update this file with the correct names, add a comment noting the discrepancy, and flag it for the owner's review. Do not silently adapt without documenting the change.

---

## Ticketmaster Commerce API

**Endpoint:** `GET /api/commerce/v2/events/{eventId}/offers`

**Auth:** Append `?apikey=TICKETMASTER_API_KEY` as a query parameter.

### Fields used by Seatcheck (verify names in live docs before use)
- `offers[].prices[].value` — numeric ticket price
- `offers[].prices[].currency` — currency code (e.g., "USD")
- `offers[].inventory.available` — boolean
- `offers[].inventory.remaining` — integer ticket count in this offer
- `offers[].inventory.section` — section label (e.g., "Floor A")
- `offers[].inventory.row` — row label (e.g., "C")

### Alert conditions
- Price alert: the listing price is at or below `watch.price_threshold`
- Group size: the listing ticket count is at or above `watch.group_size`
- Both conditions must be met when both are set
- Do not use the field names above as authoritative — verify against live docs before writing any parser

---

## SeatGeek Listings API

**Endpoint:** `GET /listings?event_id={eventId}&client_id={SEATGEEK_CLIENT_ID}&client_secret={SEATGEEK_CLIENT_SECRET}`

### Fields used by Seatcheck (verify names in live docs before use)
- `listings[].price` — numeric price per ticket
- `listings[].quantity` — integer ticket count in this listing
- `listings[].splits` — allowed split quantities (check if group_size is in this array)

### Alert conditions
- Price alert: the listing price is at or below `watch.price_threshold`
- Group size: the listing ticket count is at or above `watch.group_size`
- Both conditions must be met when both are set
- Do not use the field names above as authoritative — verify against live docs before writing any parser

### Multi-listing results
When multiple listings match the alert conditions, do not send one alert per listing.
Select only the single best match (lowest price among qualifying listings) and send one alert.
Include the listing count in the alert copy: e.g., "3 listings found — best price: $68."

### Group size disclaimer
Group size is a best-effort proxy for contiguous seating. Alert copy must include:
"Verify seat adjacency before purchasing."

---

## Exponential Backoff

Apply to all API calls (Ticketmaster and SeatGeek):

- Max 3 retries
- Delays: 5s → 15s → 30s
- Apply 10% random jitter to each delay to prevent thundering herd
- After 3 failed retries: increment `consecutive_failures` on the watch, log the failure, skip this watch for the current cron cycle
- If any failure is HTTP 429 (rate limit): immediately stop processing all remaining watches in the current cron cycle. Log the event to Supabase. Do not alert the user.
- The `consecutive_failures` counter and 3-failure → Error status rule apply identically to API failures and URL fetch failures (see error-handling.md)

---

## Dual Monitoring (URL + API)

When a watch has both a `url` and an `event_id`:
- URL monitoring and API monitoring run independently in the same cron cycle
- Both can fire alerts
- Neither suppresses the other
- There is no priority between them
