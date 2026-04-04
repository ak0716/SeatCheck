"use client";

import type { AddWatchSource } from "@/components/add-watch/types";

function sourceSummaryParts(sources: AddWatchSource[]): string {
  return sources
    .map((s) => {
      if (s.platform === "ticketmaster") return "Ticketmaster";
      if (s.platform === "seatgeek") return "SeatGeek";
      const u = s.url;
      if (u.length <= 48) return u;
      return `${u.slice(0, 47)}…`;
    })
    .join(", ");
}

function alertSummary(email: boolean, sms: boolean): string {
  if (email && sms) return "Email + SMS";
  if (email) return "Email";
  if (sms) return "SMS";
  return "—";
}

type AddWatchStep5ConfirmProps = {
  label: string;
  sources: AddWatchSource[];
  maxPrice: string;
  minTickets: number;
  emailEnabled: boolean;
  smsEnabled: boolean;
  submitting: boolean;
  error: string | null;
  onBack: () => void;
  onSubmit: () => void;
};

export function AddWatchStep5Confirm({
  label,
  sources,
  maxPrice,
  minTickets,
  emailEnabled,
  smsEnabled,
  submitting,
  error,
  onBack,
  onSubmit,
}: AddWatchStep5ConfirmProps) {
  const priceLine =
    maxPrice.trim() === ""
      ? "Any price"
      : `$${maxPrice.trim()} per ticket`;

  return (
    <div className="grid gap-[var(--space-4)]">
      <dl className="grid gap-[var(--space-3)]">
        <div className="grid gap-[var(--space-1)]">
          <dt className="text-small text-[var(--color-text-secondary)]">Watching</dt>
          <dd className="text-body text-[var(--color-text)]">{label.trim() || "—"}</dd>
        </div>
        <div className="grid gap-[var(--space-1)]">
          <dt className="text-small text-[var(--color-text-secondary)]">Sources</dt>
          <dd className="text-body text-[var(--color-text)]">{sourceSummaryParts(sources)}</dd>
        </div>
        <div className="grid gap-[var(--space-1)]">
          <dt className="text-small text-[var(--color-text-secondary)]">Max price</dt>
          <dd className="text-body text-[var(--color-text)]">{priceLine}</dd>
        </div>
        {minTickets > 1 ? (
          <div className="grid gap-[var(--space-1)]">
            <dt className="text-small text-[var(--color-text-secondary)]">Min tickets</dt>
            <dd className="text-body text-[var(--color-text)]">
              {minTickets} together
            </dd>
          </div>
        ) : null}
        <div className="grid gap-[var(--space-1)]">
          <dt className="text-small text-[var(--color-text-secondary)]">Alert</dt>
          <dd className="text-body text-[var(--color-text)]">
            {alertSummary(emailEnabled, smsEnabled)}
          </dd>
        </div>
      </dl>

      {error ? (
        <p className="text-error text-[var(--color-negative)]">{error}</p>
      ) : null}

      <div
        className="border-t-[length:var(--border-default)] border-solid border-[var(--color-border)] pt-[var(--space-4)]"
        role="presentation"
      />

      <div className="flex flex-wrap justify-between gap-[var(--space-3)]">
        <button
          type="button"
          onClick={onBack}
          disabled={submitting}
          className="rounded-[var(--radius-md)] border-[length:var(--border-default)] border-solid border-[var(--color-border)] bg-[var(--color-bg-raised)] px-[var(--space-3)] text-body text-[var(--color-text)] transition-[var(--transition)] hover:bg-[var(--color-border)] disabled:cursor-not-allowed disabled:opacity-50"
          style={{ height: "var(--height-button)" }}
        >
          Back
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={onSubmit}
          className="rounded-[var(--radius-md)] bg-[var(--color-accent)] px-[var(--space-3)] text-body font-medium text-[var(--color-bg)] transition-[var(--transition)] hover:opacity-90 disabled:cursor-not-allowed disabled:bg-[var(--color-bg-raised)] disabled:text-[var(--color-text-muted)]"
          style={{ height: "var(--height-button)" }}
        >
          {submitting ? "Saving…" : "Start watching"}
        </button>
      </div>
    </div>
  );
}
