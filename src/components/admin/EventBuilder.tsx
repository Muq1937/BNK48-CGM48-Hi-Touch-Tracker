"use client";

import { Plus, Search, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, useTransition } from "react";
import { deleteEvent, saveEvent } from "@/app/admin/actions";
import { GroupPill } from "@/components/ui";
import type { AdminEvent } from "@/lib/admin/data";
import { eventInputSchema, firstIssue, type EventInput } from "@/lib/admin/schema";
import { groupClasses } from "@/lib/groups";
import { t } from "@/lib/strings";
import { GROUPS, roundLabel, type EventScope, type PublicMember } from "@/lib/types";
import { useFlash } from "./AdminChrome";

const b = t.admin.builder;

interface RoundDraft {
  /** Stable React key; equals `id` for saved rounds. */
  key: string;
  id: string | null;
  label: string;
  memberIds: string[];
}

const SCOPES: { value: EventScope; label: string }[] = [
  { value: "BNK48", label: "BNK48" },
  { value: "CGM48", label: "CGM48" },
  { value: "JOINT", label: b.joint },
];

const input =
  "mt-1 min-h-11 w-full rounded-[10px] border border-line-strong bg-surface px-3 text-[15px] placeholder:text-muted";
const label = "text-xs font-bold tracking-wide text-muted uppercase";

