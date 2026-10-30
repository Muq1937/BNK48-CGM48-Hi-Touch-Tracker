import { describe, expect, it } from "vitest";
import { conflictKey, planMerge } from "../merge";
import type { UserLog } from "../types";
import { mergeWrites, toPublicEvent, toPublicMember, toUserLog } from "./mappers";

describe("toPublicMember", () => {
  it("maps columns and drops empty optional fields", () => {
    expect(
      toPublicMember({
        id: "m1",
        slug: "fah",
        nickname: "Fah",
        full_name_th: null,
        group_code: "BNK48",
        photo_url: "",
        photo_credit: null,
        profile_url: "https://bnk48.com/members/fah",
        status: "active",
        created_at: "2026-10-30T00:00:00Z",
      }),
    ).toEqual({
      id: "m1",
      slug: "fah",
      nickname: "Fah",
      fullNameTh: undefined,
      group: "BNK48",
      photoUrl: undefined,
      photoCredit: undefined,
      profileUrl: "https://bnk48.com/members/fah",
      status: "active",
    });
  });
});

describe("toPublicEvent", () => {
  it("sorts rounds by position and flattens lineups", () => {
    const event = toPublicEvent({
      id: "e1",
      name: "Event",
      event_date: "2026-10-18",
      venue: null,
      city: "Bangkok",
      scope: "JOINT",
      rounds: [
        { id: "r2", position: 2, label: null, round_members: [{ member_id: "b" }] },
        { id: "r1", position: 1, label: "Lane A", round_members: [{ member_id: "a" }, { member_id: "c" }] },
      ],
    });
    expect(event.rounds).toEqual([
      { id: "r1", position: 1, label: "Lane A", memberIds: ["a", "c"] },
      { id: "r2", position: 2, label: undefined, memberIds: ["b"] },
    ]);
    expect(event.date).toBe("2026-10-18");
    expect(event.venue).toBeUndefined();
  });
});

describe("toUserLog", () => {
  it("attaches event ids and skips entries whose round is hidden", () => {
    const log = toUserLog(
      [
        { round_id: "r1", tickets: 3, updated_at: "t1", rounds: { event_id: "e1" } },
        { round_id: "r9", tickets: 1, updated_at: "t2", rounds: null },
      ],
      [{ event_id: "e1", note: "hi" }],
      [{ member_id: "m1" }],
    );
    expect(log).toEqual({
      entries: [{ eventId: "e1", roundId: "r1", tickets: 3, updatedAt: "t1" }],
      notes: { e1: "hi" },
      oshi: ["m1"],
    });
  });
});

describe("mergeWrites", () => {
  const e = (roundId: string, tickets: number) => ({ eventId: "e1", roundId, tickets, updatedAt: "t" });
  const device: UserLog = { entries: [e("r1", 2), e("r2", 4)], notes: { e1: "device" }, oshi: ["m1", "m2"] };
  const account: UserLog = { entries: [e("r2", 1)], notes: { e1: "account" }, oshi: ["m1"] };

  it("writes inserts, chosen conflicts and new oshi with set semantics", () => {
    const plan = planMerge(device, account);
    const keepDevice = Object.fromEntries(plan.conflicts.map((c) => [conflictKey(c), "incoming" as const]));
    expect(mergeWrites(plan, keepDevice, "u1")).toEqual({
      entries: [
        { user_id: "u1", round_id: "r1", tickets: 2 },
        { user_id: "u1", round_id: "r2", tickets: 4 },
      ],
      notes: [{ user_id: "u1", event_id: "e1", note: "device" }],
      oshi: [{ user_id: "u1", member_id: "m2" }],
    });
  });

  it("writes nothing for conflicts where the account wins", () => {
    const plan = planMerge(device, account);
    const keepAccount = Object.fromEntries(plan.conflicts.map((c) => [conflictKey(c), "existing" as const]));
    const writes = mergeWrites(plan, keepAccount, "u1");
    expect(writes.entries).toEqual([{ user_id: "u1", round_id: "r1", tickets: 2 }]);
    expect(writes.notes).toEqual([]);
  });

  it("refuses unresolved conflicts", () => {
    expect(() => mergeWrites(planMerge(device, account), {}, "u1")).toThrow(/resolved/);
  });
});
