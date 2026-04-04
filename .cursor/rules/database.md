# database.md
# Seatcheck — Database Rules
# Place this file in .cursor/rules/

## What this file covers
Supabase setup, schema DDL, indexes, RLS, TypeScript types, and environment variables.
Read this before Phase 1 setup and before Phase 2 data layer work.

---

## Supabase Setup

1. After creating each table, immediately disable Row Level Security:
```sql
ALTER TABLE watches DISABLE ROW LEVEL SECURITY;
ALTER TABLE watch_urls DISABLE ROW LEVEL SECURITY;
ALTER TABLE snapshots DISABLE ROW LEVEL SECURITY;
ALTER TABLE alert_log DISABLE ROW LEVEL SECURITY;
```
RLS is enabled by default in new Supabase projects and will silently block all queries without policies. This is a personal tool with no auth — disable RLS on all tables.

2. Use the `SUPABASE_SERVICE_ROLE_KEY` (not the anon key) for all server-side operations in cron jobs and API routes. The anon key is only for client-side usage.

---

## Schema DDL

```sql
CREATE TABLE watches (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID,  -- Reserved for future auth — null until Supabase Auth is implemented in a future phase.
  label                  TEXT NOT NULL,
  price_threshold        NUMERIC,
  group_size             INTEGER,
  alert_email            BOOLEAN NOT NULL DEFAULT true,
  alert_sms              BOOLEAN NOT NULL DEFAULT false,
  alert_email_address    TEXT,
  alert_phone_e164       TEXT,
  frequency_minutes      INTEGER NOT NULL DEFAULT 60,
  status                 TEXT NOT NULL DEFAULT 'active'
                           CHECK (status IN ('active', 'paused', 'triggered', 'error')),
  js_rendered            BOOLEAN NOT NULL DEFAULT false,
  consecutive_failures   INTEGER NOT NULL DEFAULT 0,
  last_checked_at        TIMESTAMPTZ,
  last_alerted_at        TIMESTAMPTZ,
  last_failure_reason    TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE watch_urls (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  watch_id   UUID NOT NULL REFERENCES watches(id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  platform   TEXT CHECK (platform IS NULL OR platform IN ('ticketmaster', 'seatgeek', 'generic')),
  event_id   TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE snapshots (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  watch_id             UUID NOT NULL REFERENCES watches(id) ON DELETE CASCADE,
  extracted_price      TEXT,
  extracted_keywords   TEXT[],
  raw_text             TEXT,
  checked_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE alert_log (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  watch_id             UUID NOT NULL REFERENCES watches(id) ON DELETE CASCADE,
  trigger_type         TEXT NOT NULL CHECK (trigger_type IN ('price_drop', 'availability_change', 'group_size_match')),
  trigger_value        TEXT,
  alert_methods        TEXT[] NOT NULL,
  delivery_status      TEXT NOT NULL DEFAULT 'sent' CHECK (delivery_status IN ('sent', 'failed')),
  sent_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**`watches.user_id`:** Reserved for future auth — null until Supabase Auth is implemented in a future phase.

---

## Required Indexes

Run these immediately after creating the tables:

```sql
CREATE INDEX idx_watches_last_checked
  ON watches(last_checked_at ASC NULLS FIRST)
  WHERE status = 'active';

CREATE INDEX idx_watch_urls_watch_id ON watch_urls(watch_id);
CREATE INDEX idx_snapshots_watch_id ON snapshots(watch_id);
CREATE INDEX idx_alert_log_watch_id ON alert_log(watch_id);
```

Migrations: existing deployments that still have `url` / `platform` / `event_id` on `watches` should run `docs/phase2-ux-watch-urls-migration.sql` once.

---

## TypeScript Types

Create `/lib/types.ts` with interfaces matching the schema exactly.
Use this file for all Supabase query return types — never use `any`.

```typescript
export type WatchStatus = 'active' | 'paused' | 'triggered' | 'error';
export type Platform = 'ticketmaster' | 'seatgeek' | 'generic';
export type TriggerType = 'price_drop' | 'availability_change' | 'group_size_match';
export type DeliveryStatus = 'sent' | 'failed';

export interface Watch {
  id: string;
  user_id: string | null;
  label: string;
  price_threshold: number | null;
  group_size: number | null;
  alert_email: boolean;
  alert_sms: boolean;
  alert_email_address: string | null;
  alert_phone_e164: string | null;
  frequency_minutes: number;
  status: WatchStatus;
  js_rendered: boolean;
  consecutive_failures: number;
  last_checked_at: string | null;
  last_alerted_at: string | null;
  last_failure_reason: string | null;
  created_at: string;
}

export interface WatchUrl {
  id: string;
  watch_id: string;
  url: string;
  platform: Platform | null;
  event_id: string | null;
  created_at: string;
}

export interface WatchWithUrls extends Watch {
  watch_urls: WatchUrl[];
}

export interface Snapshot {
  id: string;
  watch_id: string;
  extracted_price: string | null;
  extracted_keywords: string[] | null;
  raw_text: string | null;
  checked_at: string;
}

export interface AlertLog {
  id: string;
  watch_id: string;
  trigger_type: TriggerType;
  trigger_value: string | null;
  alert_methods: string[];
  delivery_status: DeliveryStatus;
  sent_at: string;
}
```

---

## Environment Variables

Use these exact names in `.env.local`. Never use variations or abbreviations.

```
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
CRON_SECRET=
MONITOR_BATCH_SIZE=
RESEND_API_KEY=
RESEND_FROM_EMAIL=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
TICKETMASTER_API_KEY=
SEATGEEK_CLIENT_ID=
SEATGEEK_CLIENT_SECRET=
```

Also create a `.env.example` file with the same keys but empty values and commit it to git.
Never commit `.env.local`.

Add `.env.local` to `.gitignore` before the first commit.

---

## Seed Data Edge Cases

The `/lib/seed.ts` script (defined in Phase 2) must include these edge cases in addition to the five baseline watches:

- One watch with `last_alerted_at` set to 3.5 hours ago — tests near-cooldown-boundary behavior
- One watch with `consecutive_failures: 2` — tests one-failure-from-error state
- One watch with a `watch_urls` row having both `url` and `event_id` populated — tests dual URL + API monitoring path
- One watch with a null `last_checked_at` — tests NULLS FIRST ordering in cron query
- One watch with `price_threshold=100` and `last_alerted_at` set to 30 minutes ago — used to verify that editing the threshold resets cooldown and triggers a fresh alert
