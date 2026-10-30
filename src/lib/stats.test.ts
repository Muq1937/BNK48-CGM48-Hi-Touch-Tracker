import { describe, expect, it } from "vitest";
import {
  buildCatalog,
  memberHistory,
  memberStandings,
  monthlyCounts,
  previewSelection,
  sessions,
  summarize,
  timesMet,
} from "./stats";
import type { LogEntry, PublicEvent, PublicMember, UserLog } from "./types";

const member = (id: string, group: "BNK48" | "CGM48" = "BNK48"): PublicMember => ({
  id,
  slug: id,
  nickname: id[0].toUpperCase() + id.slice(1),
  group,
  status: "active",
});

const members = [member("fah"), member("mint"), member("ploy"), member("bow", "CGM48")];

const events: PublicEvent[] = [
  {
    id: "e1",
    name: "August",
    date: "2026-08-16",
    city: "Bangkok",
    scope: "BNK48",
    rounds: [
      { id: "e1r1", position: 1, memberIds: ["fah", "mint"] },
      { id: "e1r2", position: 2, memberIds: ["ploy"] },
    ],
  },
  {
    id: "e2",
    name: "October",
    date: "2026-10-18",
    city: "Bangkok",
    scope: "JOINT",
    rounds: [
      { id: "e2r1", position: 1, memberIds: ["fah", "bow", "fah"] }, // duplicate on purpose
      { id: "e2r2", position: 2, memberIds: ["mint", "ghost"] }, // unknown member
    ],
  },
];

const catalog = buildCatalog(events, members);
const at = "2026-10-20T00:00:00.000Z";
const entry = (eventId: string, roundId: string, tickets: number): LogEntry => ({
  eventId,
  roundId,
  tickets,
  updatedAt: at,
});

const entries = [entry("e1", "e1r1", 3), entry("e1", "e1r2", 1), entry("e2", "e2r1", 2)];

describe("timesMet", () => {
  it("counts every member in a round once per ticket", () => {
    const counts = timesMet(entries, catalog);
    expect(counts.get("fah")).toBe(5);
    expect(counts.get("mint")).toBe(3);
    expect(counts.get("ploy")).toBe(1);
    expect(counts.get("bow")).toBe(2);
  });

  it("ignores entries for rounds no longer in the catalog", () => {
    const counts = timesMet([...entries, entry("gone", "gone-r1", 9)], catalog);
    expect(counts.get("fah")).toBe(5);
  });

  it("follows the current lineup, so a lineup fix changes counts", () => {
    const fixed = buildCatalog(
      [{ ...events[0], rounds: [{ id: "e1r1", position: 1, memberIds: ["ploy"] }, events[0].rounds[1]] }],
      members,
    );
    const counts = timesMet([entry("e1", "e1r1", 3)], fixed);
    expect(counts.get("fah")).toBeUndefined();
    expect(counts.get("ploy")).toBe(3);
  });
});

describe("summarize", () => {
  it("derives the dashboard numbers", () => {
    const s = summarize(entries, catalog);
    expect(s.ticketsUsed).toBe(6);
    // 3×2 + 1×1 + 2×2 (duplicate member counted once)
    expect(s.memberMeetings).toBe(11);
    expect(s.meetingsByGroup).toEqual({ BNK48: 9, CGM48: 2 });
    expect(s.eventsAttended).toBe(2);
    expect(s.membersMet).toBe(4);
    expect(s.rosterSize).toBe(4);
    expect(s.mostMet?.member.id).toBe("fah");
    expect(s.mostMet?.timesMet).toBe(5);
  });

  it("is all zeros for an empty log", () => {
    const s = summarize([], catalog);
    expect(s).toMatchObject({
      ticketsUsed: 0,
      memberMeetings: 0,
      eventsAttended: 0,
      membersMet: 0,
      mostMet: null,
    });
  });

  it("skips unknown lineup members in member meetings", () => {
    expect(summarize([entry("e2", "e2r2", 4)], catalog).memberMeetings).toBe(4);
  });
});

describe("memberStandings", () => {
  it("sorts by count, then nickname, with competition ranks", () => {
    const rows = memberStandings([entry("e1", "e1r1", 2), entry("e1", "e1r2", 2)], catalog);
    expect(rows.map((r) => [r.member.id, r.timesMet, r.rank])).toEqual([
      ["fah", 2, 1],
      ["mint", 2, 1],
      ["ploy", 2, 1],
      ["bow", 0, null],
    ]);
  });

  it("records the latest date met", () => {
    const fah = memberStandings(entries, catalog).find((r) => r.member.id === "fah");
    expect(fah?.lastMet).toBe("2026-10-18");
    const ploy = memberStandings(entries, catalog).find((r) => r.member.id === "ploy");
    expect(ploy?.lastMet).toBe("2026-08-16");
  });
});

describe("sessions", () => {
  it("groups entries by event, newest first, with member chips", () => {
    const log: UserLog = { entries, notes: { e1: "front row" }, oshi: [] };
    const [oct, aug] = sessions(log, catalog);
    expect(oct.event.id).toBe("e2");
    expect(aug.tickets).toBe(4);
    expect(aug.note).toBe("front row");
    expect(aug.rounds.map((r) => [r.round.id, r.tickets])).toEqual([
      ["e1r1", 3],
      ["e1r2", 1],
    ]);
    expect(aug.members.map((c) => [c.member.id, c.times])).toEqual([
      ["fah", 3],
      ["mint", 3],
      ["ploy", 1],
    ]);
  });
});

describe("memberHistory", () => {
  it("lists every round with the member and who else was there", () => {
    const h = memberHistory("fah", { entries, notes: {}, oshi: [] }, catalog)!;
    expect(h.timesMet).toBe(5);
    expect(h.events).toBe(2);
    expect(h.rank).toBe(1);
    expect(h.rounds.map((r) => [r.round.id, r.tickets, r.others.map((o) => o.id)])).toEqual([
      ["e2r1", 2, ["bow"]],
      ["e1r1", 3, ["mint"]],
    ]);
  });

  it("returns null for an unknown member", () => {
    expect(memberHistory("nobody", { entries, notes: {}, oshi: [] }, catalog)).toBeNull();
  });
});

describe("monthlyCounts", () => {
  it("buckets the last N months ending with the current month", () => {
    const months = monthlyCounts("fah", entries, catalog, { months: 5, now: new Date(2026, 9, 30) });
    expect(months).toEqual([
      { month: "2026-06", count: 0 },
      { month: "2026-07", count: 0 },
      { month: "2026-08", count: 3 },
      { month: "2026-09", count: 0 },
      { month: "2026-10", count: 2 },
    ]);
  });

  it("crosses year boundaries", () => {
    const months = monthlyCounts("fah", [], catalog, { months: 3, now: new Date(2027, 0, 5) });
    expect(months.map((m) => m.month)).toEqual(["2026-11", "2026-12", "2027-01"]);
  });
});

describe("previewSelection", () => {
  it("previews tickets, meetings and distinct members", () => {
    expect(
      previewSelection(
        [
          { roundId: "e1r1", tickets: 3 },
          { roundId: "e1r2", tickets: 2 },
          { roundId: "e2r1", tickets: 0 },
        ],
        catalog,
      ),
    ).toEqual({ tickets: 5, meetings: 8, members: 3 });
  });
});
