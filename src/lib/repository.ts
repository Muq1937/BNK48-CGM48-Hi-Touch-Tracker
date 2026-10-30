// Storage-agnostic access to a user's log. UI code talks to `LogRepository`
// and never knows whether it is in guest mode (localStorage) or signed in
// (Supabase, from M2).

import {
  CORRUPT_BACKUP_KEY,
  GUEST_STORE_KEY,
  addTickets,
  readGuestStore,
  setNote,
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

  async setOshi(memberId: string, on: boolean) {
    const store = await this.current();
    return this.commit({ ...store, oshi: toggleOshi(store.oshi, memberId, on) });
  }

  async merge(plan: MergePlan, resolutions: Resolutions) {
    const store = await this.current();
    const merged = applyMerge(toUserLog(store), plan, resolutions, this.clock());
    return this.commit({ ...store, ...merged });
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
