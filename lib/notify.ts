import "server-only";

import { Resend } from "resend";
import twilio from "twilio";

export type WatchConfirmationNotifyInput = {
  label: string;
  alert_email: boolean;
  alert_sms: boolean;
  alert_email_address: string | null;
  alert_phone_e164: string | null;
};

export type NotifyWarning = { channel: "email" | "sms"; message: string };

export async function sendWatchCreatedConfirmations(
  input: WatchConfirmationNotifyInput,
): Promise<NotifyWarning[]> {
  const warnings: NotifyWarning[] = [];

  if (input.alert_email && input.alert_email_address) {
    const key = process.env.RESEND_API_KEY?.trim();
    if (!key) {
      warnings.push({
        channel: "email",
        message: "RESEND_API_KEY is not configured",
      });
    } else {
      try {
        const resend = new Resend(key);
        const from =
          process.env.RESEND_FROM_EMAIL?.trim() || "Seatcheck <onboarding@resend.dev>";
        const { error } = await resend.emails.send({
          from,
          to: input.alert_email_address,
          subject: `You're now watching ${input.label}`,
          text: `You're now watching ${input.label}. We'll alert you when tickets match your criteria.`,
        });
        if (error) {
          warnings.push({
            channel: "email",
            message: error.message,
          });
        }
      } catch (e) {
        warnings.push({
          channel: "email",
          message: String(e),
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
