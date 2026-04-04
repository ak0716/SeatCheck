import type { Platform, WatchStatus } from "@/lib/types";
import { isValidHttpsWatchUrl } from "@/lib/url-validation";

export type WatchUrlInput = {
  url: string;
  platform: Platform | null;
  event_id: string | null;
};

export type WatchCreateFields = {
  label: string;
  price_threshold: number | null;
  group_size: number | null;
  alert_email: boolean;
  alert_sms: boolean;
  alert_email_address: string | null;
  alert_phone_e164: string | null;
};

export type WatchUpdateFields = Partial<WatchCreateFields> & {
  status?: WatchStatus;
};

function parseNullableString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function parseBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

function parsePlatform(value: unknown): Platform | null {
  if (value === "ticketmaster" || value === "seatgeek" || value === "generic") {
    return value;
  }
  return null;
}

function parseStatus(value: unknown, fallback: WatchStatus): WatchStatus {
  if (
    value === "active" ||
    value === "paused" ||
    value === "triggered" ||
    value === "error"
  ) {
    return value;
  }
  return fallback;
}

function parseUrlInputs(value: unknown): WatchUrlInput[] | null {
  if (!Array.isArray(value)) return null;
  const out: WatchUrlInput[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const row = item as Record<string, unknown>;
    const url = typeof row.url === "string" ? row.url.trim() : "";
    if (!url || !isValidHttpsWatchUrl(url)) return null;
    out.push({
      url,
      platform:
        row.platform === undefined || row.platform === null
          ? null
          : parsePlatform(row.platform),
      event_id: parseNullableString(row.event_id),
    });
  }
  return out;
}

export function validateAlertChannels(
  alert_email: boolean,
  alert_sms: boolean,
  alert_email_address: string | null,
  alert_phone_e164: string | null,
): string | undefined {
  if (!alert_email && !alert_sms) {
    return "At least one alert method must be enabled";
  }
  if (alert_email && !alert_email_address) {
    return "alert_email_address is required when alert_email is true";
  }
  if (alert_sms && !alert_phone_e164) {
    return "alert_phone_e164 is required when alert_sms is true";
  }
  return undefined;
}

export function parseWatchCreatePayload(body: unknown):
  | { watch: WatchCreateFields; urls: WatchUrlInput[]; error?: undefined }
  | { watch?: undefined; urls?: undefined; error: string } {
  if (!body || typeof body !== "object") {
    return { error: "Invalid JSON payload" };
  }

  const payload = body as Record<string, unknown>;
  const label =
    typeof payload.label === "string" ? payload.label.trim() : "";
  if (!label) return { error: "label is required" };

  const urls = parseUrlInputs(payload.urls);
  if (!urls || urls.length === 0) {
    return { error: "urls must be a non-empty array" };
  }
  if (urls.length > 3) {
    return { error: "At most 3 URLs allowed" };
  }

  const frequencyRaw = payload.frequency_minutes;
  const frequencyParsed = parseNullableNumber(frequencyRaw);
  if (frequencyRaw !== undefined && frequencyParsed !== 60) {
    return { error: "frequency_minutes must be 60" };
  }

  const alert_email = parseBoolean(payload.alert_email, false);
  const alert_sms = parseBoolean(payload.alert_sms, false);
  const alert_email_address = parseNullableString(payload.alert_email_address);
  const alert_phone_e164 = parseNullableString(payload.alert_phone_e164);

  const alertErr = validateAlertChannels(
    alert_email,
    alert_sms,
    alert_email_address,
    alert_phone_e164,
  );
  if (alertErr) return { error: alertErr };

  const watch: WatchCreateFields = {
    label,
    price_threshold: parseNullableNumber(payload.price_threshold),
    group_size: parseNullableNumber(payload.group_size),
    alert_email,
    alert_sms,
    alert_email_address,
    alert_phone_e164,
  };

  return { watch, urls };
}

export function parseWatchUpdatePayload(body: unknown):
  | { data: WatchUpdateFields; urls?: WatchUrlInput[]; error?: undefined }
  | { data?: undefined; urls?: undefined; error: string } {
  if (!body || typeof body !== "object") {
    return { error: "Invalid JSON payload" };
  }

  const payload = body as Record<string, unknown>;
  const data: WatchUpdateFields = {};

  if (payload.label !== undefined) {
    if (typeof payload.label !== "string" || !payload.label.trim()) {
      return { error: "label must be a non-empty string" };
    }
    data.label = payload.label.trim();
  }

  if (payload.price_threshold !== undefined) {
    data.price_threshold = parseNullableNumber(payload.price_threshold);
  }
  if (payload.group_size !== undefined) {
    data.group_size = parseNullableNumber(payload.group_size);
  }

  if (payload.alert_email !== undefined) {
    data.alert_email = parseBoolean(payload.alert_email, false);
  }
  if (payload.alert_sms !== undefined) {
    data.alert_sms = parseBoolean(payload.alert_sms, false);
  }
  if (payload.alert_email_address !== undefined) {
    data.alert_email_address = parseNullableString(payload.alert_email_address);
  }
  if (payload.alert_phone_e164 !== undefined) {
    data.alert_phone_e164 = parseNullableString(payload.alert_phone_e164);
  }

  if (payload.status !== undefined) {
    data.status = parseStatus(payload.status, "active");
  }

  if (payload.frequency_minutes !== undefined) {
    const frequencyParsed = parseNullableNumber(payload.frequency_minutes);
    if (frequencyParsed !== 60) {
      return { error: "frequency_minutes must be 60" };
    }
  }

  let urls: WatchUrlInput[] | undefined;
  if (payload.urls !== undefined) {
    const parsed = parseUrlInputs(payload.urls);
    if (!parsed || parsed.length === 0) {
      return { error: "urls must be a non-empty array when provided" };
    }
    if (parsed.length > 3) {
      return { error: "At most 3 URLs allowed" };
    }
    urls = parsed;
  }

  if (Object.keys(data).length === 0 && urls === undefined) {
    return { error: "No fields provided for update" };
  }

  return { data, urls };
}
