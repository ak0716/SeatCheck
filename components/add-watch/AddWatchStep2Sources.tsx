"use client";

import { useState } from "react";

import type { AddWatchSource } from "@/components/add-watch/types";

import type { Platform } from "@/lib/types";
import { isValidHttpsWatchUrl } from "@/lib/url-validation";

function truncateUrl(url: string, max: number): string {
  if (url.length <= max) return url;
  return `${url.slice(0, max - 1)}…`;
}

function detectionNote(platform: Platform | null): string | null {
  if (platform === "ticketmaster") {
    return "Ticketmaster detected — API monitoring enabled";
  }
  if (platform === "seatgeek") {
    return "SeatGeek detected — API monitoring enabled";
  }
  return null;
}

function PencilIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-[var(--color-text-secondary)]"
      aria-hidden
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

type AddWatchStep2SourcesProps = {
  label: string;
  onLabelChange: (value: string) => void;
  sources: AddWatchSource[];
  onRemoveSource: (index: number) => void;
  addUrl: string;
  onAddUrlChange: (value: string) => void;
  addError: string | null;
  addLoading: boolean;
  onAdd: () => void;
  onBack: () => void;
  onContinue: () => void;
};

export function AddWatchStep2Sources({
  label,
  onLabelChange,
  sources,
  onRemoveSource,
  addUrl,
  onAddUrlChange,
  addError,
  addLoading,
  onAdd,
  onBack,
  onContinue,
}: AddWatchStep2SourcesProps) {
  const [editingLabel, setEditingLabel] = useState(false);

  const canAddMore = sources.length < 3;
  const addValid = isValidHttpsWatchUrl(addUrl);

  return (
    <div className="grid gap-[var(--space-4)]">
      <div className="grid gap-[var(--space-2)]">
        {editingLabel ? (
          <input
            type="text"
            value={label}
            onChange={(e) => onLabelChange(e.target.value)}
            onBlur={() => setEditingLabel(false)}
            autoFocus
            className="w-full rounded-[var(--radius-md)] border-[length:var(--border-default)] border-solid border-[var(--color-border)] bg-[var(--color-bg)] px-[var(--space-2)] text-title font-medium text-[var(--color-text)] focus:border-[length:var(--border-strong)] focus:border-[var(--color-border-strong)] focus:outline-none"
            style={{ height: "var(--height-input)" }}
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditingLabel(true)}
            className="flex w-full cursor-pointer items-center gap-[var(--space-2)] text-left text-title font-medium text-[var(--color-text)]"
          >
            <span className="min-w-0 flex-1 truncate">{label || "Untitled"}</span>
            <PencilIcon />
          </button>
        )}
      </div>

      <div className="grid gap-[var(--space-3)]">
        <h3 className="text-section text-[var(--color-text)]">Sources</h3>
        <ul className="grid gap-[var(--space-3)]">
          {sources.map((s, index) => {
            const note = detectionNote(s.platform);
            return (
              <li key={`${s.url}-${index}`} className="grid gap-[var(--space-2)]">
                <div className="flex items-center gap-[var(--space-2)]">
                  <span className="min-w-0 flex-1 break-all text-body text-[var(--color-text)]">
                    {truncateUrl(s.url, 64)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemoveSource(index)}
                    className="shrink-0 rounded-[var(--radius-sm)] px-[var(--space-2)] text-body text-[var(--color-text-secondary)] transition-[var(--transition)] hover:bg-[var(--color-bg-raised)] hover:text-[var(--color-negative)]"
                    aria-label="Remove URL"
                  >
                    ×
                  </button>
                </div>
                {note ? (
                  <p className="text-small text-[var(--color-text-secondary)]">{note}</p>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>

      {canAddMore ? (
        <div className="grid gap-[var(--space-3)]">
          <h3 className="text-section text-[var(--color-text)]">Add more sources</h3>
          <div className="flex flex-wrap items-center gap-[var(--space-2)]">
            <input
              type="url"
              value={addUrl}
              onChange={(e) => onAddUrlChange(e.target.value)}
              className="min-w-[12rem] flex-1 rounded-[var(--radius-md)] border-[length:var(--border-default)] border-solid border-[var(--color-border)] bg-[var(--color-bg)] px-[var(--space-2)] text-body text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[length:var(--border-strong)] focus:border-[var(--color-border-strong)] focus:outline-none"
              style={{ height: "var(--height-input)" }}
              placeholder="https://..."
            />
            <button
              type="button"
              disabled={!addValid || addLoading}
              onClick={onAdd}
              className="shrink-0 rounded-[var(--radius-md)] border-[length:var(--border-default)] border-solid border-[var(--color-border)] bg-[var(--color-bg-raised)] px-[var(--space-3)] text-body text-[var(--color-text)] transition-[var(--transition)] hover:bg-[var(--color-border)] disabled:cursor-not-allowed disabled:opacity-50"
              style={{ height: "var(--height-button-sm)" }}
            >
              {addLoading ? "…" : "Add"}
            </button>
          </div>
          {addError ? (
            <p className="text-error text-[var(--color-negative)]">{addError}</p>
          ) : null}
          <p className="text-small text-[var(--color-text-muted)]">
            StubHub, venue box office, and more
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap justify-between gap-[var(--space-3)]">
        <button
          type="button"
          onClick={onBack}
          className="rounded-[var(--radius-md)] border-[length:var(--border-default)] border-solid border-[var(--color-border)] bg-[var(--color-bg-raised)] px-[var(--space-3)] text-body text-[var(--color-text)] transition-[var(--transition)] hover:bg-[var(--color-border)]"
          style={{ height: "var(--height-button)" }}
        >
          Back
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="rounded-[var(--radius-md)] bg-[var(--color-accent)] px-[var(--space-3)] text-body font-medium text-[var(--color-bg)] transition-[var(--transition)] hover:opacity-90"
          style={{ height: "var(--height-button)" }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
