// Validation for admin writes. Shared by the forms (instant feedback) and the
// server actions (the real check). Pure: no I/O.

import { z } from "zod";
import { t } from "../strings";

const e = t.admin.errors;

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** "Fah Sai" → "fah-sai". Returns "" for names with no Latin letters or digits (e.g. Thai only). */
export function slugify(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const text = (max: number) => z.string().trim().max(max, e.tooLong);

/** Optional https link; "" means none. */
const httpsUrl = z
  .string()
  .trim()
  .max(500, e.tooLong)
  .refine((v) => v === "" || (/^https:\/\/\S+$/.test(v) && URL.canParse(v)), e.url);

export const eventInputSchema = z
  .object({
    id: z.guid().nullable(),
    name: z.string().trim().min(1, e.name).max(120, e.tooLong),
    date: z.iso.date(e.date),
    venue: text(120),
    city: text(80),
    scope: z.enum(["BNK48", "CGM48", "JOINT"]),
    status: z.enum(["draft", "published"]),
    rounds: z
      .array(
        z.object({
          id: z.guid().nullable(),
          label: text(60),
          memberIds: z.array(z.guid()).max(100),
        }),
      )
      .max(50),
  })
  .refine((v) => v.status === "draft" || v.rounds.length > 0, { message: e.needsRound, path: ["rounds"] });

export type EventInput = z.input<typeof eventInputSchema>;

export const memberInputSchema = z.object({
  id: z.guid().nullable(),
  nickname: z.string().trim().min(1, e.nickname).max(40, e.tooLong),
  slug: z.string().trim().max(60, e.tooLong).regex(SLUG_PATTERN, e.slug),
  group: z.enum(["BNK48", "CGM48"]),
  fullNameTh: text(120),
  profileUrl: httpsUrl,
  photoUrl: httpsUrl,
  photoCredit: text(120),
  status: z.enum(["active", "graduated"]),
});

export type MemberInput = z.input<typeof memberInputSchema>;

/** First validation message, for showing next to the save button. */
export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? e.invalid;
}
