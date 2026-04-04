-- Seatcheck: migrate watches to watch_urls + contact columns
-- Run in Supabase SQL Editor AFTER phase2-database-setup.sql has been applied.

-- 1) Create watch_urls
CREATE TABLE IF NOT EXISTS watch_urls (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  watch_id   UUID NOT NULL REFERENCES watches(id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  platform   TEXT CHECK (platform IS NULL OR platform IN ('ticketmaster', 'seatgeek', 'generic')),
  event_id   TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_watch_urls_watch_id ON watch_urls(watch_id);

ALTER TABLE watch_urls DISABLE ROW LEVEL SECURITY;

-- 2) Backfill from existing watches (idempotent per watch)
INSERT INTO watch_urls (watch_id, url, platform, event_id)
SELECT w.id, w.url, w.platform, w.event_id
FROM watches w
WHERE NOT EXISTS (SELECT 1 FROM watch_urls wu WHERE wu.watch_id = w.id);

-- 3) Add contact columns (nullable)
ALTER TABLE watches ADD COLUMN IF NOT EXISTS alert_email_address TEXT;
ALTER TABLE watches ADD COLUMN IF NOT EXISTS alert_phone_e164 TEXT;

-- 4) Drop old columns from watches
ALTER TABLE watches DROP COLUMN IF EXISTS url;
ALTER TABLE watches DROP COLUMN IF EXISTS platform;
ALTER TABLE watches DROP COLUMN IF EXISTS event_id;
