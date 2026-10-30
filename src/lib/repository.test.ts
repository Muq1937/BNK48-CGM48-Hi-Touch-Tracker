import { describe, expect, it } from "vitest";
import { CORRUPT_BACKUP_KEY, GUEST_STORE_KEY } from "./guestStore";
import { MemoryStorage } from "./testing/memoryStorage";
import { planMerge } from "./merge";
import { LocalLogRepository, StorageFullError } from "./repository";

const clock = () => "2026-10-30T00:00:00.000Z";

describe("LocalLogRepository", () => {
  it("logs an event, adding to existing rounds, and persists", async () => {
    const storage = new MemoryStorage();
    const repo = new LocalLogRepository(storage, clock);
    expect((await repo.load()).log.entries).toEqual([]);

    await repo.logEvent("e1", [{ roundId: "r1", tickets: 3 }], "first");
    const log = await repo.logEvent("e1", [
      { roundId: "r1", tickets: 2 },
      { roundId: "r2", tickets: 1 },
    ]);
    expect(log.entries.map((x) => [x.roundId, x.tickets])).toEqual([
      ["r1", 5],
      ["r2", 1],
    ]);
    expect(log.notes).toEqual({ e1: "first" }); // undefined note leaves it alone

    const reloaded = await new LocalLogRepository(storage, clock).load();
    expect(reloaded.log).toEqual(log);
  });

  it("toggles oshi", async () => {
    const repo = new LocalLogRepository(new MemoryStorage(), clock);
    await repo.setOshi("fah", true);
    expect((await repo.setOshi("bow", true)).oshi).toEqual(["fah", "bow"]);
    expect((await repo.setOshi("fah", false)).oshi).toEqual(["bow"]);
  });

  it("keeps working in memory when storage is unavailable", async () => {
    const repo = new LocalLogRepository(null, clock);
    expect((await repo.load()).health).toBe("unavailable");
    const log = await repo.logEvent("e1", [{ roundId: "r1", tickets: 1 }]);
    expect(log.entries).toHaveLength(1);
  });

  it("throws StorageFullError and keeps the previous state when quota is exceeded", async () => {
    const storage = new MemoryStorage();
    const repo = new LocalLogRepository(storage, clock);
    await repo.logEvent("e1", [{ roundId: "r1", tickets: 1 }]);
    const err = new Error("full");
    err.name = "QuotaExceededError";
    storage.failWith = err;
    await expect(repo.logEvent("e1", [{ roundId: "r1", tickets: 1 }])).rejects.toBeInstanceOf(
      StorageFullError,
    );
    storage.failWith = null;
    expect((await repo.setOshi("x", true)).entries[0].tickets).toBe(1);
  });

  it("backs up unreadable data before the first write", async () => {
    const storage = new MemoryStorage();
    storage.data.set(GUEST_STORE_KEY, "garbage");
    const repo = new LocalLogRepository(storage, clock);
    expect((await repo.load()).health).toBe("recovered");
    await repo.setOshi("fah", true);
    expect(storage.data.get(CORRUPT_BACKUP_KEY)).toBe("garbage");
  });

  it("records mergedAt without touching the log, and clears on request", async () => {
    const storage = new MemoryStorage();
    const repo = new LocalLogRepository(storage, clock);
    await repo.logEvent("e1", [{ roundId: "r1", tickets: 2 }]);
    expect(await repo.mergedAt()).toBeNull();
    await repo.markMerged();
    const reloaded = new LocalLogRepository(storage, clock);
    expect(await reloaded.mergedAt()).toBe(clock());
    expect((await reloaded.load()).log.entries).toHaveLength(1);

    await reloaded.clear();
    expect(storage.data.has(GUEST_STORE_KEY)).toBe(false);
    expect((await new LocalLogRepository(storage, clock).load()).log.entries).toEqual([]);
  });

  it("applies a merge plan", async () => {
    const repo = new LocalLogRepository(new MemoryStorage(), clock);
    const existing = await repo.logEvent("e1", [{ roundId: "r1", tickets: 2 }]);
    const plan = planMerge(
      {
        entries: [
          { eventId: "e1", roundId: "r1", tickets: 4, updatedAt: "x" },
          { eventId: "e1", roundId: "r2", tickets: 1, updatedAt: "x" },
        ],
        notes: {},
        oshi: [],
      },
      existing,
    );
    const merged = await repo.merge(plan, { "round:r1": "incoming" });
    expect(merged.entries.map((x) => [x.roundId, x.tickets])).toEqual([
      ["r1", 4],
      ["r2", 1],
    ]);
  });
});
