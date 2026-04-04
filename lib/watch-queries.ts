import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { WatchUrl, WatchWithUrls } from "@/lib/types";

/**
 * Loads watches and related URLs in two queries so we do not rely on PostgREST
 * embedding (`watch_urls(*)`), which requires FK relationships in the schema cache.
 */
export async function fetchAllWatchesWithUrls(
  supabase: SupabaseClient,
): Promise<WatchWithUrls[]> {
  const { data: watches, error: watchesError } = await supabase
    .from("watches")
    .select("*")
    .order("created_at", { ascending: false });

  if (watchesError) {
    throw new Error(`Failed to fetch watches: ${watchesError.message}`);
  }

  const list = watches ?? [];
  if (list.length === 0) return [];

  const ids = list.map((w) => w.id as string);
  const { data: urlRows, error: urlsError } = await supabase
    .from("watch_urls")
    .select("*")
    .in("watch_id", ids);

  if (urlsError) {
    throw new Error(`Failed to fetch watch URLs: ${urlsError.message}`);
  }

  const byWatchId = new Map<string, WatchUrl[]>();
  for (const row of urlRows ?? []) {
    const u = row as WatchUrl;
    const wid = u.watch_id;
    const bucket = byWatchId.get(wid) ?? [];
    bucket.push(u);
    byWatchId.set(wid, bucket);
  }

  return list.map((w) => {
    const id = w.id as string;
    return {
      ...w,
      watch_urls: byWatchId.get(id) ?? [],
    } as WatchWithUrls;
  });
}

export async function fetchWatchWithUrlsById(
  supabase: SupabaseClient,
  watchId: string,
): Promise<WatchWithUrls | null> {
  const { data: watch, error: watchError } = await supabase
    .from("watches")
    .select("*")
    .eq("id", watchId)
    .maybeSingle();

  if (watchError) {
    throw new Error(`Failed to fetch watch: ${watchError.message}`);
  }
  if (!watch) return null;

  const { data: urlRows, error: urlsError } = await supabase
    .from("watch_urls")
    .select("*")
    .eq("watch_id", watchId);

  if (urlsError) {
    throw new Error(`Failed to fetch watch URLs: ${urlsError.message}`);
  }

  return {
    ...watch,
    watch_urls: (urlRows ?? []) as WatchUrl[],
  } as WatchWithUrls;
}
