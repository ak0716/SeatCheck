# Phase 2 Database Runbook

Run this once in Supabase SQL Editor to create the Watch List data layer.

## 1) Create tables, indexes, and disable RLS

Open `docs/phase2-database-setup.sql`, copy all SQL, and run it in Supabase SQL Editor.

For an **existing** project that already ran the older `phase2-database-setup.sql` (with `url` on `watches`), run `docs/phase2-ux-watch-urls-migration.sql` instead of recreating tables.

## 2) Verify tables and indexes

In Supabase Table Editor, confirm:

- `watches` exists
- `watch_urls` exists
- `snapshots` exists
- `alert_log` exists
- indexes exist:
  - `idx_watches_last_checked`
  - `idx_watch_urls_watch_id`
  - `idx_snapshots_watch_id`
  - `idx_alert_log_watch_id`

## 3) Verify RLS is disabled

Run this query in the SQL Editor (paste **only** the `SELECT` lines—if your copy includes Markdown code fences like `` ```sql `` or `` ``` ``, delete those; Supabase runs plain SQL, not Markdown):

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('watches', 'watch_urls', 'snapshots', 'alert_log');
```

Expected result: `rowsecurity = false` for all four tables.

## 4) Continue with app development

Run locally:

```bash
pnpm dev
```
