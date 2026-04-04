"use client";

type DeleteWatchButtonProps = {
  watchId: string;
  onDeleted: () => void;
};

export function DeleteWatchButton({ watchId, onDeleted }: DeleteWatchButtonProps) {
  async function onDelete() {
    const shouldDelete = window.confirm("Delete this watch?");
    if (!shouldDelete) return;

    const response = await fetch(`/api/watches/${watchId}`, { method: "DELETE" });
    if (!response.ok) return;
    onDeleted();
  }

  return (
    <button
      type="button"
      onClick={onDelete}
      className="rounded-[var(--radius-md)] bg-[var(--color-negative-bg)] px-[var(--space-3)] text-small text-[var(--color-negative)] transition-[var(--transition)] hover:opacity-90"
      style={{ height: "var(--height-button)" }}
    >
      Delete
    </button>
  );
}
