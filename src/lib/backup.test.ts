import { describe, expect, it } from "vitest";
import { exportCsv, exportJson, parseBackup } from "./backup";
import { emptyGuestStore } from "./guestStore";
import { buildCatalog } from "./stats";

const catalog = buildCatalog(
  [
    {
      id: "e1",
      name: 'Big, "Fun" Day',
      date: "2026-08-16",
      city: "Bangkok",
      scope: "BNK48",
      rounds: [{ id: "r1", position: 1, memberIds: ["fah", "mint"] }],
    },
  ],
  [
    { id: "fah", slug: "fah", nickname: "Fah", group: "BNK48", status: "active" },
    { id: "mint", slug: "mint", nickname: "Mint", group: "BNK48", status: "active" },
  ],
);

const store = {
  ...emptyGuestStore(),
  entries: [{ eventId: "e1", roundId: "r1", tickets: 3, updatedAt: "2026-08-16T12:00:00.000Z" }],
  notes: { e1: "=cmd" },
  oshi: ["fah"],
  cache: { fetchedAt: "x", events: [], members: [] },
};

describe("JSON backup", () => {
  it("round-trips without the public-data cache", () => {
    const text = exportJson(store);
    expect(text).not.toContain("cache");
    const parsed = parseBackup(text);
    expect(parsed).toEqual({ ok: true, store: { ...store, cache: undefined } });
  });

  it("rejects bad files", () => {
    expect(parseBackup("nope")).toEqual({ ok: false, error: "json" });
    expect(parseBackup('{"version":1,"entries":"x"}')).toEqual({ ok: false, error: "format" });
  });
});

describe("CSV export", () => {
  it("quotes cells and neutralises formulas", () => {
    const csv = exportCsv(store.entries, store.notes, catalog);
    const [header, row] = csv.trim().split("\r\n");
    expect(header).toBe("event_date,event,city,round,tickets,lineup,note,event_id,round_id");
    expect(row).toBe('2026-08-16,"Big, ""Fun"" Day",Bangkok,Round 1,3,Fah / Mint,\'=cmd,e1,r1');
  });
});
