// Versioned guest storage format, validated with Zod on every read.
// Framework-free: storage access goes through the minimal `KeyValueStorage`
// interface so it can be tested without a browser.

import { z } from "zod";
import type { LogEntry, UserLog } from "./types";

export const GUEST_STORE_KEY = "htlog:v1";
/** Where unreadable data is parked before it would be overwritten. */
export const CORRUPT_BACKUP_KEY = "htlog:corrupt-backup";

const groupCode = z.enum(["BNK48", "CGM48"]);

const publicMemberSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  nickname: z.string().min(1),
  fullNameTh: z.string().optional(),
  group: groupCode,
  photoUrl: z.string().optional(),
  photoCredit: z.string().optional(),
  profileUrl: z.string().optional(),
  status: z.enum(["active", "graduated"]),
});

const publicEventSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  venue: z.string().optional(),
  city: z.string().optional(),
  scope: z.enum(["BNK48", "CGM48", "JOINT"]),
  rounds: z.array(
    z.object({
      id: z.string().min(1),
      position: z.number().int(),
      label: z.string().optional(),
      memberIds: z.array(z.string()),
    }),
  ),
});

export const logEntrySchema = z.object({
  eventId: z.string().min(1),
  roundId: z.string().min(1),
  tickets: z.number().int().positive(),
  updatedAt: z.string(),
});

export const guestStoreV1Schema = z.object({
  version: z.literal(1),
  entries: z.array(logEntrySchema),
  notes: z.record(z.string(), z.string()),
  oshi: z.array(z.string()),
  /** Set when this device's log was last merged into an account. */
  mergedAt: z.string().optional(),
  cache: z
    .object({
      fetchedAt: z.string(),
      events: z.array(publicEventSchema),
      members: z.array(publicMemberSchema),
    })
    .optional(),
});

export type GuestStore = z.infer<typeof guestStoreV1Schema>;

export function emptyGuestStore(): GuestStore {
  return { version: 1, entries: [], notes: {}, oshi: [] };
}

/**
 * Bring any known stored shape up to the current version and validate it.
 * Add a step here for each future version (v1 -> v2 -> ...).
 */
export function migrateGuestStore(raw: unknown): GuestStore {
  const version =
    typeof raw === "object" && raw !== null && "version" in raw
      ? (raw as { version: unknown }).version
      : undefined;
  switch (version) {
    case 1:
      return normalize(guestStoreV1Schema.parse(raw));
    default:
      throw new Error(`Unsupported guest store version: ${String(version)}`);
  }
}

/** Collapse duplicate round entries (adding tickets) and drop empty notes. */
function normalize(store: GuestStore): GuestStore {
  const byRound = new Map<string, LogEntry>();
  for (const entry of store.entries) {
    const prev = byRound.get(entry.roundId);
    byRound.set(
      entry.roundId,
      prev
        ? {
            ...entry,
            tickets: prev.tickets + entry.tickets,
            updatedAt: prev.updatedAt > entry.updatedAt ? prev.updatedAt : entry.updatedAt,
          }
        : entry,
    );
  }
  const notes = Object.fromEntries(Object.entries(store.notes).filter(([, note]) => note.trim() !== ""));
  return { ...store, entries: [...byRound.values()], notes, oshi: [...new Set(store.oshi)] };
}

export function toUserLog(store: GuestStore): UserLog {
  return { entries: store.entries, notes: store.notes, oshi: store.oshi };
}

// ---------------------------------------------------------------------------
// Storage access

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type ReadResult =
  | { status: "ok"; store: GuestStore }
  | { status: "empty"; store: GuestStore }
  | { status: "corrupt"; store: GuestStore; raw: string }
  | { status: "unavailable"; store: GuestStore };

export function readGuestStore(storage: KeyValueStorage | null): ReadResult {
  if (!storage) return { status: "unavailable", store: emptyGuestStore() };
  let raw: string | null;
  try {
    raw = storage.getItem(GUEST_STORE_KEY);
  } catch {
    return { status: "unavailable", store: emptyGuestStore() };
  }
  if (raw === null) return { status: "empty", store: emptyGuestStore() };
  try {
    return { status: "ok", store: migrateGuestStore(JSON.parse(raw)) };
  } catch {
    return { status: "corrupt", store: emptyGuestStore(), raw };
  }
}

export type WriteResult = { ok: true } | { ok: false; reason: "quota" | "unavailable" };

export function writeGuestStore(storage: KeyValueStorage | null, store: GuestStore): WriteResult {
  if (!storage) return { ok: false, reason: "unavailable" };
  try {
    storage.setItem(GUEST_STORE_KEY, JSON.stringify(guestStoreV1Schema.parse(store)));
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: isQuotaError(error) ? "quota" : "unavailable" };
  }
}

function isQuotaError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED")
  );
}

/** `window.localStorage`, or null when it is missing or blocked (private mode, SSR). */
export function browserStorage(): KeyValueStorage | null {
  try {
    if (typeof window === "undefined") return null;
    const storage = window.localStorage;
    const probe = "htlog:probe";
    storage.setItem(probe, probe);
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Pure updates

/**
 * Add tickets to rounds. Logging a round that already has an entry adds to it,
 * matching the server upsert (`tickets = tickets + excluded.tickets`).
 */
export function addTickets(
  entries: LogEntry[],
  additions: { eventId: string; roundId: string; tickets: number }[],
  now: string,
): LogEntry[] {
  const next = entries.map((e) => ({ ...e }));
  for (const { eventId, roundId, tickets } of additions) {
    if (!Number.isInteger(tickets) || tickets <= 0) continue;
    const existing = next.find((e) => e.roundId === roundId);
    if (existing) {
      existing.tickets += tickets;
      existing.updatedAt = now;
    } else {
      next.push({ eventId, roundId, tickets, updatedAt: now });
    }
  }
  return next;
}

/** Set (not add) a round's ticket count. 0 removes the entry. */
export function setTickets(
  entries: LogEntry[],
  entry: { eventId: string; roundId: string; tickets: number },
  now: string,
): LogEntry[] {
  const rest = entries.filter((e) => e.roundId !== entry.roundId);
  if (entry.tickets <= 0) return rest;
  return [...rest, { ...entry, updatedAt: now }];
}

export function setNote(notes: Record<string, string>, eventId: string, note: string) {
  const next = { ...notes };
  if (note.trim()) next[eventId] = note.trim();
  else delete next[eventId];
  return next;
}

export function toggleOshi(oshi: string[], memberId: string, on: boolean): string[] {
  const rest = oshi.filter((id) => id !== memberId);
  return on ? [...rest, memberId] : rest;
}
