# monitoring.md
# Seatcheck — URL Monitor Engine Rules
# Place this file in .cursor/rules/

## What this file covers
Implementation rules for the URL Monitor Engine (Section 6.2 of the PRD).
Read this before working on Phase 3.

---

## Fetch Strategy

- Use `node-fetch` for all HTTP requests.
- Set a 10-second timeout on every fetch. If the request times out, treat it as a fetch failure.
- Send a realistic User-Agent header to avoid being blocked:
  `User-Agent: Mozilla/5.0 (compatible; Seatcheck/1.0)`

---

## HTML Parsing with Cheerio

Parse all fetched HTML with Cheerio. Never diff raw HTML strings.

### Price extraction — selector priority order
Scope all selectors to `main, article, [role=main], .content` first to avoid matching navigation, footer, or ad content. If none of those containers exist on the page, fall back to searching `body` but log a warning: "[watch_id] price selector fell back to body — page has unusual structure."

1. Elements with a `[data-price]` attribute → read the attribute value
2. Elements whose `class` contains `price` or `cost`, scoped inside the container
3. If neither selector returns a match: log the miss, skip price extraction for this check. Do not search all text nodes.

Apply this regex to the extracted string to isolate the price value: `/\$[\d,]+(\.\d{2})?/`

### Availability keyword extraction
Search all extracted text for these exact strings (case-insensitive):
- "Sold Out"
- "Unavailable"
- "No Tickets Available"
- "Not Available"
- "On Sale Now"
- "Available"

Store the matched keywords as an array (e.g., `["Sold Out"]`).

### Partial results are valid
- Price found, no keywords → store price, alert on price changes only
- Keywords found, no price → store keywords, alert on keyword set changes only
- Neither found → set `js_rendered: true` on the watch, skip diffing, show UI warning

---

## Change Detection

Follow the alert truth table defined in Section 6.2 of the PRD exactly.
Key rules:
- On first check: store snapshot, do not alert (unless price is already at/below threshold)
- Only keyword transitions that cross a meaningful boundary trigger alerts:
  - Negative keyword appears: alert ([] → ["Sold Out"])
  - Positive keyword appears: alert (["Sold Out"] → ["Available"])
  - Negative-to-negative transition: silent update (["Sold Out"] → ["Unavailable"])
- Snapshots update on every check regardless of whether an alert fires.

---

## JS-Rendered Page Handling

Decision tree — follow in order, stop at first match:

1. Attempt static fetch with node-fetch
2. Parse with Cheerio, attempt price and keyword extraction
3. If extraction succeeds → proceed with normal diff
4. If both price and keyword extraction return nothing → set `js_rendered: true` in Supabase, display UI warning: "Limited monitoring — this page requires JavaScript rendering."
5. **Do not install Puppeteer or Playwright.** Flag the watch as incompatible instead.

---

## Snapshot Retention

Retain only the last 2 snapshots per watch.

After every successful snapshot insert, immediately `await` this cleanup in the same function (not a separate job, not fire-and-forget):

```sql
DELETE FROM snapshots
WHERE watch_id = $1
  AND id NOT IN (
    SELECT id FROM snapshots
    WHERE watch_id = $1
    ORDER BY checked_at DESC
    LIMIT 2
  );
```

If the cleanup DELETE fails, log the error with the watch_id and continue — do not throw or abort the cron cycle. Snapshot accumulation is a low-severity issue; a failed alert would be worse.

---

## Concurrent Execution Protection

Vercel does not guarantee exactly-once cron execution. At the start of every cron run, acquire a row-level lock to prevent duplicate processing:

```sql
SELECT id FROM watches
WHERE status = 'active'
ORDER BY last_checked_at ASC NULLS FIRST  -- NULLS FIRST ensures new watches (last_checked_at=null) run on their first cron cycle
FOR UPDATE SKIP LOCKED;
```

Process only the watches returned by this query.
