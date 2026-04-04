"use client";

type AddWatchStep1UrlProps = {
  url: string;
  onUrlChange: (value: string) => void;
  urlError: string | null;
  showHttpsHint: boolean;
  loading: boolean;
  onContinue: () => void;
};

export function AddWatchStep1Url({
  url,
  onUrlChange,
  urlError,
  showHttpsHint,
  loading,
  onContinue,
}: AddWatchStep1UrlProps) {
  const valid = url.trim().startsWith("https://");

  return (
    <div className="grid gap-[var(--space-3)]">
      <div className="grid gap-[var(--space-2)]">
        <label
          htmlFor="add-watch-step1-url"
          className="text-small text-[var(--color-text)]"
        >
          Ticket page URL
        </label>
        <input
          id="add-watch-step1-url"
          type="url"
          autoComplete="url"
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          className="w-full rounded-[var(--radius-md)] border-[length:var(--border-default)] border-solid border-[var(--color-border)] bg-[var(--color-bg)] px-[var(--space-2)] text-body text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[length:var(--border-strong)] focus:border-[var(--color-border-strong)] focus:outline-none"
          style={{ height: "var(--height-input)" }}
          placeholder="https://..."
        />
        {urlError ? (
          <p className="text-error text-[var(--color-negative)]">{urlError}</p>
        ) : null}
        {showHttpsHint && !valid ? (
          <p className="text-error text-[var(--color-negative)]">
            Please enter a valid URL starting with https://
          </p>
        ) : null}
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          disabled={!valid || loading}
          onClick={onContinue}
          className="rounded-[var(--radius-md)] bg-[var(--color-accent)] px-[var(--space-3)] text-body font-medium text-[var(--color-bg)] transition-[var(--transition)] hover:opacity-90 disabled:cursor-not-allowed disabled:bg-[var(--color-bg-raised)] disabled:text-[var(--color-text-muted)] disabled:hover:opacity-100"
          style={{ height: "var(--height-button)", minWidth: "var(--space-6)" }}
        >
          {loading ? "Loading…" : "Continue"}
        </button>
      </div>
    </div>
  );
}
