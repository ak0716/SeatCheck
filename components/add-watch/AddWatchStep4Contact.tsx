"use client";

type AddWatchStep4ContactProps = {
  email: string;
  onEmailChange: (value: string) => void;
  emailError: string | null;
  onBack: () => void;
  onContinue: () => void;
};

export function AddWatchStep4Contact({
  email,
  onEmailChange,
  emailError,
  onBack,
  onContinue,
}: AddWatchStep4ContactProps) {
  return (
    <div className="grid gap-[var(--space-4)]">
      <p className="text-small text-[var(--color-text-secondary)]">
        You&apos;ll be notified at this address when your alert conditions are met.
      </p>

      <div className="grid gap-[var(--space-2)]">
        <label
          htmlFor="add-watch-email"
          className="text-body text-[var(--color-text)]"
        >
          Email
        </label>
        <input
          id="add-watch-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          placeholder="your@email.com"
          aria-invalid={emailError ? true : undefined}
          aria-describedby={emailError ? "add-watch-email-error" : undefined}
          style={{ height: "var(--height-input)" }}
          className="w-full rounded-[var(--radius-md)] border-[length:var(--border-default)] border-solid border-[var(--color-border)] bg-[var(--color-bg)] px-[var(--space-2)] text-body text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[length:var(--border-strong)] focus:border-[var(--color-border-strong)] focus:outline-none"
        />
        {emailError ? (
          <p
            id="add-watch-email-error"
            className="text-small text-[var(--color-negative)]"
            role="alert"
          >
            {emailError}
          </p>
        ) : null}
      </div>

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
