import "server-only";

import { Pool } from "pg";

import { shouldAlertAvailability } from "@/lib/monitor/availability";
import { deliverAlert } from "@/lib/monitor/deliver-alert";
import { fetchPage } from "@/lib/monitor/fetch-page";
import { parseHtml } from "@/lib/monitor/parse-html";
import {
  parseDollarString,
  shouldAlertPriceDrop,
} from "@/lib/monitor/price-compare";

const COOLDOWN_MS = 4 * 60 * 60 * 1000;

type WatchRow = {
  id: string;
  label: string;
  price_threshold: string | null;
  alert_email: boolean;
  alert_sms: boolean;
  alert_email_address: string | null;
  alert_phone_e164: string | null;
  status: string;
  consecutive_failures: number;
  last_alerted_at: Date | string | null;
};

type SnapshotRow = {
  extracted_price: string | null;
  extracted_keywords: string[] | null;
};

function parseBatchSize(): number {
  const raw = process.env.MONITOR_BATCH_SIZE?.trim();
  if (!raw) return 100;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return 100;
  return n;
}

function thresholdNumber(w: WatchRow): number | null {
  if (w.price_threshold == null || w.price_threshold === "") return null;
  const v = Number(w.price_threshold);
  return Number.isFinite(v) ? v : null;
}

async function fetchAndAggregate(
  watchId: string,
  urls: { url: string }[],
): Promise<{
  extracted_price: string | null;
  extracted_keywords: string[];
  raw_text: string;
}> {
  type Acc = {
    priceNum: number;
    priceText: string | null;
    keywords: string[];
    rawText: string;
  };
  const parts: Acc[] = [];
  for (const row of urls) {
    const html = await fetchPage(row.url);
    const parsed = parseHtml(html, watchId);
    const n = parseDollarString(parsed.priceText);
    parts.push({
      priceNum: n ?? NaN,
      priceText: parsed.priceText,
      keywords: parsed.keywords,
      rawText: parsed.rawText,
    });
  }

  let minNum = Infinity;
  let extracted_price: string | null = null;
  for (const p of parts) {
    if (p.priceText != null && Number.isFinite(p.priceNum)) {
      if (p.priceNum < minNum) {
        minNum = p.priceNum;
        extracted_price = p.priceText;
      }
    }
  }

  const kwSet = new Set<string>();
  for (const p of parts) {
    for (const k of p.keywords) kwSet.add(k);
  }
  const extracted_keywords = [...kwSet];

  const raw_text = parts
    .map((p) => p.rawText)
    .join("\n\n")
    .slice(0, 80_000);

  return { extracted_price, extracted_keywords, raw_text };
}

async function handleLayer1Failure(
  client: import("pg").PoolClient,
  watch: WatchRow,
  err: Error,
) {
  const reason = err.message.slice(0, 2000);
  await client.query(
    `UPDATE watches SET
      consecutive_failures = consecutive_failures + 1,
      last_checked_at = NOW(),
      last_failure_reason = $2,
      status = CASE WHEN consecutive_failures + 1 >= 3 THEN 'error' ELSE status END
    WHERE id = $1`,
    [watch.id, reason],
  );
}

async function maybeFireAlerts(
  pool: Pool,
  watch: WatchRow,
  prevSnap: SnapshotRow | null,
  agg: {
    extracted_price: string | null;
    extracted_keywords: string[];
    raw_text: string;
  },
  lastAlertedAt: Date | null,
) {
  const unusable =
    agg.extracted_price == null && agg.extracted_keywords.length === 0;
  if (unusable) {
    return;
  }

  const threshold = thresholdNumber(watch);
  const prevPrice = prevSnap?.extracted_price ?? null;
  const prevKw =
    prevSnap == null ? null : (prevSnap.extracted_keywords ?? []);

  let needPrice = shouldAlertPriceDrop(
    prevSnap != null,
    prevPrice,
    agg.extracted_price,
    threshold,
  );
  let needAvail = shouldAlertAvailability(prevKw, agg.extracted_keywords);

  const now = Date.now();
  // Note: cooldown enforced in app logic; rare duplicate possible on crash-restart.
  const cooldownOk =
    lastAlertedAt == null || now - lastAlertedAt.getTime() >= COOLDOWN_MS;
  if (!cooldownOk) {
    needPrice = false;
    needAvail = false;
  }

  if (!needPrice && !needAvail) return;

  const alertBase = {
    watchId: watch.id,
    label: watch.label,
    alert_email: watch.alert_email,
    alert_sms: watch.alert_sms,
    alert_email_address: watch.alert_email_address,
    alert_phone_e164: watch.alert_phone_e164,
  };

  const client = await pool.connect();
  try {
    if (needPrice) {
      const body =
        `Seatcheck alert: "${watch.label}"\n\n` +
        `Trigger: price_drop\n` +
        `Current extracted price: ${agg.extracted_price ?? "n/a"}\n` +
        `Watch ID: ${watch.id}`;
      const { methods, ok } = await deliverAlert({
        ...alertBase,
        triggerType: "price_drop",
        body,
      });
      await client.query(
        `INSERT INTO alert_log (watch_id, trigger_type, trigger_value, alert_methods, delivery_status)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          watch.id,
          "price_drop",
          agg.extracted_price,
          methods,
          ok ? "sent" : "failed",
        ],
      );
    }

    if (needAvail) {
      const body =
        `Seatcheck alert: "${watch.label}"\n\n` +
        `Trigger: availability_change\n` +
        `Keywords: ${agg.extracted_keywords.join(", ") || "(none)"}\n` +
        `Watch ID: ${watch.id}`;
      const { methods, ok } = await deliverAlert({
        ...alertBase,
        triggerType: "availability_change",
        body,
      });
      await client.query(
        `INSERT INTO alert_log (watch_id, trigger_type, trigger_value, alert_methods, delivery_status)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          watch.id,
          "availability_change",
          agg.extracted_keywords.join(", ").slice(0, 500),
          methods,
          ok ? "sent" : "failed",
        ],
      );
    }

    await client.query(
      `UPDATE watches SET last_alerted_at = NOW() WHERE id = $1`,
      [watch.id],
    );
  } finally {
    client.release();
  }
}

