import type { ReactNode } from "react";

import type { WatchWithUrls } from "@/lib/types";

import { WatchCard } from "@/components/WatchCard";

type WatchListProps = {
  watches: WatchWithUrls[];
  editingId: string | null;
  onEditToggle: (id: string) => void;
  actionsById: (watch: WatchWithUrls) => ReactNode;
  editFormById: (watch: WatchWithUrls) => ReactNode;
};

export function WatchList({
  watches,
  editingId,
  onEditToggle,
  actionsById,
  editFormById,
}: WatchListProps) {
  if (watches.length === 0) {
    return (
      <div className="rounded-[var(--radius-lg)] border-[length:var(--border-default)] border-solid border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-[var(--space-4)] py-[var(--space-6)] text-center">
        <p className="text-body text-[var(--color-text-muted)]">
          No watches yet. Add one above.
        </p>
      </div>
    );
  }

  return (
    <section className="grid gap-[var(--space-2)]">
      {watches.map((watch) => (
        <WatchCard
          key={watch.id}
          watch={watch}
          isEditing={editingId === watch.id}
          onEditToggle={() => onEditToggle(watch.id)}
          actions={actionsById(watch)}
          editing={editFormById(watch)}
        />
      ))}
    </section>
  );
}
