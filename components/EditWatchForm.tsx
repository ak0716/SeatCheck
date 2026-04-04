"use client";

import { useState, type FormEvent } from "react";

import type { AddWatchSource } from "@/components/add-watch/types";
import type { WatchWithUrls } from "@/lib/types";

import { FrequencySelector } from "@/components/FrequencySelector";

type PreviewResponse = {
  suggestedLabel: string | null;
  platform: "ticketmaster" | "seatgeek" | "generic" | null;
  eventId: string | null;
};

type EditWatchFormProps = {
  watch: WatchWithUrls;
  onSaved: () => void;
  onCancel: () => void;
};

function mapWatchToSources(w: WatchWithUrls): AddWatchSource[] {
  return (w.watch_urls ?? []).map((row) => ({
    url: row.url,
    platform: row.platform,
    eventId: row.event_id,
  }));
}

export function EditWatchForm({ watch, onSaved, onCancel }: EditWatchFormProps) {
  const [label, setLabel] = useState(watch.label);
  const [sources, setSources] = useState<AddWatchSource[]>(() => mapWatchToSources(watch));
  const [addUrl, setAddUrl] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [addLoading, setAddLoading] = useState(false);
  const [priceThreshold, setPriceThreshold] = useState(
    watch.price_threshold?.toString() ?? "",
  );
  const [groupSize, setGroupSize] = useState(watch.group_size?.toString() ?? "");
  const [alertEmail, setAlertEmail] = useState(watch.alert_email);
  const [alertSms, setAlertSms] = useState(watch.alert_sms);
  const [emailAddress, setEmailAddress] = useState(watch.alert_email_address ?? "");
  const [phone, setPhone] = useState(watch.alert_phone_e164 ?? "");
  const [frequency, setFrequency] = useState(60);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function runPreview(
    url: string,
  ): Promise<{ ok: true; data: PreviewResponse } | { ok: false; error: string }> {
    const response = await fetch("/api/ticket-page-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: url.trim() }),
    });
    const body = (await response.json()) as PreviewResponse & { error?: string };
    if (!response.ok) {
      return { ok: false, error: body.error ?? "Preview request failed" };
    }
    return {
      ok: true,
      data: {
        suggestedLabel: body.suggestedLabel,
        platform: body.platform,
        eventId: body.eventId,
      },
    };
  }

  async function handleAddUrl() {
    const u = addUrl.trim();
    if (!u.startsWith("https://")) {
      setAddError("Please enter a valid URL starting with https://");
      return;
    }
    if (sources.length >= 3) return;
    setAddError(null);
    setAddLoading(true);
    const result = await runPreview(u);
    setAddLoading(false);
    if (!result.ok) {
      setAddError(result.error);
      return;
    }
    const p = result.data;
    setSources((prev) => [...prev, { url: u, platform: p.platform, eventId: p.eventId }]);
    setAddUrl("");
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sources.length === 0) {
      setError("At least one URL is required");
      return;
    }
    if (!alertEmail && !alertSms) {
      setError("At least one alert method must be enabled");
      return;
    }
    if (alertEmail && !emailAddress.trim()) {
      setError("Email address is required when email alerts are on");
      return;
    }
    if (alertSms && !phone.trim()) {
      setError("Phone number is required when SMS alerts are on");
      return;
    }

    setSubmitting(true);
    setError("");

    const response = await fetch(`/api/watches/${watch.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label,
        urls: sources.map((s) => ({
          url: s.url,
          platform: s.platform,
          event_id: s.eventId,
        })),
        price_threshold: priceThreshold === "" ? null : Number(priceThreshold),
        group_size: groupSize === "" ? null : Number(groupSize),
        alert_email: alertEmail,
        alert_sms: alertSms,
        alert_email_address: alertEmail ? emailAddress.trim() : null,
        alert_phone_e164: alertSms ? phone.trim() : null,
        frequency_minutes: frequency,
      }),
    });

    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      setError(body.error ?? "Failed to update watch");
      setSubmitting(false);
      return;
    }

    onSaved();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-[var(--space-3)] border-t-[length:var(--border-default)] border-solid border-[var(--color-border)] pt-[var(--space-3)]"
    >
      <div className="grid gap-[var(--space-2)]">
        <label htmlFor={`edit-label-${watch.id}`} className="text-small text-[var(--color-text)]">
          Label
        </label>
        <input
          id={`edit-label-${watch.id}`}
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          className="w-full rounded-[var(--radius-md)] border-[length:var(--border-default)] border-solid border-[var(--color-border)] bg-[var(--color-bg)] px-[var(--space-2)] text-body text-[var(--color-text)] focus:border-[length:var(--border-strong)] focus:border-[var(--color-border-strong)] focus:outline-none"
          style={{ height: "var(--height-input)" }}
          required
        />
      </div>

      <div className="grid gap-[var(--space-2)]">
        <span className="text-small font-medium text-[var(--color-text)]">Sources</span>
        <ul className="grid gap-[var(--space-2)]">
          {sources.map((s, index) => (
            <li
              key={`${s.url}-${index}`}
              className="flex items-center gap-[var(--space-2)] text-body text-[var(--color-text)]"
            >
              <span className="min-w-0 flex-1 break-all">{s.url}</span>
              <button
                type="button"
                onClick={() => setSources((prev) => prev.filter((_, i) => i !== index))}
                className="shrink-0 text-[var(--color-text-secondary)] hover:text-[var(--color-negative)]"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
        {sources.length < 3 ? (
          <div className="flex flex-wrap items-center gap-[var(--space-2)]">
            <input
              type="url"
              value={addUrl}
              onChange={(e) => {
                setAddUrl(e.target.value);
                setAddError(null);
              }}
              className="min-w-[10rem] flex-1 rounded-[var(--radius-md)] border-[length:var(--border-default)] border-solid border-[var(--color-border)] bg-[var(--color-bg)] px-[var(--space-2)] text-body text-[var(--color-text)]"
              style={{ height: "var(--height-input)" }}
              placeholder="https://..."
            />
            <button
              type="button"
              onClick={handleAddUrl}
              disabled={addLoading || !addUrl.trim().startsWith("https://")}
              className="rounded-[var(--radius-md)] border-[length:var(--border-default)] border-solid border-[var(--color-border)] bg-[var(--color-bg-raised)] px-[var(--space-3)] text-body text-[var(--color-text)] disabled:opacity-50"
              style={{ height: "var(--height-button-sm)" }}
            >
              {addLoading ? "…" : "Add"}
            </button>
          </div>
        ) : null}
        {addError ? (
          <p className="text-error text-[var(--color-negative)]">{addError}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-[var(--space-3)] sm:grid-cols-2">
        <div className="grid gap-[var(--space-2)]">
          <label
            htmlFor={`edit-price-${watch.id}`}
            className="text-small text-[var(--color-text)]"
          >
            Price threshold{" "}
            <span className="text-[var(--color-text-muted)]">(optional)</span>
          </label>
          <input
            id={`edit-price-${watch.id}`}
            type="number"
            value={priceThreshold}
            onChange={(event) => setPriceThreshold(event.target.value)}
            className="w-full rounded-[var(--radius-md)] border-[length:var(--border-default)] border-solid border-[var(--color-border)] bg-[var(--color-bg)] px-[var(--space-2)] text-body text-[var(--color-text)]"
            style={{ height: "var(--height-input)" }}
            placeholder="100"
          />
        </div>
        <div className="grid gap-[var(--space-2)]">
          <label
            htmlFor={`edit-group-${watch.id}`}
            className="text-small text-[var(--color-text)]"
          >
            Group size{" "}
            <span className="text-[var(--color-text-muted)]">(optional)</span>
          </label>
          <input
            id={`edit-group-${watch.id}`}
            type="number"
            value={groupSize}
            onChange={(event) => setGroupSize(event.target.value)}
            className="w-full rounded-[var(--radius-md)] border-[length:var(--border-default)] border-solid border-[var(--color-border)] bg-[var(--color-bg)] px-[var(--space-2)] text-body text-[var(--color-text)]"
            style={{ height: "var(--height-input)" }}
            placeholder="2"
          />
        </div>
      </div>

      <div className="grid gap-[var(--space-2)]">
        <label className="text-small text-[var(--color-text)]">Frequency (minutes)</label>
        <FrequencySelector value={frequency} onChange={setFrequency} id={`freq-${watch.id}`} />
      </div>

      <div className="grid gap-[var(--space-3)]">
        <label className="flex items-center gap-[var(--space-2)] text-small text-[var(--color-text)]">
          <input
            type="checkbox"
            checked={alertEmail}
            onChange={(event) => setAlertEmail(event.target.checked)}
            className="checkbox-seatcheck"
          />
          Alert by email
        </label>
        <input
          type="email"
          value={emailAddress}
          onChange={(e) => setEmailAddress(e.target.value)}
          style={{
            height: "var(--height-input)",
            opacity: alertEmail ? 1 : "var(--opacity-dimmed)",
            pointerEvents: alertEmail ? "auto" : "none",
          }}
          className="w-full rounded-[var(--radius-md)] border-[length:var(--border-default)] border-solid border-[var(--color-border)] bg-[var(--color-bg)] px-[var(--space-2)] text-body text-[var(--color-text)]"
        />
        <label className="flex items-center gap-[var(--space-2)] text-small text-[var(--color-text)]">
          <input
            type="checkbox"
            checked={alertSms}
            onChange={(event) => setAlertSms(event.target.checked)}
            className="checkbox-seatcheck"
          />
          Alert by SMS
        </label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          style={{
            height: "var(--height-input)",
            opacity: alertSms ? 1 : "var(--opacity-dimmed)",
            pointerEvents: alertSms ? "auto" : "none",
          }}
          className="w-full rounded-[var(--radius-md)] border-[length:var(--border-default)] border-solid border-[var(--color-border)] bg-[var(--color-bg)] px-[var(--space-2)] text-body text-[var(--color-text)]"
        />
      </div>

      {error ? <p className="text-error text-[var(--color-negative)]">{error}</p> : null}

      <div className="flex flex-wrap gap-[var(--space-2)]">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-[var(--radius-md)] bg-[var(--color-accent)] px-[var(--space-3)] text-small font-medium text-[var(--color-bg)] disabled:cursor-not-allowed disabled:bg-[var(--color-bg-raised)] disabled:text-[var(--color-text-muted)]"
          style={{ height: "var(--height-button)" }}
        >
          {submitting ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-[var(--radius-md)] border-[length:var(--border-default)] border-solid border-[var(--color-border)] bg-[var(--color-bg-raised)] px-[var(--space-3)] text-small text-[var(--color-text)]"
          style={{ height: "var(--height-button)" }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
