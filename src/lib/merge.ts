// Merging one log into another: used after sign-in (device -> account) and
// when importing a backup file (file -> this device).
//
// Rules: a round only in the incoming log is inserted; same ticket count is
// skipped; a different count is a conflict the user resolves. Ticket counts
// are never silently added together. Applying a plan *sets* counts, so running
// the same merge twice changes nothing the second time.

import type { LogEntry, UserLog } from "./types";

export interface RoundConflict {
  kind: "round";
  eventId: string;
  roundId: string;
  incoming: number;
  existing: number;
}

export interface NoteConflict {
  kind: "note";
  eventId: string;
  incoming: string;
  existing: string;
}

export type Conflict = RoundConflict | NoteConflict;

export interface MergePlan {
  /** Rounds only in the incoming log. */
  inserts: LogEntry[];
  /** Notes only in the incoming log. */
  noteInserts: Record<string, string>;
  /** Rounds with the same count on both sides. */
  unchanged: number;
  conflicts: Conflict[];
  /** Incoming oshi not yet in the existing log. */
  oshiAdds: string[];
}

export function conflictKey(c: Conflict): string {
  return c.kind === "round" ? `round:${c.roundId}` : `note:${c.eventId}`;
}

export function planMerge(incoming: UserLog, existing: UserLog): MergePlan {
  const existingByRound = new Map(existing.entries.map((e) => [e.roundId, e]));
  const plan: MergePlan = { inserts: [], noteInserts: {}, unchanged: 0, conflicts: [], oshiAdds: [] };

  for (const entry of incoming.entries) {
    const current = existingByRound.get(entry.roundId);
    if (!current) plan.inserts.push(entry);
    else if (current.tickets === entry.tickets) plan.unchanged++;
    else
      plan.conflicts.push({
        kind: "round",
        eventId: entry.eventId,
        roundId: entry.roundId,
        incoming: entry.tickets,
        existing: current.tickets,
      });
  }

  for (const [eventId, note] of Object.entries(incoming.notes)) {
    const current = existing.notes[eventId];
    if (!note.trim() || current === note) continue;
    if (!current) plan.noteInserts[eventId] = note;
    else plan.conflicts.push({ kind: "note", eventId, incoming: note, existing: current });
  }

  const have = new Set(existing.oshi);
  plan.oshiAdds = [...new Set(incoming.oshi)].filter((id) => !have.has(id));
  return plan;
}

/** Per conflict key: keep the incoming value or the existing one. */
export type Resolutions = Record<string, "incoming" | "existing">;

export function unresolved(plan: MergePlan, resolutions: Resolutions): Conflict[] {
  return plan.conflicts.filter((c) => !resolutions[conflictKey(c)]);
}

/**
 * Apply a plan to the existing log. Every conflict must be resolved.
 * Returns the merged log; the inputs are not modified.
 */
export function applyMerge(
  existing: UserLog,
  plan: MergePlan,
  resolutions: Resolutions,
  now: string,
): UserLog {
  const missing = unresolved(plan, resolutions);
  if (missing.length > 0) throw new Error(`${missing.length} conflict(s) not resolved`);

  const entries = new Map(existing.entries.map((e) => [e.roundId, { ...e }]));
  const notes = { ...existing.notes, ...plan.noteInserts };

  for (const entry of plan.inserts) {
    if (!entries.has(entry.roundId)) entries.set(entry.roundId, { ...entry, updatedAt: now });
  }
  for (const c of plan.conflicts) {
    if (resolutions[conflictKey(c)] !== "incoming") continue;
    if (c.kind === "round") {
      entries.set(c.roundId, { eventId: c.eventId, roundId: c.roundId, tickets: c.incoming, updatedAt: now });
    } else {
      notes[c.eventId] = c.incoming;
    }
  }

  return {
    entries: [...entries.values()],
    notes,
    oshi: [...existing.oshi, ...plan.oshiAdds.filter((id) => !existing.oshi.includes(id))],
  };
}

export function isNoOp(plan: MergePlan): boolean {
  return (
    plan.inserts.length === 0 &&
    plan.conflicts.length === 0 &&
    plan.oshiAdds.length === 0 &&
    Object.keys(plan.noteInserts).length === 0
  );
}
