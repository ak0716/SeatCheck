import { createServerSupabaseClient } from "@/lib/supabase/server";

type WatchSeed = {
  label: string;
  urls: { url: string; platform: string | null; event_id: string | null }[];
  price_threshold: number | null;
  group_size: number | null;
  last_alerted_at?: string | null;
  consecutive_failures?: number;
  last_checked_at?: string | null;
};

async function main() {
  const supabase = createServerSupabaseClient();

  const { error: deleteError } = await supabase.from("watches").delete().neq("id", "");
  if (deleteError) {
    // eslint-disable-next-line no-console
    console.error("Failed to clear existing watches", deleteError.message);
    process.exit(1);
  }

  const now = new Date();
  const threeAndHalfHoursAgo = new Date(now.getTime() - 3.5 * 60 * 60 * 1000);
  const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);

  const baseWatches: WatchSeed[] = [
    {
      label: "Ticketmaster floor seats",
      urls: [
        {
          url: "https://example.com/ticketmaster-floor",
          platform: "ticketmaster",
          event_id: null,
        },
      ],
      price_threshold: 150,
      group_size: 2,
    },
    {
      label: "SeatGeek balcony",
      urls: [
        {
          url: "https://example.com/seatgeek-balcony",
          platform: "seatgeek",
          event_id: null,
        },
      ],
      price_threshold: 80,
      group_size: 2,
    },
    {
      label: "Generic ticket page",
      urls: [
        {
          url: "https://example.com/generic-page",
          platform: "generic",
          event_id: null,
        },
      ],
      price_threshold: 120,
      group_size: null,
    },
    {
      label: "Festival weekend passes",
      urls: [
        {
          url: "https://example.com/festival-weekend",
          platform: "ticketmaster",
          event_id: null,
        },
      ],
      price_threshold: null,
      group_size: 4,
    },
    {
      label: "Last-minute singles",
      urls: [
        {
          url: "https://example.com/last-minute",
          platform: null,
          event_id: null,
        },
      ],
      price_threshold: null,
      group_size: 1,
    },
  ];

  const edgeCases: WatchSeed[] = [
    {
      label: "Near cooldown boundary",
      urls: [
        {
          url: "https://example.com/cooldown",
          platform: "generic",
          event_id: null,
        },
      ],
      price_threshold: 90,
      group_size: null,
      last_alerted_at: threeAndHalfHoursAgo.toISOString(),
    },
    {
      label: "Two consecutive failures",
      urls: [
        {
          url: "https://example.com/failures",
          platform: "generic",
          event_id: null,
        },
      ],
      price_threshold: null,
      group_size: null,
      consecutive_failures: 2,
    },
    {
      label: "Dual URL and event ID",
      urls: [
        {
          url: "https://example.com/dual",
          platform: "ticketmaster",
          event_id: "tm-event-123",
        },
      ],
      price_threshold: 110,
      group_size: 2,
    },
    {
      label: "Never checked",
      urls: [
        {
          url: "https://example.com/never-checked",
          platform: "generic",
          event_id: null,
        },
      ],
      price_threshold: null,
      group_size: null,
      last_checked_at: null,
    },
    {
      label: "Threshold 100 with recent alert",
      urls: [
        {
          url: "https://example.com/threshold-100",
          platform: "generic",
          event_id: null,
        },
      ],
      price_threshold: 100,
      group_size: null,
      last_alerted_at: thirtyMinutesAgo.toISOString(),
    },
  ];

  const allSeeds = [...baseWatches, ...edgeCases];

  for (const seed of allSeeds) {
    const { urls, ...watchRest } = seed;
    const row = {
      label: watchRest.label,
      price_threshold: watchRest.price_threshold,
      group_size: watchRest.group_size,
      alert_email: true,
      alert_sms: false,
      alert_email_address: "seed@example.com",
      alert_phone_e164: null,
      frequency_minutes: 60,
      status: "active" as const,
      js_rendered: false,
      consecutive_failures: watchRest.consecutive_failures ?? 0,
      last_checked_at: watchRest.last_checked_at ?? null,
      last_alerted_at: watchRest.last_alerted_at ?? null,
      last_failure_reason: null,
    };

    const { data: watch, error: insertWatchError } = await supabase
      .from("watches")
      .insert(row)
      .select("id")
      .single();

    if (insertWatchError || !watch) {
      // eslint-disable-next-line no-console
      console.error("Failed to insert watch", insertWatchError?.message);
      process.exit(1);
    }

    const urlRows = urls.map((u) => ({
      watch_id: watch.id,
      url: u.url,
      platform: u.platform,
      event_id: u.event_id,
    }));

    const { error: urlError } = await supabase.from("watch_urls").insert(urlRows);
    if (urlError) {
      // eslint-disable-next-line no-console
      console.error("Failed to insert watch_urls", urlError.message);
      process.exit(1);
    }
  }

  // eslint-disable-next-line no-console
  console.log(`Inserted ${allSeeds.length} watches with URLs`);
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Unexpected seed error", error);
  process.exit(1);
});
