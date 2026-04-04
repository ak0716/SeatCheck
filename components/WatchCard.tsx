import type { ReactNode } from "react";

import type { WatchWithUrls } from "@/lib/types";

import { StatusBadge } from "@/components/StatusBadge";

type WatchCardProps = {
  watch: WatchWithUrls;
  actions: ReactNode;
  editing: ReactNode;
  isEditing: boolean;
  onEditToggle: () => void;
};

function formatTimestamp(value: string | null): string {
  if (!value) return "Never";
  const date = new Date(value);
  return date.toLocaleString();
}

function formatUrlLines(watch: WatchWithUrls): string {
  const rows = watch.watch_urls ?? [];
  if (rows.length === 0) return "No URLs";
  return rows
    .map((u) => {
      const url = u.url;
      if (url.length <= 72) return url;
      return `${url.slice(0, 71)}…`;
    })
    .join("\n");
}

export function WatchCard({
  watch,
  actions,
  editing,
  isEditing,
  onEditToggle,
}: WatchCardProps) {
  const errorBorder =
    watch.status === "error" ? "border-l-[3px] border-l-[var(--color-negative)]" : "";

  return (
    <article
      className={`grid gap-[var(--space-3)] rounded-[var(--radius-lg)] border-[length:var(--border-default)] border-solid border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-[var(--space-4)] ${errorBorder}`}
    >
      <div className="flex items-start justify-between gap-[var(--space-4)]">
        <div className="grid gap-[var(--space-1)]">
          <h3 className="text-title font-medium text-[var(--color-text)]">{watch.label}</h3>
          <p className="whitespace-pre-wrap break-all text-small text-[var(--color-text-secondary)]">
            {formatUrlLines(watch)}
          </p>
          {watch.last_failure_reason ? (
            <p className="text-small text-[var(--color-negative)]">{watch.last_failure_reason}</p>
          ) : null}
        </div>
        <StatusBadge status={watch.status} />
      </div>

      <div className="grid gap-[var(--space-1)] text-small text-[var(--color-text-secondary)]">
        <p>Last checked: {formatTimestamp(watch.last_checked_at)}</p>
        <p>
          Price threshold:{" "}
          {watch.price_threshold === null ? "Not set" : `$${watch.price_threshold}`}
        </p>
        <p>Group size: {watch.group_size === null ? "Not set" : watch.group_size}</p>
      </div>

      <div className="flex flex-wrap gap-[var(--space-2)]">
        <button
          type="button"
          onClick={onEditToggle}
          className="rounded-[var(--radius-md)] border-[length:var(--border-default)] border-solid border-[var(--color-border)] bg-[var(--color-bg-raised)] px-[var(--space-3)] text-small text-[var(--color-text)] transition-[var(--transition)] hover:bg-[var(--color-border)]"
          style={{ height: "var(--height-button)" }}
        >
          {isEditing ? "Close edit" : "Edit"}
        </button>
        {actions}
      </div>

      {isEditing ? editing : null}
    </article>
  );
}
