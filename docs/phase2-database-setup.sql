CREATE TABLE watches (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

CREATE INDEX idx_watch_urls_watch_id ON watch_urls(watch_id);

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

CREATE INDEX idx_watches_last_checked
  ON watches(last_checked_at ASC NULLS FIRST)
  WHERE status = 'active';

CREATE INDEX idx_snapshots_watch_id ON snapshots(watch_id);
CREATE INDEX idx_alert_log_watch_id ON alert_log(watch_id);

ALTER TABLE watches DISABLE ROW LEVEL SECURITY;
ALTER TABLE watch_urls DISABLE ROW LEVEL SECURITY;
ALTER TABLE snapshots DISABLE ROW LEVEL SECURITY;
ALTER TABLE alert_log DISABLE ROW LEVEL SECURITY;
