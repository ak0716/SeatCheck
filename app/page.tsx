import { WatchListPage } from "@/components/WatchListPage";
import type { WatchWithUrls } from "@/lib/types";
import { fetchAllWatchesWithUrls } from "@/lib/watch-queries";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function getWatches(): Promise<WatchWithUrls[]> {
  const supabase = createServerSupabaseClient();
  return fetchAllWatchesWithUrls(supabase);
}

export default async function Home() {
  const watches = await getWatches();
  return <WatchListPage watches={watches} />;
}
