import "server-only";

import { Resend } from "resend";
import twilio from "twilio";

import type { TriggerType } from "@/lib/types";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTwilioPlaceholder(sid: string, token: string, from: string): boolean {
  const s = sid.toLowerCase();
  const t = token.toLowerCase();
  const f = from.toLowerCase();
  if (s.includes("your_") || t.includes("your_") || f.includes("your_")) return true;
  if (/^acx+$/i.test(sid)) return true;
  return false;
}

function twilioEnv():
  | { ok: true; sid: string; token: string; from: string }
  | { ok: false; reason: string } {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim() ?? "";
  const token = process.env.TWILIO_AUTH_TOKEN?.trim() ?? "";
  const from = process.env.TWILIO_PHONE_NUMBER?.trim() ?? "";
  if (!sid || !token || !from) {
    return { ok: false, reason: "Twilio environment variables are not fully configured" };
  }
  if (isTwilioPlaceholder(sid, token, from)) {
    return { ok: false, reason: "Twilio credentials look like placeholders" };
  }
  return { ok: true, sid, token, from };
}

export type DeliverAlertInput = {
  watchId: string;
  label: string;
  triggerType: TriggerType;
  /** When set, used as the email subject instead of the default from triggerType + label. */
  emailSubject?: string | null;
  body: string;
  alert_email: boolean;
  alert_sms: boolean;
  alert_email_address: string | null;
  alert_phone_e164: string | null;
};

export async function deliverAlert(
  input: DeliverAlertInput,
): Promise<{ methods: string[]; ok: boolean }> {
  const methods: string[] = [];
  let ok = true;

  const fromEmail =
    process.env.RESEND_FROM_EMAIL?.trim() || "Seatcheck <onboarding@resend.dev>";
  const subject =
    input.emailSubject?.trim() ||
    `Seatcheck: ${input.triggerType.replace(/_/g, " ")} — ${input.label}`;

  if (input.alert_email && input.alert_email_address) {
    methods.push("email");
    const key = process.env.RESEND_API_KEY?.trim();
    const sendOnce = async (): Promise<boolean> => {
      if (!key) {
        console.error(
          `[deliver-alert] watch ${input.watchId} email: RESEND_API_KEY missing`,
        );
        return false;
      }
      try {
        const resend = new Resend(key);
        const { error } = await resend.emails.send({
          from: fromEmail,
          to: input.alert_email_address!,
          subject,
          text: input.body,
        });
        if (error) {
          console.error(
            `[deliver-alert] watch ${input.watchId} Resend: ${error.message}`,
          );
          return false;
        }
        return true;
      } catch (e) {
        console.error(`[deliver-alert] watch ${input.watchId} email: ${String(e)}`);
        return false;
      }
    };

    let success = await sendOnce();
    if (!success) {
      // NOTE: This 60s retry cannot complete on Vercel Hobby (10s serverless max); use Pro or accept single attempt.
      await sleep(60_000);
      success = await sendOnce();
    }
    ok = ok && success;
  }

  if (input.alert_sms && input.alert_phone_e164) {
    const tw = twilioEnv();
    if (!tw.ok) {
      console.warn(`[deliver-alert] watch ${input.watchId} SMS skipped: ${tw.reason}`);
    } else {
      methods.push("sms");
      const sendOnce = async (): Promise<boolean> => {
        try {
          const client = twilio(tw.sid, tw.token);
          await client.messages.create({
            body: input.body.slice(0, 1600),
            from: tw.from,
            to: input.alert_phone_e164!,
          });
          return true;
        } catch (e) {
          console.error(`[deliver-alert] watch ${input.watchId} Twilio: ${String(e)}`);
          return false;
        }
      };

      let success = await sendOnce();
      if (!success) {
        // NOTE: This 60s retry cannot complete on Vercel Hobby (10s serverless max); use Pro or accept single attempt.
        await sleep(60_000);
        success = await sendOnce();
      }
      ok = ok && success;
    }
  }

  return { methods, ok };
}
