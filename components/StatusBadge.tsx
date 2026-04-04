import type { WatchStatus } from "@/lib/types";

type StatusBadgeProps = {
  status: WatchStatus;
};

function getStatusLabel(status: WatchStatus): string {
  if (status === "active") return "Active";
  if (status === "paused") return "Paused";
  if (status === "triggered") return "Triggered";
  return "Error";
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const shared =
    "inline-flex rounded-[var(--radius-sm)] px-[var(--space-2)] py-[var(--space-1)] text-small font-medium";
  if (status === "error") {
    return (
      <span className={`${shared} text-[var(--color-negative)]`}>
        {getStatusLabel(status)}
      </span>
    );
  }

  return (
    <span
      className={`${shared} bg-[var(--color-bg-raised)] text-[var(--color-text-secondary)]`}
    >
      {getStatusLabel(status)}
    </span>
  );
}
