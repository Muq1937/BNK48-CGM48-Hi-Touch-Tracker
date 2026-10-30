// Signed-in mode: the user's log lives in Supabase. RLS restricts every query
// to the user's own rows; userId is only used to fill user_id on writes.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { MergePlan, Resolutions } from "../merge";
import type { LogRepository, StorageHealth } from "../repository";
import type { UserLog } from "../types";
import type { Database } from "./database.types";
import { ENTRY_SELECT, mergeWrites, toUserLog, type EntryWithEvent } from "./mappers";

export class SupabaseLogRepository implements LogRepository {
  readonly mode = "account" as const;

  constructor(
    private readonly db: SupabaseClient<Database>,
    private readonly userId: string,
  ) {}

  async load(): Promise<{ log: UserLog; health: StorageHealth }> {
    return { log: await this.fetchLog(), health: "ok" };
  }

  async logEvent(eventId: string, rounds: { roundId: string; tickets: number }[], note?: string) {
    const { error } = await this.db.rpc("log_event", {
      p_event_id: eventId,
      p_rounds: rounds.filter((r) => r.tickets > 0).map((r) => ({ round_id: r.roundId, tickets: r.tickets })),
      p_note: note ?? null,
    });
    if (error) throw error;
    return this.fetchLog();
  }

  async editEvent(eventId: string, rounds: { roundId: string; tickets: number }[], note?: string) {
    const { error } = await this.db.rpc("set_event_log", {
      p_event_id: eventId,
      p_rounds: rounds.map((r) => ({ round_id: r.roundId, tickets: r.tickets })),
      p_note: note ?? null,
    });
    if (error) throw error;
    return this.fetchLog();
  }

  async setOshi(memberId: string, on: boolean) {
    const { error } = on
      ? await this.db
          .from("user_oshi")
          .upsert({ user_id: this.userId, member_id: memberId }, { ignoreDuplicates: true })
      : await this.db.from("user_oshi").delete().eq("user_id", this.userId).eq("member_id", memberId);
    if (error) throw error;
    return this.fetchLog();
  }

  async merge(plan: MergePlan, resolutions: Resolutions) {
    const writes = mergeWrites(plan, resolutions, this.userId);
    // Set semantics (not add), so running the same merge twice is harmless.
    if (writes.entries.length) {
      const { error } = await this.db
        .from("log_entries")
        .upsert(writes.entries, { onConflict: "user_id,round_id" });
      if (error) throw error;
    }
    if (writes.notes.length) {
      const { error } = await this.db
        .from("event_notes")
        .upsert(writes.notes, { onConflict: "user_id,event_id" });
      if (error) throw error;
    }
    if (writes.oshi.length) {
      const { error } = await this.db.from("user_oshi").upsert(writes.oshi, { ignoreDuplicates: true });
      if (error) throw error;
    }
    return this.fetchLog();
  }

  private async fetchLog(): Promise<UserLog> {
    const [entries, notes, oshi] = await Promise.all([
      this.db.from("log_entries").select(ENTRY_SELECT),
      this.db.from("event_notes").select("event_id, note"),
      this.db.from("user_oshi").select("member_id"),
    ]);
    if (entries.error) throw entries.error;
    if (notes.error) throw notes.error;
    if (oshi.error) throw oshi.error;
    return toUserLog(entries.data as EntryWithEvent[], notes.data, oshi.data);
  }
}