/** Create or edit an event: details, rounds and each round's lineup (handoff §3.5). */
export function EventBuilder({ event, members }: { event: AdminEvent | null; members: PublicMember[] }) {
  const router = useRouter();
  const flash = useFlash();
  const ids = useId();
  const nextKey = useRef(0);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(event?.name ?? "");
  const [date, setDate] = useState(event?.date ?? "");
  const [venue, setVenue] = useState(event?.venue ?? "");
  const [city, setCity] = useState(event?.city ?? "");
  const [scope, setScope] = useState<EventScope>(event?.scope ?? "BNK48");
  const [rounds, setRounds] = useState<RoundDraft[]>(() =>
    (event?.rounds ?? []).map((r) => ({ key: r.id, id: r.id, label: r.label ?? "", memberIds: r.memberIds })),
  );
  const [selectedKey, setSelectedKey] = useState<string | null>(() => event?.rounds[0]?.id ?? null);
  const [query, setQuery] = useState("");

  const status = event?.status ?? "draft";
  const memberById = new Map(members.map((m) => [m.id, m]));
  const selectedIndex = rounds.findIndex((r) => r.key === selectedKey);
  const selected = selectedIndex >= 0 ? rounds[selectedIndex] : null;
  const nameOf = (r: RoundDraft, index: number) => roundLabel({ position: index + 1, label: r.label });

  function addRound() {
    const key = `new-${nextKey.current++}`;
    setRounds((prev) => [...prev, { key, id: null, label: "", memberIds: [] }]);
    setSelectedKey(key);
  }

  function removeRound(key: string) {
    const index = rounds.findIndex((r) => r.key === key);
    const next = rounds.filter((r) => r.key !== key);
    setRounds(next);
    if (key === selectedKey) setSelectedKey(next[Math.min(index, next.length - 1)]?.key ?? null);
  }

  function updateRound(key: string, change: (r: RoundDraft) => RoundDraft) {
    setRounds((prev) => prev.map((r) => (r.key === key ? change(r) : r)));
  }

  function toggleMember(memberId: string) {
    if (!selected) return;
    updateRound(selected.key, (r) => ({
      ...r,
      memberIds: r.memberIds.includes(memberId)
        ? r.memberIds.filter((id) => id !== memberId)
        : [...r.memberIds, memberId],
    }));
  }

  /** True when a round fans already logged now has a different lineup. */
  function loggedLineupChanged(): boolean {
    if (!event) return false;
    return event.rounds.some((original) => {
      if (!event.roundFans[original.id]) return false;
      const now = rounds.find((r) => r.id === original.id);
      if (!now) return false;
      const a = [...original.memberIds].sort().join();
      const c = [...now.memberIds].sort().join();
      return a !== c;
    });
  }

  function submit(nextStatus: "draft" | "published", confirmText?: string) {
    const data: EventInput = {
      id: event?.id ?? null,
      name,
      date,
      venue,
      city,
      scope,
      status: nextStatus,
      rounds: rounds.map((r) => ({ id: r.id, label: r.label, memberIds: r.memberIds })),
    };
    const check = eventInputSchema.safeParse(data);
    if (!check.success) return setError(firstIssue(check.error));
    if (event && loggedLineupChanged() && !window.confirm(b.lineupChangeConfirm(event.fans))) return;
    if (confirmText && !window.confirm(confirmText)) return;

    setError(null);
    startTransition(async () => {
      const result = await saveEvent(data);
      if (!result.ok) return setError(result.error);
      flash(nextStatus === "published" && status !== "published" ? b.publishedNow : b.saved);
      if (event) router.refresh();
      else router.replace(`/admin/events/${result.data.id}`);
    });
  }

  function remove() {
    if (!event || !window.confirm(b.deleteConfirm(event.name))) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteEvent(event.id);
      if (!result.ok) return setError(result.error);
      flash(b.deleted);
      router.replace("/admin");
    });
  }

  // Roster for this event's scope. Graduated members only show if already in a lineup here.
  const inEvent = new Set(rounds.flatMap((r) => r.memberIds));
  const q = query.trim().toLowerCase();
  const roster = members.filter(
    (m) =>
      (scope === "JOINT" || m.group === scope) &&
      (m.status === "active" || inEvent.has(m.id)) &&
      (!q || m.nickname.toLowerCase().includes(q) || m.fullNameTh?.toLowerCase().includes(q)),
  );
  const roundsIn = (memberId: string) => rounds.filter((r) => r.memberIds.includes(memberId)).length;

  return (
    <section aria-labelledby={`${ids}-title`} className="grid gap-5">
      <h2 id={`${ids}-title`} className="text-lg font-extrabold tracking-tight">
        {event ? b.editTitle : b.newTitle}
      </h2>

      {/* Details */}
      <div className="grid gap-3 rounded-card border border-line bg-surface p-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor={`${ids}-name`} className={label}>
            {b.name}
          </label>
          <input
            id={`${ids}-name`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            required
            className={input}
          />
        </div>
        <div>
          <label htmlFor={`${ids}-date`} className={label}>
            {b.date}
          </label>
          <input
            id={`${ids}-date`}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className={input}
          />
        </div>
        <fieldset>
          <legend className={label}>{b.scope}</legend>
          <div className="mt-1 grid grid-cols-3 gap-1 rounded-[12px] bg-ground p-1">
            {SCOPES.map((s) => (
              <label
                key={s.value}
                className="flex min-h-10 cursor-pointer items-center justify-center rounded-[10px] text-sm font-bold text-body-2 has-checked:bg-ink has-checked:text-white has-focus-visible:ring-2 has-focus-visible:ring-ink"
              >
                <input
                  type="radio"
                  name={`${ids}-scope`}
                  value={s.value}
                  checked={scope === s.value}
                  onChange={() => setScope(s.value)}
                  className="sr-only"
                />
                {s.label}
              </label>
            ))}
          </div>
        </fieldset>
        <div>
          <label htmlFor={`${ids}-venue`} className={label}>
            {b.venue}
          </label>
          <input
            id={`${ids}-venue`}
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            maxLength={120}
            className={input}
          />
        </div>
        <div>
          <label htmlFor={`${ids}-city`} className={label}>
            {b.city}
          </label>
          <input
            id={`${ids}-city`}
            value={city}
            onChange={(e) => setCity(e.target.value)}
            maxLength={80}
            className={input}
          />
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2 md:items-start">
        {/* Rounds */}
        <section aria-labelledby={`${ids}-rounds`} className="rounded-card border border-line bg-surface p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 id={`${ids}-rounds`} className="font-extrabold">
              {b.rounds}
            </h3>
            <button
              type="button"
              onClick={addRound}
              className="inline-flex min-h-11 items-center gap-1 rounded-[10px] border border-line-strong px-3 text-sm font-bold"
            >
              <Plus size={16} aria-hidden="true" />
              {b.addRound}
            </button>
          </div>
          {rounds.length === 0 ? (
            <p className="mt-3 rounded-xl border border-dashed border-line-strong p-4 text-center text-sm text-muted">
              {b.noRounds}
            </p>
          ) : (
            <ol className="mt-3 grid gap-2">
              {rounds.map((round, index) => {
                const title = nameOf(round, index);
                const fans = round.id ? (event?.roundFans[round.id] ?? 0) : 0;
                const isSelected = round.key === selectedKey;
                return (
                  <li
                    key={round.key}
                    className={`rounded-xl border p-3 ${isSelected ? "border-ink bg-ground ring-1 ring-ink" : "border-line"}`}
                  >
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedKey(round.key)}
                        aria-pressed={isSelected}
                        aria-label={b.selectRound(title)}
                        className="min-h-11 flex-1 rounded-[10px] px-1 text-left text-sm font-bold"
                      >
                        {title}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeRound(round.key)}
                        disabled={fans > 0}
                        aria-label={b.deleteRound(title)}
                        title={fans > 0 ? b.roundLocked(fans) : undefined}
                        className="flex h-11 w-11 items-center justify-center rounded-[10px] text-body-2 hover:bg-surface disabled:opacity-35"
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </div>
                    {fans > 0 && <p className="mt-1 text-xs text-muted">{b.roundLocked(fans)}</p>}
                    <label className="mt-2 block">
                      <span className="sr-only">{b.roundLabel(title)}</span>
                      <input
                        value={round.label}
                        onChange={(e) => updateRound(round.key, (r) => ({ ...r, label: e.target.value }))}
                        placeholder={roundLabel({ position: index + 1 })}
                        maxLength={60}
                        className="min-h-10 w-full rounded-[10px] border border-line-strong bg-surface px-3 text-sm placeholder:text-muted"
                      />
                    </label>
                    {round.memberIds.length === 0 ? (
                      <p className="mt-2 text-xs text-muted">{b.emptyLineup}</p>
                    ) : (
                      <ul className="mt-2 flex flex-wrap gap-1.5">
                        {round.memberIds.map((id) => {
                          const m = memberById.get(id);
                          if (!m) return null;
                          const c = groupClasses[m.group];
                          return (
                            <li
                              key={id}
                              className={`inline-flex items-center rounded-full pl-2.5 text-xs font-semibold ${c.tint} ${c.text}`}
                            >
                              {m.nickname}
                              <button
                                type="button"
                                onClick={() =>
                                  updateRound(round.key, (r) => ({
                                    ...r,
                                    memberIds: r.memberIds.filter((x) => x !== id),
                                  }))
                                }
                                aria-label={b.removeMember(m.nickname, title)}
                                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/60"
                              >
                                <X size={13} aria-hidden="true" />
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        {/* Roster picker */}
        <section
          aria-labelledby={`${ids}-roster`}
          className="rounded-card border border-line bg-surface p-4 md:sticky md:top-4"
        >
          <h3 id={`${ids}-roster`} className="font-extrabold">
            {selected ? b.addingTo(nameOf(selected, selectedIndex)) : b.roster}
          </h3>
          {!selected && <p className="mt-1 text-sm text-muted">{b.pickRound}</p>}
          <label className="relative mt-3 block">
            <span className="sr-only">{b.search}</span>
            <Search
              size={16}
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={b.search}
              className="min-h-11 w-full rounded-[10px] border border-line-strong bg-surface pr-3 pl-9 text-sm placeholder:text-muted"
            />
          </label>
          {roster.length === 0 ? (
            <p className="mt-3 text-sm text-muted">{b.noMembers}</p>
          ) : (
            GROUPS.filter((g) => scope === "JOINT" || g === scope).map((group) => {
              const list = roster.filter((m) => m.group === group);
              if (list.length === 0) return null;
              return (
                <div key={group} className="mt-4">
                  <h4>
                    <GroupPill group={group} />
                  </h4>
                  <ul className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3">
                    {list.map((m) => {
                      const on = !!selected?.memberIds.includes(m.id);
                      const count = roundsIn(m.id);
                      return (
                        <li key={m.id}>
                          <button
                            type="button"
                            onClick={() => toggleMember(m.id)}
                            disabled={!selected}
                            aria-pressed={on}
                            className="flex min-h-11 w-full flex-col items-start justify-center rounded-[10px] border border-line px-2.5 py-1.5 text-left hover:border-line-strong disabled:opacity-50 aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-white"
                          >
                            <span className="text-sm font-bold">{m.nickname}</span>
                            <span className="text-[11px] opacity-75">
                              {m.status === "graduated" ? b.graduated : count > 0 ? b.inRounds(count) : " "}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })
          )}
        </section>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2 rounded-card border border-line bg-surface p-4">
        {status === "published" ? (
          <>
            <button
              type="button"
              onClick={() => submit("published")}
              disabled={pending}
              className="min-h-11 rounded-[10px] bg-ink px-4 text-sm font-bold text-white disabled:opacity-40"
            >
              {pending ? b.saving : b.saveChanges}
            </button>
            <button
              type="button"
              onClick={() => submit("draft", b.unpublishConfirm(event?.fans ?? 0))}
              disabled={pending}
              className="min-h-11 rounded-[10px] border border-line-strong px-4 text-sm font-bold disabled:opacity-40"
            >
              {b.unpublish}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => submit("draft")}
              disabled={pending}
              className="min-h-11 rounded-[10px] border border-line-strong px-4 text-sm font-bold disabled:opacity-40"
            >
              {pending ? b.saving : b.saveDraft}
            </button>
            <button
              type="button"
              onClick={() => submit("published")}
              disabled={pending}
              className="min-h-11 rounded-[10px] bg-admin px-4 text-sm font-bold text-ink disabled:opacity-40"
            >
              {b.publish}
            </button>
          </>
        )}
        {event && event.fans === 0 && (
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            className="min-h-11 rounded-[10px] px-3 text-sm font-bold text-[#B42318] hover:underline disabled:opacity-40 sm:ml-auto"
          >
            {b.delete}
          </button>
        )}
        {error && (
          <p role="alert" className="w-full text-sm text-[#B42318]">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
