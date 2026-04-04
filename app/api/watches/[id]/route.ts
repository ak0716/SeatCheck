import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Watch } from "@/lib/types";
import { fetchWatchWithUrlsById } from "@/lib/watch-queries";
import {
  parseWatchUpdatePayload,
  validateAlertChannels,
} from "@/lib/watch-payload";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const parsed = parseWatchUpdatePayload(body);

    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const { data: current, error: fetchError } = await supabase
      .from("watches")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !current) {
      return NextResponse.json({ error: "Watch not found" }, { status: 404 });
    }

    const row = current as Watch;
    const mergedEmail =
      parsed.data.alert_email !== undefined
        ? parsed.data.alert_email
        : row.alert_email;
    const mergedSms =
      parsed.data.alert_sms !== undefined ? parsed.data.alert_sms : row.alert_sms;
    const mergedAddr =
      parsed.data.alert_email_address !== undefined
        ? parsed.data.alert_email_address
        : row.alert_email_address;
    const mergedPhone =
      parsed.data.alert_phone_e164 !== undefined
        ? parsed.data.alert_phone_e164
        : row.alert_phone_e164;

    const touchesAlerts =
      parsed.data.alert_email !== undefined ||
      parsed.data.alert_sms !== undefined ||
      parsed.data.alert_email_address !== undefined ||
      parsed.data.alert_phone_e164 !== undefined;

    if (touchesAlerts) {
      const alertErr = validateAlertChannels(
        mergedEmail,
        mergedSms,
        mergedAddr,
        mergedPhone,
      );
      if (alertErr) {
        return NextResponse.json({ error: alertErr }, { status: 400 });
      }
    }

    const patch = parsed.data;

    if (Object.keys(patch).length > 0) {
      const { error: updateError } = await supabase
        .from("watches")
        .update(patch)
        .eq("id", id);

      if (updateError) {
        return NextResponse.json(
          { error: "Failed to update watch", details: updateError.message },
          { status: 500 },
        );
      }
    }

    if (parsed.urls !== undefined) {
      const { error: delError } = await supabase
        .from("watch_urls")
        .delete()
        .eq("watch_id", id);

      if (delError) {
        return NextResponse.json(
          { error: "Failed to replace URLs", details: delError.message },
          { status: 500 },
        );
      }

      const urlRows = parsed.urls.map((u) => ({
        watch_id: id,
        url: u.url,
        platform: u.platform,
        event_id: u.event_id,
      }));

      const { error: insError } = await supabase.from("watch_urls").insert(urlRows);

      if (insError) {
        return NextResponse.json(
          { error: "Failed to insert URLs", details: insError.message },
          { status: 500 },
        );
      }
    }

    const data = await fetchWatchWithUrlsById(supabase, id);

    if (!data) {
      return NextResponse.json({ error: "Failed to load watch" }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: "Unexpected server error", details: String(error) },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = createServerSupabaseClient();

    const { error } = await supabase.from("watches").delete().eq("id", id);
    if (error) {
      return NextResponse.json(
        { error: "Failed to delete watch", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Unexpected server error", details: String(error) },
      { status: 500 },
    );
  }
}
