"use client";

type FrequencySelectorProps = {
  value: number;
  onChange: (value: number) => void;
  id?: string;
};

export function FrequencySelector({
  value,
  onChange,
  id = "frequency_minutes",
}: FrequencySelectorProps) {
  return (
    <select
      id={id}
      name="frequency_minutes"
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      className="w-full rounded-[var(--radius-md)] border-[length:var(--border-default)] border-solid border-[var(--color-border)] bg-[var(--color-bg)] px-[var(--space-2)] text-small text-[var(--color-text)]"
      style={{ height: "var(--height-input)" }}
    >
      <option value={60}>60 minutes</option>
    </select>
  );
}
