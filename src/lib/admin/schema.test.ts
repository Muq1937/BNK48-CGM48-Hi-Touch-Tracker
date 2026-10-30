import { describe, expect, it } from "vitest";
import { t } from "../strings";
import { eventInputSchema, firstIssue, memberInputSchema, slugify, type EventInput } from "./schema";

const uuid = (n: number) => `5a000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

const event: EventInput = {
  id: null,
  name: "  BNK48 Hi-Touch  ",
  date: "2026-11-15",
  venue: "",
  city: "Bangkok",
  scope: "BNK48",
  status: "draft",
  rounds: [],
};

describe("slugify", () => {
  it("makes lowercase dashed slugs", () => {
    expect(slugify("Fah")).toBe("fah");
    expect(slugify("Fah Sai")).toBe("fah-sai");
    expect(slugify("  Pim--Mint!! ")).toBe("pim-mint");
    expect(slugify("Café")).toBe("cafe");
  });

  it("returns empty for names without Latin letters", () => {
    expect(slugify("ฟ้า")).toBe("");
  });
});

describe("eventInputSchema", () => {
  it("trims text and allows a draft with no rounds", () => {
    const parsed = eventInputSchema.parse(event);
    expect(parsed.name).toBe("BNK48 Hi-Touch");
  });

  it("needs at least one round to publish", () => {
    const result = eventInputSchema.safeParse({ ...event, status: "published" });
    expect(result.success).toBe(false);
    expect(firstIssue(result.error!)).toBe(t.admin.errors.needsRound);

    const ok = eventInputSchema.safeParse({
      ...event,
      status: "published",
      rounds: [{ id: null, label: "", memberIds: [uuid(1)] }],
    });
    expect(ok.success).toBe(true);
  });

  it("rejects a missing name, a bad date and bad ids", () => {
    expect(firstIssue(eventInputSchema.safeParse({ ...event, name: "  " }).error!)).toBe(t.admin.errors.name);
    expect(firstIssue(eventInputSchema.safeParse({ ...event, date: "15/11/2026" }).error!)).toBe(
      t.admin.errors.date,
    );
    expect(
      eventInputSchema.safeParse({ ...event, rounds: [{ id: "nope", label: "", memberIds: [] }] }).success,
    ).toBe(false);
  });
});

describe("memberInputSchema", () => {
  const member = {
    id: null,
    nickname: "Fah",
    slug: "fah",
    group: "BNK48" as const,
    fullNameTh: "",
    profileUrl: "",
    photoUrl: "",
    photoCredit: "",
    status: "active" as const,
  };

  it("accepts a minimal member", () => {
    expect(memberInputSchema.safeParse(member).success).toBe(true);
  });

  it("only allows https links", () => {
    const http = memberInputSchema.safeParse({ ...member, profileUrl: "http://bnk48.com/fah" });
    expect(firstIssue(http.error!)).toBe(t.admin.errors.url);
    expect(memberInputSchema.safeParse({ ...member, photoUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(
      memberInputSchema.safeParse({ ...member, profileUrl: "https://bnk48.com/members/fah" }).success,
    ).toBe(true);
  });

  it("checks the slug format", () => {
    expect(firstIssue(memberInputSchema.safeParse({ ...member, slug: "Fah Sai" }).error!)).toBe(
      t.admin.errors.slug,
    );
    expect(memberInputSchema.safeParse({ ...member, slug: "fah-sai" }).success).toBe(true);
  });
});
