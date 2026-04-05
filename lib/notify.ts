import "server-only";

import { Resend } from "resend";
import twilio from "twilio";

export type WatchConfirmationNotifyInput = {
  label: string;
  /** First ticket URL, if any (for the confirmation body). */
  first_watch_url: string | null;
  price_threshold: number | string | null;
  alert_email: boolean;
  alert_sms: boolean;
  alert_email_address: string | null;
  alert_phone_e164: string | null;
};

export type NotifyWarning = { channel: "email" | "sms"; message: string };

function publicAppOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "")}`;
  return "http://localhost:3000";
}

function formatPriceLine(threshold: number | string | null | undefined): string {
  if (threshold === null || threshold === undefined || threshold === "") {
    return "Any price";
  }
  const n = typeof threshold === "number" ? threshold : Number(threshold);
  if (!Number.isFinite(n)) return "Any price";
  return `$${n} or less per ticket`;
}

function buildWatchCreatedEmailText(input: WatchConfirmationNotifyInput): string {
  const origin = publicAppOrigin();
  const listUrl = `${origin}/`;
  const priceLine = formatPriceLine(input.price_threshold);
  const urlBlock = input.first_watch_url
    ? `Ticket page:\n${input.first_watch_url}\n\n`
    : "";

  return (
    `Your Seatcheck watch is active.\n\n` +
    `Watching: ${input.label}\n\n` +
    `${urlBlock}` +
    `Price: ${priceLine}\n\n` +
    `We'll email you when we find tickets that match your criteria.\n\n` +
    `View your watch list: ${listUrl}\n`
  );
}

export async function sendWatchCreatedConfirmations(
  input: WatchConfirmationNotifyInput,
): Promise<NotifyWarning[]> {
  const warnings: NotifyWarning[] = [];

  if (input.alert_email && input.alert_email_address) {
    const key = process.env.RESEND_API_KEY?.trim();
    const from =
      process.env.RESEND_FROM_EMAIL?.trim() || "Seatcheck <onboarding@resend.dev>";
    if (!key) {
      const msg = "RESEND_API_KEY is not configured";
      console.error(`[notify] watch-created email skipped: ${msg}`);
      warnings.push({ channel: "email", message: msg });
    } else {
      try {
        const resend = new Resend(key);
        const { error } = await resend.emails.send({
          from,
          to: input.alert_email_address,
          subject: `Your Seatcheck watch is active — ${input.label}`,
          text: buildWatchCreatedEmailText(input),
        });
        if (error) {
          console.error(
            `[notify] watch-created email failed for ${input.alert_email_address}: ${error.message}`,
          );
          warnings.push({
            channel: "email",
            message: error.message,
          });
        }
      } catch (e) {
        const msg = String(e);
        console.error(
          `[notify] watch-created email failed for ${input.alert_email_address}: ${msg}`,
        );
        warnings.push({
          channel: "email",
          message: msg,
        });
      }
    }
  }

  if (input.alert_sms && input.alert_phone_e164) {
    const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
    const token = process.env.TWILIO_AUTH_TOKEN?.trim();
    const from = process.env.TWILIO_PHONE_NUMBER?.trim();
    if (!sid || !token || !from) {
      warnings.push({
        channel: "sms",
        message: "Twilio environment variables are not fully configured",
      });
    } else {
      try {
        const client = twilio(sid, token);
        await client.messages.create({
          body: `Seatcheck: Now watching ${input.label}. We'll text you when tickets are available.`,
          from,
          to: input.alert_phone_e164,
        });
      } catch (e) {
        warnings.push({
          channel: "sms",
          message: String(e),
        });
      }
    }
  }

  return warnings;
}
