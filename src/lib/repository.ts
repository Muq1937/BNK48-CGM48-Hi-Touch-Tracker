// Storage-agnostic access to a user's log. UI code talks to `LogRepository`
// and never knows whether it is in guest mode (localStorage) or signed in
// (Supabase, from M2).

import {
  CORRUPT_BACKUP_KEY,
  GUEST_STORE_KEY,
  addTickets,
  readGuestStore,
  setNote,
  setTickets,
  toUserLog,
  toggleOshi,
  writeGuestStore,
  type GuestStore,
  type KeyValueStorage,
} from "./guestStore";
import { applyMerge, type MergePlan, type Resolutions } from "./merge";
import type { UserLog } from "./types";

export type StorageHealth = "ok" | "unavailable" | "recovered";

export interface LogRepository {
  readonly mode: "guest" | "account";
  load(): Promise<{ log: UserLog; health: StorageHealth }>;
  /** Adds tickets to each round (existing entries grow). A non-undefined note replaces the event's note. */
  logEvent(eventId: string, rounds: { roundId: string; tickets: number }[], note?: string): Promise<UserLog>;
  /**
   * Corrects an event already logged: sets (never adds) each listed round's tickets, and 0
   * removes that round. A non-undefined note replaces the event's note ("" removes it).
   */
  editEvent(eventId: string, rounds: { roundId: string; tickets: number }[], note?: string): Promise<UserLog>;
  setOshi(memberId: string, on: boolean): Promise<UserLog>;
  /** Apply a merge plan (from an import or a guest log) with the user's conflict choices. */
  merge(plan: MergePlan, resolutions: Resolutions): Promise<UserLog>;
}

export class StorageFullError extends Error {
  constructor() {
    super("Browser storage is full");
    this.name = "StorageFullError";
  }
}

/**
 * Guest mode. Keeps an in-memory copy so the app keeps working for the
 * session even when localStorage is blocked (private mode).
 */
export class LocalLogRepository implements LogRepository {
  readonly mode = "guest" as const;
  private store: GuestStore | null = null;
  private corruptRaw: string | null = null;
  private health: StorageHealth = "ok";

  constructor(
    private readonly storage: KeyValueStorage | null,
    private readonly clock: () => string = () => new Date().toISOString(),
  ) {}

  async load() {
    const result = readGuestStore(this.storage);
    this.store = result.store;
    if (result.status === "unavailable") this.health = "unavailable";
    else if (result.status === "corrupt") {
      this.corruptRaw = result.raw;
      this.health = "recovered";
    }
    return { log: toUserLog(this.store), health: this.health };
  }

  async logEvent(eventId: string, rounds: { roundId: string; tickets: number }[], note?: string) {
    const store = await this.current();
    const now = this.clock();
    return this.commit({
      ...store,
      entries: addTickets(
        store.entries,
        rounds.map((r) => ({ ...r, eventId })),
        now,
      ),
      notes: note === undefined ? store.notes : setNote(store.notes, eventId, note),
    });
  }

  async editEvent(eventId: string, rounds: { roundId: string; tickets: number }[], note?: string) {
    const store = await this.current();
    const now = this.clock();
    let entries = store.entries;
    for (const { roundId, tickets } of rounds) {
      if (!Number.isInteger(tickets) || tickets < 0) throw new RangeError(`Invalid ticket count: ${tickets}`);
      // Leave untouched rounds alone so their updatedAt stays meaningful.
      if ((entries.find((e) => e.roundId === roundId)?.tickets ?? 0) === tickets) continue;
      entries = setTickets(entries, { eventId, roundId, tickets }, now);
    }
    return this.commit({
      ...store,
      entries,
      notes: note === undefined ? store.notes : setNote(store.notes, eventId, note),
    });
  }

  async setOshi(memberId: string, on: boolean) {
    const store = await this.current();
    return this.commit({ ...store, oshi: toggleOshi(store.oshi, memberId, on) });
  }

  async merge(plan: MergePlan, resolutions: Resolutions) {
    const store = await this.current();
    const merged = applyMerge(toUserLog(store), plan, resolutions, this.clock());
    return this.commit({ ...store, ...merged });
  }

  /** When this device's log was last added to an account, if ever. */
  async mergedAt(): Promise<string | null> {
    return (await this.current()).mergedAt ?? null;
  }

  /** Record that this device's log was added to an account. The log itself is kept. */
  async markMerged(): Promise<void> {
    const store = await this.current();
    this.commit({ ...store, mergedAt: this.clock() });
  }

  /** Remove the guest log from this device (Settings). */
  async clear(): Promise<void> {
    try {
      this.storage?.removeItem(GUEST_STORE_KEY);
    } catch {
      // Storage blocked: nothing persisted to remove.
    }
    this.store = { version: 1, entries: [], notes: {}, oshi: [] };
  }

  private async current(): Promise<GuestStore> {
    if (!this.store) await this.load();
    return this.store!;
  }

  private commit(next: GuestStore): UserLog {
    if (this.storage && this.corruptRaw !== null) {
      // Never overwrite data we could not read without keeping a copy.
      try {
        this.storage.setItem(CORRUPT_BACKUP_KEY, this.corruptRaw);
        this.corruptRaw = null;
      } catch {
        // Fall through; the write below reports the real problem.
      }
    }
    const result = writeGuestStore(this.storage, next);
    if (!result.ok && result.reason === "quota") throw new StorageFullError();
    if (!result.ok) this.health = "unavailable";
    this.store = next;
    return toUserLog(next);
  }
}

export { GUEST_STORE_KEY };
