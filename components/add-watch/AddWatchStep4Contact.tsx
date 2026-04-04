"use client";

type AddWatchStep4ContactProps = {
  emailEnabled: boolean;
  onEmailEnabledChange: (value: boolean) => void;
  email: string;
  onEmailChange: (value: string) => void;
  smsEnabled: boolean;
  onSmsEnabledChange: (value: boolean) => void;
  sms: string;
  onSmsChange: (value: string) => void;
  continueDisabled: boolean;
  onBack: () => void;
  onContinue: () => void;
};

export function AddWatchStep4Contact({
  emailEnabled,
  onEmailEnabledChange,
  email,
  onEmailChange,
  smsEnabled,
  onSmsEnabledChange,
  sms,
  onSmsChange,
  continueDisabled,
  onBack,
  onContinue,
}: AddWatchStep4ContactProps) {
  return (
    <div className="grid gap-[var(--space-4)]">
      <p className="text-small text-[var(--color-text-secondary)]">
        At least one method is required.
      </p>

      <div className="grid gap-[var(--space-2)]">
        <label className="flex cursor-pointer items-start gap-[var(--space-2)]">
          <input
            type="checkbox"
            checked={emailEnabled}
            onChange={(e) => onEmailEnabledChange(e.target.checked)}
            className="checkbox-seatcheck mt-[var(--space-1)]"
          />
          <span className="text-body text-[var(--color-text)]">Email</span>
        </label>
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          placeholder="your@email.com"
          style={{
            height: "var(--height-input)",
            opacity: emailEnabled ? 1 : "var(--opacity-dimmed)",
            pointerEvents: emailEnabled ? "auto" : "none",
          }}
          className="w-full rounded-[var(--radius-md)] border-[length:var(--border-default)] border-solid border-[var(--color-border)] bg-[var(--color-bg)] px-[var(--space-2)] text-body text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[length:var(--border-strong)] focus:border-[var(--color-border-strong)] focus:outline-none"
        />
      </div>

      <div className="grid gap-[var(--space-2)]">
        <label className="flex cursor-pointer items-start gap-[var(--space-2)]">
          <input
            type="checkbox"
            checked={smsEnabled}
            onChange={(e) => onSmsEnabledChange(e.target.checked)}
            className="checkbox-seatcheck mt-[var(--space-1)]"
          />
          <span className="grid gap-[var(--space-1)]">
            <span className="text-body text-[var(--color-text)]">SMS</span>
            <span className="text-small text-[var(--color-text-secondary)]">
              US numbers only
            </span>
          </span>
        </label>
        <input
          type="tel"
          autoComplete="tel"
          value={sms}
          onChange={(e) => onSmsChange(e.target.value)}
          placeholder="+1 (503) 555-0000"
          style={{
            height: "var(--height-input)",
            opacity: smsEnabled ? 1 : "var(--opacity-dimmed)",
            pointerEvents: smsEnabled ? "auto" : "none",
          }}
          className="w-full rounded-[var(--radius-md)] border-[length:var(--border-default)] border-solid border-[var(--color-border)] bg-[var(--color-bg)] px-[var(--space-2)] text-body text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[length:var(--border-strong)] focus:border-[var(--color-border-strong)] focus:outline-none"
        />
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
          disabled={continueDisabled}
          onClick={onContinue}
          className="rounded-[var(--radius-md)] bg-[var(--color-accent)] px-[var(--space-3)] text-body font-medium text-[var(--color-bg)] transition-[var(--transition)] hover:opacity-90 disabled:cursor-not-allowed disabled:bg-[var(--color-bg-raised)] disabled:text-[var(--color-text-muted)] disabled:hover:opacity-100"
          style={{ height: "var(--height-button)" }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
