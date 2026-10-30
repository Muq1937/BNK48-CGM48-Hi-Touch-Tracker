"use client";

import { Pencil, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { deleteMember, saveMember } from "@/app/admin/actions";
import { GroupPill } from "@/components/ui";
import { firstIssue, memberInputSchema, slugify, type MemberInput } from "@/lib/admin/schema";
import { t } from "@/lib/strings";
import { GROUPS, type PublicMember } from "@/lib/types";
import { useFlash } from "./AdminChrome";

const r = t.admin.roster;
const input =
  "mt-1 min-h-11 w-full rounded-[10px] border border-line-strong bg-surface px-3 text-[15px] placeholder:text-muted";
const label = "text-xs font-bold tracking-wide text-muted uppercase";

/** Add, edit, graduate or delete members (handoff M3 roster management). */
export function RosterManager({
  members,
  lineupCounts,
}: {
  members: PublicMember[];
  /** Rounds each member is in, across all events. */
  lineupCounts: Record<string, number>;
}) {
  const [editing, setEditing] = useState<PublicMember | "new" | null>(null);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
      <section aria-labelledby="roster-title" className="rounded-card border border-line bg-surface p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 id="roster-title" className="text-lg font-extrabold tracking-tight">
            {r.title}
          </h2>
          <button
            type="button"
            onClick={() => setEditing("new")}
            className="inline-flex min-h-11 items-center gap-1 rounded-[10px] bg-ink px-3 text-sm font-bold text-white"
          >
            <Plus size={16} aria-hidden="true" />
            {r.addMember}
          </button>
        </div>
        {members.length === 0 && <p className="mt-3 text-sm text-muted">{r.empty}</p>}
        {GROUPS.map((group) => {
          const list = members.filter((m) => m.group === group);
          if (list.length === 0) return null;
          return (
            <div key={group} className="mt-4">
              <h3>
                <GroupPill group={group} />
              </h3>
              <ul className="mt-2 divide-y divide-track">
                {list.map((m) => (
                  <li key={m.id} className="flex items-center gap-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold">
                        {m.nickname}
                        {m.status === "graduated" && (
                          <span className="ml-2 rounded-full bg-track px-2 py-0.5 text-[11px] font-bold text-body-2">
                            {r.graduated}
                          </span>
                        )}
                      </p>
                      <p className="truncate text-xs text-muted">
                        {[m.fullNameTh, r.inLineups(lineupCounts[m.id] ?? 0)].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditing(m)}
                      aria-label={r.editLabel(m.nickname)}
                      aria-pressed={editing !== "new" && editing?.id === m.id}
                      className="inline-flex min-h-11 items-center gap-1 rounded-[10px] px-3 text-sm font-bold text-body-2 hover:bg-ground aria-pressed:bg-ground aria-pressed:text-ink"
                    >
                      <Pencil size={14} aria-hidden="true" />
                      {r.edit}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>

      {editing && (
        <MemberForm
          key={editing === "new" ? "new" : editing.id}
          member={editing === "new" ? null : editing}
          lineupCount={editing === "new" ? 0 : (lineupCounts[editing.id] ?? 0)}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function MemberForm({
  member,
  lineupCount,
  onClose,
}: {
  member: PublicMember | null;
  lineupCount: number;
  onClose: () => void;
}) {
  const router = useRouter();
  const flash = useFlash();
  const ids = useId();
  const first = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(!!member);
  const [form, setForm] = useState<MemberInput>({
    id: member?.id ?? null,
    nickname: member?.nickname ?? "",
    slug: member?.slug ?? "",
    group: member?.group ?? "BNK48",
    fullNameTh: member?.fullNameTh ?? "",
    profileUrl: member?.profileUrl ?? "",
    photoUrl: member?.photoUrl ?? "",
    photoCredit: member?.photoCredit ?? "",
    status: member?.status ?? "active",
  });

  useEffect(() => first.current?.focus(), []);

  const set = <K extends keyof MemberInput>(key: K, value: MemberInput[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  function save(e: React.FormEvent) {
    e.preventDefault();
    const check = memberInputSchema.safeParse(form);
    if (!check.success) return setError(firstIssue(check.error));
    setError(null);
    startTransition(async () => {
      const result = await saveMember(form);
      if (!result.ok) return setError(result.error);
      flash(r.saved(check.data.nickname));
      onClose();
      router.refresh();
    });
  }

  function remove() {
    if (!member || !window.confirm(r.deleteConfirm(member.nickname))) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteMember(member.id);
      if (!result.ok) return setError(result.error);
      flash(r.deleted(member.nickname));
      onClose();
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={save}
      aria-labelledby={`${ids}-title`}
      className="grid gap-3 rounded-card border border-line bg-surface p-4 lg:sticky lg:top-4"
    >
      <h2 id={`${ids}-title`} className="text-lg font-extrabold tracking-tight">
        {member ? r.editLabel(member.nickname) : r.newMember}
      </h2>
      <div>
        <label htmlFor={`${ids}-nick`} className={label}>
          {r.nickname}
        </label>
        <input
          ref={first}
          id={`${ids}-nick`}
          value={form.nickname}
          onChange={(e) => {
            set("nickname", e.target.value);
            if (!slugTouched) set("slug", slugify(e.target.value));
          }}
          maxLength={40}
          required
          className={input}
        />
      </div>
      <div>
        <label htmlFor={`${ids}-slug`} className={label}>
          {r.slug}
        </label>
        <input
          id={`${ids}-slug`}
          value={form.slug}
          onChange={(e) => {
            setSlugTouched(true);
            set("slug", e.target.value.toLowerCase());
          }}
          aria-describedby={`${ids}-slug-hint`}
          maxLength={60}
          required
          className={input}
        />
        <p id={`${ids}-slug-hint`} className="mt-1 text-xs text-muted">
          {r.slugHint(form.slug)}
        </p>
      </div>
      <fieldset>
        <legend className={label}>{r.group}</legend>
        <div className="mt-1 grid grid-cols-2 gap-1 rounded-[12px] bg-ground p-1">
          {GROUPS.map((g) => (
            <label
              key={g}
              className="flex min-h-10 cursor-pointer items-center justify-center rounded-[10px] text-sm font-bold text-body-2 has-checked:bg-ink has-checked:text-white has-focus-visible:ring-2 has-focus-visible:ring-ink"
            >
              <input
                type="radio"
                name={`${ids}-group`}
                value={g}
                checked={form.group === g}
                onChange={() => set("group", g)}
                className="sr-only"
              />
              {g}
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor={`${ids}-th`} className={label}>
          {r.fullNameTh}
        </label>
        <input
          id={`${ids}-th`}
          lang="th"
          value={form.fullNameTh}
          onChange={(e) => set("fullNameTh", e.target.value)}
          maxLength={120}
          className={input}
        />
      </div>
      <div>
        <label htmlFor={`${ids}-profile`} className={label}>
          {r.profileUrl}
        </label>
        <input
          id={`${ids}-profile`}
          type="url"
          inputMode="url"
          value={form.profileUrl}
          onChange={(e) => set("profileUrl", e.target.value)}
          placeholder="https://"
          className={input}
        />
      </div>
      <div>
        <label htmlFor={`${ids}-photo`} className={label}>
          {r.photoUrl}
        </label>
        <input
          id={`${ids}-photo`}
          type="url"
          inputMode="url"
          value={form.photoUrl}
          onChange={(e) => set("photoUrl", e.target.value)}
          placeholder="https://"
          aria-describedby={`${ids}-photo-hint`}
          className={input}
        />
        <p id={`${ids}-photo-hint`} className="mt-1 text-xs text-muted">
          {r.photoHint}
        </p>
      </div>
      <div>
        <label htmlFor={`${ids}-credit`} className={label}>
          {r.photoCredit}
        </label>
        <input
          id={`${ids}-credit`}
          value={form.photoCredit}
          onChange={(e) => set("photoCredit", e.target.value)}
          maxLength={120}
          className={input}
        />
      </div>
      <fieldset>
        <legend className={label}>{r.status}</legend>
        <div className="mt-1 grid grid-cols-2 gap-1 rounded-[12px] bg-ground p-1">
          {(["active", "graduated"] as const).map((s) => (
            <label
              key={s}
              className="flex min-h-10 cursor-pointer items-center justify-center rounded-[10px] text-sm font-bold text-body-2 has-checked:bg-ink has-checked:text-white has-focus-visible:ring-2 has-focus-visible:ring-ink"
            >
              <input
                type="radio"
                name={`${ids}-status`}
                value={s}
                checked={form.status === s}
                onChange={() => set("status", s)}
                className="sr-only"
              />
              {s === "active" ? r.active : r.graduated}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 rounded-[10px] bg-ink px-4 text-sm font-bold text-white disabled:opacity-40"
        >
          {r.save}
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={pending}
          className="min-h-11 rounded-[10px] border border-line-strong px-4 text-sm font-bold"
        >
          {r.cancel}
        </button>
        {member && lineupCount === 0 && (
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            className="ml-auto min-h-11 rounded-[10px] px-3 text-sm font-bold text-[#B42318] hover:underline"
          >
            {r.delete}
          </button>
        )}
      </div>
      {member && lineupCount > 0 && <p className="text-xs text-muted">{t.admin.errors.memberInLineup}</p>}
      {error && (
        <p role="alert" className="text-sm text-[#B42318]">
          {error}
        </p>
      )}
    </form>
  );
}
