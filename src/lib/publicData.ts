// Published events and the roster: the same for everyone, so cached on the
// server and prerendered into the static shell. Falls back to the sample
// fixture until Supabase is configured (env vars missing).

import { cacheLife, cacheTag } from "next/cache";
import { sampleEvents, sampleMembers } from "@/data/fixture";
import { EVENT_SELECT, toPublicEvent, toPublicMember, type EventWithRounds } from "./supabase/mappers";
import { createPublicClient } from "./supabase/server";
import type { PublicEvent, PublicMember } from "./types";

/** Tag to revalidate after an admin changes events, lineups or the roster (M3). */
export const CATALOG_TAG = "catalog";

export async function getPublicCatalog(): Promise<{ events: PublicEvent[]; members: PublicMember[] }> {
  "use cache";
  cacheLife("minutes");
  cacheTag(CATALOG_TAG);

  const db = createPublicClient();
  if (!db) return { events: sampleEvents, members: sampleMembers };

  const [members, events] = await Promise.all([
    db.from("members").select("*").order("nickname"),
    db
      .from("events")
      .select(EVENT_SELECT)
      .eq("status", "published")
      .order("event_date", { ascending: false }),
  ]);
  if (members.error) throw new Error(`Could not load members: ${members.error.message}`);
  if (events.error) throw new Error(`Could not load events: ${events.error.message}`);

  return {
    members: members.data.map(toPublicMember),
    events: (events.data as EventWithRounds[]).map(toPublicEvent),
  };
}
