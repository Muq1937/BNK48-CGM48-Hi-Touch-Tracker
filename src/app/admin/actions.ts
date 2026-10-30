"use server";

// Admin mutations. Each action re-checks the role (never trusts the page that
// called it), validates with Zod, writes as the signed-in admin so RLS applies,
// then expires the public catalog so the site shows the change straight away.

import { updateTag } from "next/cache";
import { adminClient } from "@/lib/admin/data";
import { eventInputSchema, firstIssue, memberInputSchema } from "@/lib/admin/schema";
import { CATALOG_TAG } from "@/lib/publicData";
import { t } from "@/lib/strings";

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const e = t.admin.errors;
/** Postgres: foreign key still referenced (e.g. a round with log entries). */
const FK_VIOLATION = "23503";
const UNIQUE_VIOLATION = "23505";

export async function saveEvent(input: unknown): Promise<ActionResult<{ id: string }>> {
  const db = await adminClient();
  if (!db) return { ok: false, error: e.notAllowed };
  const parsed = eventInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const v = parsed.data;

  const { data, error } = await db.rpc("save_event", {
    p_event: {
      id: v.id,
      name: v.name,
      event_date: v.date,
      venue: v.venue,
      city: v.city,
      scope: v.scope,
      status: v.status,
      rounds: v.rounds.map((r) => ({ id: r.id, label: r.label, member_ids: r.memberIds })),
    },
  });
  if (error) return { ok: false, error: error.code === FK_VIOLATION ? e.roundHasLogs : e.saveFailed };

  updateTag(CATALOG_TAG);
  return { ok: true, data: { id: data } };
}

export async function deleteEvent(id: string): Promise<ActionResult> {
  const db = await adminClient();
  if (!db) return { ok: false, error: e.notAllowed };

  const { error, count } = await db.from("events").delete({ count: "exact" }).eq("id", id);
  if (error) return { ok: false, error: error.code === FK_VIOLATION ? e.eventHasLogs : e.saveFailed };
  if (count === 0) return { ok: false, error: e.saveFailed };

  updateTag(CATALOG_TAG);
  return { ok: true, data: undefined };
}

export async function saveMember(input: unknown): Promise<ActionResult<{ id: string }>> {
  const db = await adminClient();
  if (!db) return { ok: false, error: e.notAllowed };
  const parsed = memberInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const v = parsed.data;

  const row = {
    slug: v.slug,
    nickname: v.nickname,
    group_code: v.group,
    full_name_th: v.fullNameTh || null,
    profile_url: v.profileUrl || null,
    photo_url: v.photoUrl || null,
    photo_credit: v.photoCredit || null,
    status: v.status,
  };
  const { data, error } = v.id
    ? await db.from("members").update(row).eq("id", v.id).select("id").single()
    : await db.from("members").insert(row).select("id").single();
  if (error) return { ok: false, error: error.code === UNIQUE_VIOLATION ? e.slugTaken : e.saveFailed };

  updateTag(CATALOG_TAG);
  return { ok: true, data: { id: data.id } };
}

export async function deleteMember(id: string): Promise<ActionResult> {
  const db = await adminClient();
  if (!db) return { ok: false, error: e.notAllowed };

  const { error, count } = await db.from("members").delete({ count: "exact" }).eq("id", id);
  if (error) return { ok: false, error: error.code === FK_VIOLATION ? e.memberInLineup : e.saveFailed };
  if (count === 0) return { ok: false, error: e.saveFailed };

  updateTag(CATALOG_TAG);
  return { ok: true, data: undefined };
}
