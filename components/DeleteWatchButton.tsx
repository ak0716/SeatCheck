"use client";

import { useState } from "react";

type DeleteWatchButtonProps = {
  watchId: string;
  onDeleted: () => void;
};

export function DeleteWatchButton({ watchId, onDeleted }: DeleteWatchButtonProps) {
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    setError(null);
    const shouldDelete = window.confirm("Delete this watch?");
    if (!shouldDelete) return;

    const response = await fetch(`/api/watches/${watchId}`, { method: "DELETE" });
    if (!response.ok) {
      let message = `Delete failed (${response.status})`;
      try {
        const body = (await response.json()) as { error?: string; details?: string };
        if (body.error) message = body.details ? `${body.error}: ${body.details}` : body.error;
      } catch {
        /* ignore */
      }
      console.error("[DeleteWatchButton] delete failed", message);
      setError(message);
      return;
    }
    onDeleted();
  }

  return (
    <div className="inline-grid gap-[var(--space-1)]">
      <button
        type="button"
        onClick={() => void onDelete()}
        className="rounded-[var(--radius-md)] bg-[var(--color-negative-bg)] px-[var(--space-3)] text-small text-[var(--color-negative)] transition-[var(--transition)] hover:opacity-90"
        style={{ height: "var(--height-button)" }}
      >
        Delete
      </button>
      {error ? (
        <p className="max-w-[12rem] text-error text-[var(--color-negative)]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
