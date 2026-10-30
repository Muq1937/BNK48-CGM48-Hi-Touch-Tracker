// Admin data access. Every function checks the role itself (the Data Access
// Layer pattern), so a page or action can't forget to. RLS is the last line:
// the database only lets admins write events, rounds, lineups and members.

import "server-only";
import { notFound } from "next/navigation";
import { EVENT_SELECT, toPublicEvent, toPublicMember, type EventWithRounds } from "../supabase/mappers";
import { createClient } from "../supabase/server";
import { getViewer } from "../supabase/viewer";
import type { PublicEvent, PublicMember } from "../types";

export type AdminEvent = PublicEvent & {
  status: "draft" | "published";
  /** Changes on every save; the builder remounts on it to pick up saved round ids. */
  updatedAt: string;
  /** Distinct fans who logged any round of this event. */
  fans: number;
  /** Distinct fans per round id (rounds nobody logged are absent). */
  roundFans: Record<string, number>;
};

export interface AdminData {
  events: AdminEvent[];
  members: PublicMember[];
}

export async function isAdmin(): Promise<boolean> {
  const viewer = await getViewer();
  return viewer.kind === "user" && viewer.isAdmin;
}

/** For pages: anyone who isn't an admin gets the regular 404, so admin pages stay invisible. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) notFound();
}

/** A client acting as the signed-in admin, or null if the caller isn't one. */
export async function adminClient() {
  if (!(await isAdmin())) return null;
  return createClient();
}

export async function getAdminData(): Promise<AdminData> {
  await requireAdmin();
  const db = (await createClient())!;
  const [events, members, usage] = await Promise.all([
    db
      .from("events")
      .select(`${EVENT_SELECT}, status, updated_at`)
      .order("event_date", { ascending: false })
      .order("name"),
    db.from("members").select("*").order("nickname"),
    db.rpc("admin_log_usage"),
  ]);
  if (events.error) throw new Error(`Could not load events: ${events.error.message}`);
  if (members.error) throw new Error(`Could not load members: ${members.error.message}`);
  if (usage.error) throw new Error(`Could not load log counts: ${usage.error.message}`);

  const fans = new Map<string, number>();
  const roundFans = new Map<string, Record<string, number>>();
  for (const row of usage.data) {
    if (row.round_id === null) fans.set(row.event_id, Number(row.fans));
    else roundFans.set(row.event_id, { ...roundFans.get(row.event_id), [row.round_id]: Number(row.fans) });
  }

  return {
    events: (events.data as (EventWithRounds & { status: AdminEvent["status"]; updated_at: string })[]).map(
      (row) => ({
        ...toPublicEvent(row),
        status: row.status,
        updatedAt: row.updated_at,
        fans: fans.get(row.id) ?? 0,
        roundFans: roundFans.get(row.id) ?? {},
      }),
    ),
    members: members.data.map(toPublicMember),
  };
}
