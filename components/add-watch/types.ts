import type { Platform } from "@/lib/types";

export type AddWatchSource = {
  url: string;
  platform: Platform | null;
  eventId: string | null;
};
