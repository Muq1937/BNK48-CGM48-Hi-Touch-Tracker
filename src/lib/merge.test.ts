import { describe, expect, it } from "vitest";
import { applyMerge, conflictKey, isNoOp, planMerge, restrictToCatalog, unresolved } from "./merge";
import { buildCatalog } from "./stats";
import type { LogEntry, UserLog } from "./types";

const at = "2026-10-01T00:00:00.000Z";
const now = "2026-10-30T00:00:00.000Z";
const e = (roundId: string, tickets: number): LogEntry => ({
  eventId: "ev",
  roundId,
  tickets,
  updatedAt: at,
});

const device: UserLog = {
  entries: [e("r1", 3), e("r2", 2), e("r3", 4)],
  notes: { ev: "from device", ev2: "only here" },
  oshi: ["fah", "bow"],
};
const account: UserLog = {
  entries: [e("r1", 3), e("r2", 5)],
  notes: { ev: "from account" },
  oshi: ["fah"],
};

describe("planMerge", () => {
  it("inserts new rounds, skips equal ones and flags differences", () => {
    const plan = planMerge(device, account);
    expect(plan.inserts.map((x) => x.roundId)).toEqual(["r3"]);
    expect(plan.unchanged).toBe(1);
    expect(plan.conflicts).toEqual([
      { kind: "round", eventId: "ev", roundId: "r2", incoming: 2, existing: 5 },
      { kind: "note", eventId: "ev", incoming: "from device", existing: "from account" },
    ]);
    expect(plan.noteInserts).toEqual({ ev2: "only here" });
    expect(plan.oshiAdds).toEqual(["bow"]);
  });
});

describe("applyMerge", () => {
  it("refuses to apply with unresolved conflicts", () => {
    const plan = planMerge(device, account);
    expect(unresolved(plan, {})).toHaveLength(2);
    expect(() => applyMerge(account, plan, {}, now)).toThrow(/not resolved/);
  });

  it("never adds conflicting counts together", () => {
    const plan = planMerge(device, account);
    const keepDevice = Object.fromEntries(plan.conflicts.map((c) => [conflictKey(c), "incoming" as const]));
    const merged = applyMerge(account, plan, keepDevice, now);
    const tickets = Object.fromEntries(merged.entries.map((x) => [x.roundId, x.tickets]));
    expect(tickets).toEqual({ r1: 3, r2: 2, r3: 4 });
    expect(merged.notes).toEqual({ ev: "from device", ev2: "only here" });
    expect(merged.oshi).toEqual(["fah", "bow"]);

    const keepAccount = Object.fromEntries(plan.conflicts.map((c) => [conflictKey(c), "existing" as const]));
    const merged2 = applyMerge(account, plan, keepAccount, now);
    expect(Object.fromEntries(merged2.entries.map((x) => [x.roundId, x.tickets]))).toEqual({
      r1: 3,
      r2: 5,
      r3: 4,
    });
    expect(merged2.notes.ev).toBe("from account");
  });

  it("is idempotent: merging again changes nothing", () => {
    const plan = planMerge(device, account);
    const choices = Object.fromEntries(plan.conflicts.map((c) => [conflictKey(c), "existing" as const]));
    const once = applyMerge(account, plan, choices, now);

    // Re-plan against the merged result: only the conflicts the user decided
    // against remain, and keeping the account's values again is a no-op.
    const again = planMerge(device, once);
    expect(again.inserts).toEqual([]);
    expect(again.oshiAdds).toEqual([]);
    const twice = applyMerge(
      once,
      again,
      Object.fromEntries(again.conflicts.map((c) => [conflictKey(c), "existing" as const])),
      now,
    );
    expect(twice).toEqual(once);
  });

  it("reports a no-op plan for identical logs", () => {
    expect(isNoOp(planMerge(account, account))).toBe(true);
  });
});

describe("restrictToCatalog", () => {
  it("drops entries, notes and oshi that point at unknown ids", () => {
    const catalog = buildCatalog(
      [
        {
          id: "ev",
          name: "E",
          date: "2026-10-01",
          scope: "BNK48",
          rounds: [{ id: "r1", position: 1, memberIds: [] }],
        },
      ],
      [{ id: "fah", slug: "fah", nickname: "Fah", group: "BNK48", status: "active" }],
    );
    expect(restrictToCatalog(device, catalog)).toEqual({
      entries: [e("r1", 3)],
      notes: { ev: "from device" },
      oshi: ["fah"],
    });
  });
});
