import { describe, expect, it } from "vitest";
import {
  GUEST_STORE_KEY,
  addTickets,
  emptyGuestStore,
  migrateGuestStore,
  readGuestStore,
  setNote,
  setTickets,
  toggleOshi,
  writeGuestStore,
} from "./guestStore";
import { MemoryStorage } from "./testing/memoryStorage";

const now = "2026-10-30T10:00:00.000Z";

describe("readGuestStore", () => {
  it("reports empty storage", () => {
    expect(readGuestStore(new MemoryStorage())).toEqual({ status: "empty", store: emptyGuestStore() });
  });

  it("reports unavailable storage", () => {
    expect(readGuestStore(null).status).toBe("unavailable");
    const throwing = new MemoryStorage();
    throwing.getItem = () => {
      throw new Error("SecurityError");
    };
    expect(readGuestStore(throwing).status).toBe("unavailable");
  });

  it("reports corrupt data and keeps the raw text", () => {
    const storage = new MemoryStorage();
    storage.data.set(GUEST_STORE_KEY, "{not json");
    const result = readGuestStore(storage);
    expect(result.status).toBe("corrupt");
    expect(result.status === "corrupt" && result.raw).toBe("{not json");
  });

  it("rejects invalid shapes", () => {
    const storage = new MemoryStorage();
    storage.data.set(
      GUEST_STORE_KEY,
      JSON.stringify({ version: 1, entries: [{ roundId: "r", tickets: -1 }] }),
    );
    expect(readGuestStore(storage).status).toBe("corrupt");
  });

  it("round-trips a valid store", () => {
    const storage = new MemoryStorage();
    const store = {
      ...emptyGuestStore(),
      entries: [{ eventId: "e", roundId: "r", tickets: 2, updatedAt: now }],
      notes: { e: "hi" },
      oshi: ["m"],
    };
    expect(writeGuestStore(storage, store)).toEqual({ ok: true });
    expect(readGuestStore(storage)).toEqual({ status: "ok", store });
  });
});

describe("writeGuestStore", () => {
  it("reports a full quota", () => {
    const storage = new MemoryStorage();
    const err = new Error("full");
    err.name = "QuotaExceededError";
    storage.failWith = err;
    expect(writeGuestStore(storage, emptyGuestStore())).toEqual({ ok: false, reason: "quota" });
  });

  it("reports missing storage", () => {
    expect(writeGuestStore(null, emptyGuestStore())).toEqual({ ok: false, reason: "unavailable" });
  });
});

describe("migrateGuestStore", () => {
  it("rejects unknown versions", () => {
    expect(() => migrateGuestStore({ version: 99 })).toThrow(/version/);
    expect(() => migrateGuestStore(null)).toThrow();
  });

  it("collapses duplicate rounds and blank notes", () => {
    const store = migrateGuestStore({
      version: 1,
      entries: [
        { eventId: "e", roundId: "r", tickets: 2, updatedAt: "2026-01-01" },
        { eventId: "e", roundId: "r", tickets: 3, updatedAt: "2026-02-01" },
      ],
      notes: { e: "  " },
      oshi: ["a", "a"],
    });
    expect(store.entries).toEqual([{ eventId: "e", roundId: "r", tickets: 5, updatedAt: "2026-02-01" }]);
    expect(store.notes).toEqual({});
    expect(store.oshi).toEqual(["a"]);
  });
});

describe("pure updates", () => {
  it("adds tickets to an existing round instead of replacing", () => {
    const first = addTickets([], [{ eventId: "e", roundId: "r1", tickets: 3 }], now);
    const second = addTickets(
      first,
      [
        { eventId: "e", roundId: "r1", tickets: 2 },
        { eventId: "e", roundId: "r2", tickets: 1 },
        { eventId: "e", roundId: "r3", tickets: 0 },
      ],
      now,
    );
    expect(second.map((e) => [e.roundId, e.tickets])).toEqual([
      ["r1", 5],
      ["r2", 1],
    ]);
    expect(first[0].tickets).toBe(3); // input untouched
  });

  it("sets tickets and removes at zero", () => {
    const entries = addTickets([], [{ eventId: "e", roundId: "r1", tickets: 3 }], now);
    expect(setTickets(entries, { eventId: "e", roundId: "r1", tickets: 1 }, now)[0].tickets).toBe(1);
    expect(setTickets(entries, { eventId: "e", roundId: "r1", tickets: 0 }, now)).toEqual([]);
  });

  it("trims notes and deletes empty ones", () => {
    expect(setNote({}, "e", "  great  ")).toEqual({ e: "great" });
    expect(setNote({ e: "x" }, "e", " ")).toEqual({});
  });

  it("toggles oshi without duplicates", () => {
    expect(toggleOshi(toggleOshi(["a"], "a", true), "b", true)).toEqual(["a", "b"]);
    expect(toggleOshi(["a", "b"], "a", false)).toEqual(["b"]);
  });
});
