import { NextResponse } from "next/server";

import { sendWatchCreatedConfirmations } from "@/lib/notify";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  fetchAllWatchesWithUrls,
  fetchWatchWithUrlsById,
} from "@/lib/watch-queries";
import { parseWatchCreatePayload } from "@/lib/watch-payload";

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const data = await fetchAllWatchesWithUrls(supabase);
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: "Unexpected server error", details: String(error) },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = parseWatchCreatePayload(body);
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const insertRow = {
      ...parsed.watch,
      frequency_minutes: 60,
      status: "active" as const,
      js_rendered: false,
      consecutive_failures: 0,
    };

    const { data: watch, error: insertError } = await supabase
      .from("watches")
      .insert(insertRow)
      .select("*")
      .single();

    if (insertError || !watch) {
      return NextResponse.json(
        {
          error: "Failed to create watch",
          details: insertError?.message ?? "No row returned",
        },
        { status: 500 },
      );
    }

    const urlRows = parsed.urls.map((u) => ({
      watch_id: watch.id,
      url: u.url,
      platform: u.platform,
      event_id: u.event_id,
    }));

    const { error: urlsError } = await supabase.from("watch_urls").insert(urlRows);

    if (urlsError) {
      await supabase.from("watches").delete().eq("id", watch.id);
      return NextResponse.json(
        { error: "Failed to create watch URLs", details: urlsError.message },
        { status: 500 },
      );
    }

    const firstUrl = parsed.urls[0]?.url ?? null;
    const warnings = await sendWatchCreatedConfirmations({
      label: watch.label,
      first_watch_url: firstUrl,
      price_threshold: watch.price_threshold,
      alert_email: watch.alert_email,
      alert_sms: watch.alert_sms,
      alert_email_address: watch.alert_email_address,
      alert_phone_e164: watch.alert_phone_e164,
    });

    const full = await fetchWatchWithUrlsById(supabase, watch.id);

    if (!full) {
      return NextResponse.json(
        {
          data: watch,
          warnings: warnings.length ? warnings : undefined,
        },
        { status: 201 },
      );
    }

    return NextResponse.json(
      {
        data: full,
        warnings: warnings.length ? warnings : undefined,
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Unexpected server error", details: String(error) },
      { status: 500 },
    );
  }
}
