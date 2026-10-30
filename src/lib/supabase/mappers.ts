// Pure conversions between database rows and app types. No client, no I/O.

import { conflictKey, type MergePlan, type Resolutions } from "../merge";
import type { LogEntry, PublicEvent, PublicMember, UserLog } from "../types";
import type { Database } from "./database.types";

type Tables = Database["public"]["Tables"];
type MemberRow = Tables["members"]["Row"];
type EventRow = Tables["events"]["Row"];
type RoundRow = Tables["rounds"]["Row"];

const opt = (v: string | null) => (v === null || v === "" ? undefined : v);

export function toPublicMember(row: MemberRow): PublicMember {
  return {
    id: row.id,
    slug: row.slug,
    nickname: row.nickname,
    fullNameTh: opt(row.full_name_th),
    group: row.group_code,
    photoUrl: opt(row.photo_url),
    photoCredit: opt(row.photo_credit),
    profileUrl: opt(row.profile_url),
    status: row.status,
  };
}

export type EventWithRounds = Pick<EventRow, "id" | "name" | "event_date" | "venue" | "city" | "scope"> & {
  rounds: (Pick<RoundRow, "id" | "position" | "label"> & { round_members: { member_id: string }[] })[];
};

/** Columns for `from("events").select(EVENT_SELECT)` that `toPublicEvent` expects. */
export const EVENT_SELECT =
  "id, name, event_date, venue, city, scope, rounds(id, position, label, round_members(member_id))";

export function toPublicEvent(row: EventWithRounds): PublicEvent {
  return {
    id: row.id,
    name: row.name,
    date: row.event_date,
    venue: opt(row.venue),
    city: opt(row.city),
    scope: row.scope,
    rounds: [...row.rounds]
      .sort((a, b) => a.position - b.position)
      .map((r) => ({
        id: r.id,
        position: r.position,
        label: opt(r.label),
        memberIds: r.round_members.map((rm) => rm.member_id),
      })),
  };
}

export type EntryWithEvent = {
  round_id: string;
  tickets: number;
  updated_at: string;
  rounds: { event_id: string } | null;
};

/** Columns for `from("log_entries").select(ENTRY_SELECT)`. */
export const ENTRY_SELECT = "round_id, tickets, updated_at, rounds(event_id)";

export function toUserLog(
  entries: EntryWithEvent[],
  notes: { event_id: string; note: string }[],
  oshi: { member_id: string }[],
): UserLog {
  return {
    entries: entries
      // A round the user can no longer see (event unpublished) has no event; skip it.
      .filter((e): e is EntryWithEvent & { rounds: { event_id: string } } => e.rounds !== null)
      .map((e): LogEntry => ({
        eventId: e.rounds.event_id,
        roundId: e.round_id,
        tickets: e.tickets,
        updatedAt: e.updated_at,
      })),
    notes: Object.fromEntries(notes.map((n) => [n.event_id, n.note])),
    oshi: oshi.map((o) => o.member_id),
  };
}

export interface MergeWrites {
  /** Upserted with *set* semantics, so re-running a merge never double-counts. */
  entries: { user_id: string; round_id: string; tickets: number }[];
  notes: { user_id: string; event_id: string; note: string }[];
  oshi: { user_id: string; member_id: string }[];
}

/** Rows to write for a merge plan and the user's conflict choices. */
export function mergeWrites(plan: MergePlan, resolutions: Resolutions, userId: string): MergeWrites {
  const writes: MergeWrites = { entries: [], notes: [], oshi: [] };
  for (const e of plan.inserts) {
    writes.entries.push({ user_id: userId, round_id: e.roundId, tickets: e.tickets });
  }
  for (const [eventId, note] of Object.entries(plan.noteInserts)) {
    writes.notes.push({ user_id: userId, event_id: eventId, note });
  }
  for (const c of plan.conflicts) {
    const choice = resolutions[conflictKey(c)];
    if (!choice) throw new Error("Every conflict must be resolved before merging");
    if (choice !== "incoming") continue;
    if (c.kind === "round")
      writes.entries.push({ user_id: userId, round_id: c.roundId, tickets: c.incoming });
    else writes.notes.push({ user_id: userId, event_id: c.eventId, note: c.incoming });
  }
  for (const memberId of plan.oshiAdds) writes.oshi.push({ user_id: userId, member_id: memberId });
  return writes;
}
