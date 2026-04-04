"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { WatchWithUrls } from "@/lib/types";

import { AddWatchForm } from "@/components/AddWatchForm";
import { DeleteWatchButton } from "@/components/DeleteWatchButton";
import { EditWatchForm } from "@/components/EditWatchForm";
import { PauseResumeButton } from "@/components/PauseResumeButton";
import { WatchList } from "@/components/WatchList";

type WatchListPageProps = {
  watches: WatchWithUrls[];
};

export function WatchListPage({ watches }: WatchListPageProps) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);

  const sortedWatches = useMemo(
    () =>
      [...watches].sort((a, b) =>
        a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0,
      ),
    [watches],
  );

  function refresh() {
    setEditingId(null);
    router.refresh();
  }

  return (
    <main className="mx-auto grid w-full max-w-3xl gap-[var(--space-6)] px-[var(--space-4)] py-[var(--space-6)]">
      <header className="grid gap-[var(--space-2)]">
        <h1 className="text-display text-[var(--color-text)]">SeatCheck Watch List</h1>
        <p className="text-small text-[var(--color-text-secondary)]">
          Add, edit, pause, resume, or delete watches.
        </p>
      </header>

      <AddWatchForm onCreated={refresh} />

      <WatchList
        watches={sortedWatches}
        editingId={editingId}
        onEditToggle={(id) => setEditingId((current) => (current === id ? null : id))}
        actionsById={(watch) => (
          <>
            <PauseResumeButton watchId={watch.id} status={watch.status} onChanged={refresh} />
            <DeleteWatchButton watchId={watch.id} onDeleted={refresh} />
          </>
        )}
        editFormById={(watch) => (
          <EditWatchForm
            watch={watch}
            onSaved={refresh}
            onCancel={() => setEditingId(null)}
          />
        )}
      />
    </main>
  );
}
