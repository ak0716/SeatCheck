import { NextResponse } from "next/server";

import { verifyCronSecret } from "@/lib/monitor/cron-auth";
import { runMonitor } from "@/lib/monitor/run-monitor";

export const dynamic = "force-dynamic";
/** Raise on Pro if many watches + 60s alert retries; Hobby stays at 10s (retries cannot finish). */
export const maxDuration = 120;

export async function POST(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const summary = await runMonitor();
    return NextResponse.json({ ok: true, ...summary });
  } catch (e) {
    console.error(`[cron/trigger] ${String(e)}`);
    return NextResponse.json({ error: "Monitor run failed" }, { status: 500 });
  }
}
