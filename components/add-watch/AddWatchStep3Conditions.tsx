"use client";

type AddWatchStep3ConditionsProps = {
  maxPrice: string;
  onMaxPriceChange: (value: string) => void;
  minTickets: number;
  onMinTicketsChange: (value: number) => void;
  onBack: () => void;
  onContinue: () => void;
};

export function AddWatchStep3Conditions({
  maxPrice,
  onMaxPriceChange,
  minTickets,
  onMinTicketsChange,
  onBack,
  onContinue,
}: AddWatchStep3ConditionsProps) {
  return (
    <div className="grid gap-[var(--space-4)]">
      <p className="text-small text-[var(--color-text-secondary)]">
        Leave blank to be notified about any available tickets.
      </p>

      <div className="grid gap-[var(--space-4)]">
      <div className="grid gap-[var(--space-2)]">
        <label
          htmlFor="add-watch-max-price"
          className="text-body text-[var(--color-text)]"
        >
          Max price per ticket
        </label>
        <div
          className="flex items-center overflow-hidden rounded-[var(--radius-md)] border-[length:var(--border-default)] border-solid border-[var(--color-border)] bg-[var(--color-bg)] focus-within:border-[length:var(--border-strong)] focus-within:border-[var(--color-border-strong)]"
          style={{ height: "var(--height-input)" }}
        >
          <span className="border-r-[length:var(--border-default)] border-[var(--color-border)] px-[var(--space-2)] text-body text-[var(--color-text-secondary)]">
            $
          </span>
          <input
            id="add-watch-max-price"
            type="number"
            min={0}
            step="0.01"
            value={maxPrice}
            onChange={(e) => onMaxPriceChange(e.target.value)}
            className="min-w-0 flex-1 border-0 bg-transparent px-[var(--space-2)] text-body text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)]"
            placeholder=""
          />
        </div>
        <p className="text-small text-[var(--color-text-secondary)]">
          Only alert when price is at or below this amount.
        </p>
      </div>

      <div className="grid gap-[var(--space-4)]">
        <div className="grid gap-[var(--space-2)]">
          <span className="text-body text-[var(--color-text)]">Tickets together</span>
          <p className="text-small text-[var(--color-text-secondary)]">
            Alert when this many seats are in one listing
          </p>
        </div>
        <div className="flex items-center gap-[var(--space-2)]">
          <button
            type="button"
            onClick={() => onMinTicketsChange(Math.max(1, minTickets - 1))}
            disabled={minTickets <= 1}
            className="flex items-center justify-center rounded-full border-[length:var(--border-default)] border-solid border-[var(--color-border)] bg-[var(--color-bg-raised)] text-body text-[var(--color-text)] transition-[var(--transition)] hover:bg-[var(--color-border)] disabled:cursor-not-allowed disabled:opacity-40"
            style={{
              width: "var(--height-stepper)",
              height: "var(--height-stepper)",
              borderRadius: "var(--radius-sm)",
            }}
            aria-label="Decrease tickets"
          >
            −
          </button>
          <span className="min-w-[var(--space-6)] text-center text-body text-[var(--color-text)]">
            {minTickets}
          </span>
          <button
            type="button"
            onClick={() => onMinTicketsChange(Math.min(10, minTickets + 1))}
            disabled={minTickets >= 10}
            className="flex items-center justify-center rounded-full border-[length:var(--border-default)] border-solid border-[var(--color-border)] bg-[var(--color-bg-raised)] text-body text-[var(--color-text)] transition-[var(--transition)] hover:bg-[var(--color-border)] disabled:cursor-not-allowed disabled:opacity-40"
            style={{
              width: "var(--height-stepper)",
              height: "var(--height-stepper)",
              borderRadius: "var(--radius-sm)",
            }}
            aria-label="Increase tickets"
          >
            +
          </button>
        </div>
      </div>
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