async function processOneWatch(
  pool: Pool,
): Promise<"empty" | "processed" | "abort"> {
  const client = await pool.connect();
  let watch: WatchRow | undefined;
  let prevSnap: SnapshotRow | null = null;
  let lastAlertedAt: Date | null = null;
  let aggregated: Awaited<ReturnType<typeof fetchAndAggregate>> | null = null;

  try {
    await client.query("BEGIN");

    const wRes = await client.query<WatchRow>(
      `SELECT * FROM watches
       WHERE status = 'active'
       ORDER BY last_checked_at ASC NULLS FIRST
       FOR UPDATE SKIP LOCKED
       LIMIT 1`,
    );

    if (wRes.rowCount === 0) {
      await client.query("COMMIT");
      return "empty";
    }

    watch = wRes.rows[0];
    lastAlertedAt = watch.last_alerted_at
      ? new Date(watch.last_alerted_at as string | Date)
      : null;

    const uRes = await client.query<{ url: string }>(
      `SELECT url FROM watch_urls WHERE watch_id = $1 ORDER BY created_at ASC`,
      [watch.id],
    );

    if (uRes.rowCount === 0) {
      console.error(`[run-monitor] watch ${watch.id} has no URLs`);
      await handleLayer1Failure(client, watch, new Error("no watch_urls rows"));
      await client.query("COMMIT");
      return "processed";
    }

    const pRes = await client.query<SnapshotRow>(
      `SELECT extracted_price, extracted_keywords FROM snapshots
       WHERE watch_id = $1
       ORDER BY checked_at DESC
       LIMIT 1`,
    );
    prevSnap = pRes.rows[0] ?? null;

    let agg: Awaited<ReturnType<typeof fetchAndAggregate>>;
    try {
      agg = await fetchAndAggregate(watch.id, uRes.rows);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[run-monitor] watch ${watch.id} fetch/parse failed: ${msg}`);
      await handleLayer1Failure(
        client,
        watch,
        e instanceof Error ? e : new Error(msg),
      );
      await client.query("COMMIT");
      return "processed";
    }

    const jsRendered =
      agg.extracted_price == null && agg.extracted_keywords.length === 0;

    await client.query(
      `INSERT INTO snapshots (watch_id, extracted_price, extracted_keywords, raw_text)
       VALUES ($1, $2, $3, $4)`,
      [watch.id, agg.extracted_price, agg.extracted_keywords, agg.raw_text],
    );

    try {
      await client.query(
        `DELETE FROM snapshots
         WHERE watch_id = $1
           AND id NOT IN (
             SELECT id FROM snapshots
             WHERE watch_id = $1
             ORDER BY checked_at DESC
             LIMIT 2
           )`,
        [watch.id],
      );
    } catch (cleanupErr) {
      console.error(
        `[run-monitor] snapshot cleanup failed watch_id=${watch.id}: ${String(cleanupErr)}`,
      );
    }

    await client.query(
      `UPDATE watches SET
         consecutive_failures = 0,
         last_failure_reason = NULL,
         last_checked_at = NOW(),
         js_rendered = $2
       WHERE id = $1`,
      [watch.id, jsRendered],
    );

    await client.query("COMMIT");
    aggregated = agg;
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore */
    }
    console.error(`[run-monitor] Layer 3 database error: ${String(e)}`);
    return "abort";
  } finally {
    client.release();
  }

  if (watch != null && aggregated != null) {
    try {
      await maybeFireAlerts(pool, watch, prevSnap, aggregated, lastAlertedAt);
    } catch (e) {
      console.error(`[run-monitor] Layer 3 alert/DB error: ${String(e)}`);
      return "abort";
    }
  }

  return "processed";
}

export type MonitorRunSummary = {
  processed: number;
  stoppedReason: "limit" | "empty" | "abort";
};

export async function runMonitor(): Promise<MonitorRunSummary> {
  const connStr = process.env.DATABASE_URL?.trim();
  if (!connStr) {
    console.error("[run-monitor] DATABASE_URL is not set");
    throw new Error("DATABASE_URL is not configured");
  }

  const batch = parseBatchSize();
  const pool = new Pool({ connectionString: connStr, max: 3 });
  let processed = 0;
  let stoppedReason: MonitorRunSummary["stoppedReason"] = "limit";

  try {
    for (let i = 0; i < batch; i++) {
      const result = await processOneWatch(pool);
      if (result === "abort") {
        stoppedReason = "abort";
        break;
      }
      if (result === "empty") {
        stoppedReason = "empty";
        break;
      }
      processed += 1;
    }
  } finally {
    try {
      await pool.end();
    } catch (e) {
      console.error(`[run-monitor] pool.end failed: ${String(e)}`);
    }
  }

  return { processed, stoppedReason };
}
