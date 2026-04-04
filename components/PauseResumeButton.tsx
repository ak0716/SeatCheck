"use client";

import { useState } from "react";

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
  const [error, setError] = useState<string | null>(null);
  const paused = status === "paused" || status === "error";
  const endpoint = paused ? "resume" : "pause";
  const label = paused ? "Resume" : "Pause";

  async function onClick() {
    setError(null);
    const response = await fetch(`/api/watches/${watchId}/${endpoint}`, {
      method: "PATCH",
    });
    if (!response.ok) {
      let message = `Request failed (${response.status})`;
      try {
        const body = (await response.json()) as { error?: string; details?: string };
        if (body.error) message = body.details ? `${body.error}: ${body.details}` : body.error;
      } catch {
        /* ignore */
      }
      console.error(`[PauseResumeButton] ${endpoint} failed`, message);
      setError(message);
      return;
    }
    onChanged();
  }

  return (
    <div className="inline-grid gap-[var(--space-1)]">
      <button
        type="button"
        onClick={() => void onClick()}
        className="rounded-[var(--radius-md)] border-[length:var(--border-default)] border-solid border-[var(--color-border)] bg-[var(--color-bg-raised)] px-[var(--space-3)] text-small text-[var(--color-text)] transition-[var(--transition)] hover:bg-[var(--color-border)]"
        style={{ height: "var(--height-button)" }}
      >
        {label}
      </button>
      {error ? (
        <p className="max-w-[12rem] text-error text-[var(--color-negative)]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
