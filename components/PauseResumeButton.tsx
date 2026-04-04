"use client";

import type { WatchStatus } from "@/lib/types";

type PauseResumeButtonProps = {
  watchId: string;
  status: WatchStatus;
  onChanged: () => void;
};

export function PauseResumeButton({
  watchId,
  status,
  onChanged,
}: PauseResumeButtonProps) {
  const paused = status === "paused" || status === "error";
  const endpoint = paused ? "resume" : "pause";
  const label = paused ? "Resume" : "Pause";

  async function onClick() {
    const response = await fetch(`/api/watches/${watchId}/${endpoint}`, {
      method: "PATCH",
    });
    if (!response.ok) return;
    onChanged();
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-[var(--radius-md)] border-[length:var(--border-default)] border-solid border-[var(--color-border)] bg-[var(--color-bg-raised)] px-[var(--space-3)] text-small text-[var(--color-text)] transition-[var(--transition)] hover:bg-[var(--color-border)]"
      style={{ height: "var(--height-button)" }}
    >
      {label}
    </button>
  );
}
