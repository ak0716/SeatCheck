# error-handling.md
# Seatcheck — Error Handling Rules
# Place this file in .cursor/rules/

## What this file covers
Per-layer error handling behavior. Read this before writing any cron logic, API routes, or data fetching.
Never silently swallow exceptions. Every error must be logged.

---

## Layer 1 — URL Fetch Failures

A URL fetch failure is any of: network timeout, HTTP error (4xx/5xx), or Cheerio parse crash.

1. Log the error to the console with watch ID and error message
2. Increment `consecutive_failures` on the watch record
3. Update `last_checked_at` to now (so the watch doesn't stay at the top of the next cron queue)
4. If `consecutive_failures >= 3`: set `status = 'error'` and stop monitoring this watch
5. Do not send a user-facing alert for fetch failures

---

## Layer 2 — API Errors (Ticketmaster / SeatGeek)

1. Apply exponential backoff per api-integration.md before treating as a failure
2. The 3 retries within backoff happen inside a single cron cycle and count as **1 failure** — not 3. Only increment `consecutive_failures` by 1 after all retries are exhausted.
3. After that increment: the same `consecutive_failures >= 3 → status = 'error'` rule applies as Layer 1
4. HTTP 429 (rate limit): stop the entire cron cycle immediately (see api-integration.md)
5. Do not send a user-facing alert for API failures

---

## Layer 3 — Supabase Errors in Cron

1. Log the error with context (which operation, which watch ID if known)
2. Exit the cron job gracefully — do not crash the process
3. Do not attempt to retry Supabase operations in the same cron cycle
4. Do not send a user-facing alert for database errors

---

## Layer 4 — Alert Delivery Failures (Resend / Twilio)

1. Log the failure with watch ID, alert type, and error response
2. Retry once after 60 seconds
3. If the retry also fails: log and stop — do not retry further
4. Do not set watch status to error for alert delivery failures
5. Still record the alert attempt in `alert_log` even if delivery failed, with a `failed` status field

---

## Watch Error State Recovery

- Errored watches must be manually resumed by the user via the dashboard
- The dashboard must display the last failure reason for each errored watch
- A "Resume Monitoring" button sets `status = 'active'` and resets `consecutive_failures = 0`
- The system does not auto-retry errored watches

---

## Known Acceptable Risk: Duplicate Alerts on Cron Restart

The 4-hour alert cooldown is enforced in application logic (comparing `last_alerted_at` timestamps), not at the database level. If a cron job crashes mid-cycle and restarts before `last_alerted_at` was written, a duplicate alert may fire for the same condition.

This is an accepted risk for a personal single-user tool. Do not add a database constraint or stored procedure to prevent this — the added complexity is not worth it at this scale. Document in code with a comment: `// Note: cooldown enforced in app logic; rare duplicate possible on crash-restart.`
