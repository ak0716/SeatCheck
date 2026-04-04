export type WatchStatus = "active" | "paused" | "triggered" | "error";
export type Platform = "ticketmaster" | "seatgeek" | "generic";
export type TriggerType =
  | "price_drop"
  | "availability_change"
  | "group_size_match";
export type DeliveryStatus = "sent" | "failed";

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
