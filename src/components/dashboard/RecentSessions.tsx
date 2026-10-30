"use client";

import { Pencil } from "lucide-react";
import { useId, useRef, useState } from "react";
import { useLog } from "@/components/LogProvider";
import { groupClasses } from "@/lib/groups";
import { StorageFullError } from "@/lib/repository";
import { lineupOf, type Session } from "@/lib/stats";
import { formatDate, t } from "@/lib/strings";
import { roundLabel } from "@/lib/types";
import { MAX_TICKETS, Stepper } from "./Stepper";

export function RecentSessions({ sessions }: { sessions: Session[] }) {
  // Lives above the rows so "removed" is still announced after its row is gone.
  const [announcement, setAnnouncement] = useState("");
  return (
    <section id="history" aria-labelledby="history-title" className="scroll-mt-4">
      <h2 id="history-title" className="text-lg font-extrabold tracking-tight">
        {t.sessions.title}
      </h2>
      <p role="status" className="sr-only">
        {announcement}
      </p>
      {sessions.length === 0 ? (
        <p className="mt-4 rounded-card border border-dashed border-line-strong p-6 text-center text-sm text-muted">
          {t.sessions.empty}
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-track rounded-card border border-line bg-surface">
          {sessions.map((s) => (
            <SessionRow key={s.event.id} session={s} onChanged={setAnnouncement} />
          ))}
        </ul>
      )}
    </section>
  );
}

function SessionRow({ session, onChanged }: { session: Session; onChanged: (message: string) => void }) {
  const [editing, setEditing] = useState(false);
  const editButton = useRef<HTMLButtonElement>(null);
  const editorId = useId();
  const [day, month] = formatDate(session.event.date).split(" ");
  const rounds = session.rounds.map((r) => `${roundLabel(r.round)} ×${r.tickets}`).join(" · ");

  function close(message?: string) {
    setEditing(false);
    if (message) onChanged(message);
    // Return focus to where the user started (the row may be gone after a removal).
    requestAnimationFrame(() => editButton.current?.focus());
  }

  return (
    <li className="flex gap-4 p-4">
      <time
        dateTime={session.event.date}
        className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-ground"
      >
        <span className="text-lg leading-none font-extrabold">{day}</span>
        <span className="text-[11px] font-semibold text-muted uppercase">{month}</span>
      </time>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <h3 className="font-bold">{session.event.name}</h3>
          <span className="flex items-center gap-2">
            <span className="text-sm font-semibold text-body-2">{t.sessions.tickets(session.tickets)}</span>
            <button
              ref={editButton}
              type="button"
              onClick={() => setEditing((v) => !v)}
              aria-expanded={editing}
              aria-controls={editorId}
              aria-label={t.sessions.editLabel(session.event.name)}
              className="inline-flex min-h-11 items-center gap-1 rounded-[10px] px-2 text-sm font-bold text-body-2 hover:bg-ground hover:text-ink"
            >
              <Pencil size={14} aria-hidden="true" />
              {t.sessions.edit}
            </button>
          </span>
        </div>
        <p className="mt-0.5 text-sm text-muted">
          {rounds}
          {session.note && <> — {session.note}</>}
        </p>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {session.members.map(({ member, times }) => {
            const c = groupClasses[member.group];
            return (
              <li
                key={member.id}
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${c.tint} ${c.text}`}
              >
                {t.sessions.chip(member.nickname, times)}
              </li>
            );
          })}
        </ul>
        {editing && <SessionEditor id={editorId} session={session} onClose={close} />}
      </div>
    </li>
  );
}

/** Correct a logged event: exact ticket counts per round (0 removes it), the note, or remove it all. */
function SessionEditor({
  id,
  session,
  onClose,
}: {
  id: string;
  session: Session;
  onClose: (message?: string) => void;
}) {
  const { catalog, log, editEvent } = useLog();
  const event = session.event;
  const eventRounds = [...event.rounds].sort((a, b) => a.position - b.position);
  const [counts, setCounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      eventRounds.map((r) => [r.id, log?.entries.find((e) => e.roundId === r.id)?.tickets ?? 0]),
    ),
  );
  const [note, setNote] = useState(session.note ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const noteId = useId();
  const allZero = eventRounds.every((r) => (counts[r.id] ?? 0) === 0);

  async function apply(next: Record<string, number>, nextNote: string, message: string) {
    setSaving(true);
    setError(null);
    try {
      await editEvent(
        event.id,
        eventRounds.map((r) => ({ roundId: r.id, tickets: next[r.id] ?? 0 })),
        nextNote,
      );
      onClose(message);
    } catch (e) {
      setError(e instanceof StorageFullError ? t.storage.full : t.log.saveFailed);
      setSaving(false);
    }
  }

  function remove() {
    if (!window.confirm(t.sessions.removeConfirm(event.name))) return;
    void apply(Object.fromEntries(eventRounds.map((r) => [r.id, 0])), "", t.sessions.removed(event.name));
  }

  function save() {
    // Saving with every round at 0 is a removal; confirm it the same way.
    if (allZero) return remove();
    void apply(counts, note, t.sessions.saved(event.name));
  }

  return (
    <div id={id} className="mt-3 rounded-xl border border-line-strong bg-ground p-3">
      <p className="text-xs text-body-2">{t.sessions.editHint}</p>
      <ul className="mt-2 grid gap-2">
        {eventRounds.map((round) => {
          const label = roundLabel(round);
          const value = counts[round.id] ?? 0;
          const lineup = lineupOf(round, catalog);
          return (
            <li
              key={round.id}
              className="flex items-center justify-between gap-3 rounded-[10px] bg-surface p-2.5"
            >
              <div className="min-w-0">
                <p className="text-sm font-bold">{label}</p>
                <p className="truncate text-xs text-muted">
                  {lineup.length ? lineup.map((m) => m.nickname).join(", ") : t.log.emptyLineup}
                </p>
              </div>
              <Stepper
                label={label}
                value={value}
                disabled={saving || (lineup.length === 0 && value === 0)}
                onStep={(d) =>
                  setCounts((prev) => ({
                    ...prev,
                    [round.id]: Math.min(MAX_TICKETS, Math.max(0, (prev[round.id] ?? 0) + d)),
                  }))
                }
              />
            </li>
          );
        })}
      </ul>
      <label htmlFor={noteId} className="mt-3 block text-xs font-bold tracking-wide text-muted uppercase">
        {t.sessions.noteLabel}
      </label>
      <textarea
        id={noteId}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={t.log.notePlaceholder}
        rows={2}
        maxLength={500}
        disabled={saving}
        className="mt-1 w-full resize-y rounded-[10px] border border-line-strong bg-surface px-3 py-2 text-sm placeholder:text-muted"
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="min-h-11 rounded-[10px] bg-ink px-4 text-sm font-bold text-white disabled:opacity-40"
        >
          {t.sessions.saveChanges}
        </button>
        <button
          type="button"
          onClick={() => onClose()}
          disabled={saving}
          className="min-h-11 rounded-[10px] border border-line-strong bg-surface px-4 text-sm font-bold"
        >
          {t.sessions.cancel}
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={saving}
          className="ml-auto min-h-11 rounded-[10px] px-3 text-sm font-bold text-[#B42318] underline-offset-2 hover:underline"
        >
          {t.sessions.remove}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-[#B42318]">
          {error}
        </p>
      )}
    </div>
  );
}
