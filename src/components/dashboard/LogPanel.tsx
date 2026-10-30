"use client";

import { Minus, Plus } from "lucide-react";
import { useId, useState } from "react";
import { useLog } from "@/components/LogProvider";
import { GroupPill } from "@/components/ui";
import { groupClasses } from "@/lib/groups";
import { StorageFullError } from "@/lib/repository";
import { lineupOf, previewSelection } from "@/lib/stats";
import { formatDate, t } from "@/lib/strings";
import { roundLabel, type PublicEvent, type UserLog } from "@/lib/types";

const MAX_TICKETS = 999;

export function LogPanel({ log }: { log: UserLog }) {
  const { catalog, logEvent } = useLog();
  const events = [...catalog.events].sort((a, b) => b.date.localeCompare(a.date));
  const [eventId, setEventId] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<{ kind: "saved" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const noteId = useId();

  const event = eventId ? catalog.eventById.get(eventId) : undefined;
  const selection = Object.entries(counts).map(([roundId, tickets]) => ({ roundId, tickets }));
  const preview = previewSelection(selection, catalog);

  function pickEvent(next: PublicEvent) {
    setEventId(next.id);
    setCounts({});
    setNote(log.notes[next.id] ?? "");
    setStatus(null);
  }

  function step(roundId: string, delta: number) {
    setStatus(null);
    setCounts((prev) => {
      const value = Math.min(MAX_TICKETS, Math.max(0, (prev[roundId] ?? 0) + delta));
      return { ...prev, [roundId]: value };
    });
  }

  async function save() {
    if (!event || preview.tickets === 0) return;
    setSaving(true);
    try {
      await logEvent(
        event.id,
        selection.filter((s) => s.tickets > 0),
        note,
      );
      setCounts({});
      setStatus({ kind: "saved", text: t.log.saved(event.name) });
    } catch (error) {
      setStatus({
        kind: "error",
        text: error instanceof StorageFullError ? t.storage.full : t.log.saveFailed,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      id="log"
      aria-labelledby="log-title"
      className="scroll-mt-4 rounded-card border border-line bg-surface p-4 sm:p-5"
    >
      <h2 id="log-title" className="text-lg font-extrabold tracking-tight">
        {t.log.title}
      </h2>

      <fieldset className="mt-4">
        <legend className="text-xs font-bold tracking-wide text-muted uppercase">1. {t.log.step1}</legend>
        {events.length === 0 ? (
          <p className="mt-2 text-sm text-muted">{t.log.noEvents}</p>
        ) : (
          <ul className="mt-2 grid gap-2">
            {events.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  aria-pressed={e.id === eventId}
                  onClick={() => pickEvent(e)}
                  className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-line px-3 py-2.5 text-left hover:border-line-strong aria-pressed:border-ink aria-pressed:bg-ground aria-pressed:ring-1 aria-pressed:ring-ink"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold">{e.name}</span>
                    <span className="block text-xs text-muted">
                      {formatDate(e.date, "long")}
                      {e.city && ` · ${e.city}`}
                    </span>
                  </span>
                  {e.scope === "JOINT" ? (
                    <span className="shrink-0 rounded-full bg-track px-2 py-0.5 text-[11px] font-bold text-body-2">
                      {t.log.joint}
                    </span>
                  ) : (
                    <GroupPill group={e.scope} className="shrink-0" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-muted">{t.log.eventNotListed}</p>
      </fieldset>

      <fieldset className="mt-5" disabled={!event}>
        <legend className="text-xs font-bold tracking-wide text-muted uppercase">2. {t.log.step2}</legend>
        {!event ? (
          <p className="mt-2 text-sm text-muted">{t.log.pickEvent}</p>
        ) : (
          <ul className="mt-2 grid gap-2">
            {[...event.rounds]
              .sort((a, b) => a.position - b.position)
              .map((round) => {
                const label = roundLabel(round);
                const value = counts[round.id] ?? 0;
                const lineup = lineupOf(round, catalog);
                const existing = log.entries.find((x) => x.roundId === round.id)?.tickets ?? 0;
                return (
                  <li
                    key={round.id}
                    className={`rounded-xl border p-3 ${value > 0 ? "border-ink bg-ground" : "border-line"}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold">{label}</p>
                        {lineup.length === 0 ? (
                          <p className="mt-1 text-xs text-muted">{t.log.emptyLineup}</p>
                        ) : (
                          <ul className="mt-1 flex flex-wrap gap-1" aria-label={t.log.lineupLabel(label)}>
                            {lineup.map((m) => (
                              <li
                                key={m.id}
                                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${groupClasses[m.group].tint} ${groupClasses[m.group].text}`}
                              >
                                {m.nickname}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <Stepper
                        label={label}
                        value={value}
                        onStep={(d) => step(round.id, d)}
                        disabled={lineup.length === 0}
                      />
                    </div>
                    {existing > 0 && (
                      <p className="mt-2 text-xs text-body-2">
                        {t.log.alreadyLogged(label, existing, value)}
                      </p>
                    )}
                  </li>
                );
              })}
          </ul>
        )}
      </fieldset>

      <div className="mt-5">
        <label htmlFor={noteId} className="text-xs font-bold tracking-wide text-muted uppercase">
          3. {t.log.step3}
        </label>
        <textarea
          id={noteId}
          value={note}
          disabled={!event}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t.log.notePlaceholder}
          rows={2}
          maxLength={500}
          className="mt-2 w-full resize-y rounded-[10px] border border-line-strong bg-surface px-3 py-2 text-sm placeholder:text-muted disabled:bg-ground"
        />
      </div>

      <p aria-live="polite" className="mt-4 rounded-xl bg-ground px-3 py-2.5 text-sm font-semibold">
        {preview.tickets > 0
          ? t.log.preview(preview.tickets, preview.meetings, preview.members)
          : t.log.previewEmpty}
      </p>

      <button
        type="button"
        onClick={save}
        disabled={!event || preview.tickets === 0 || saving}
        className="mt-3 min-h-11 w-full rounded-xl bg-ink px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        {t.log.save}
      </button>

      <p
        role={status?.kind === "error" ? "alert" : "status"}
        className={`mt-2 min-h-5 text-sm ${status?.kind === "error" ? "text-[#B42318]" : "text-cgm-accent"}`}
      >
        {status?.text}
      </p>
    </section>
  );
}

function Stepper({
  label,
  value,
  onStep,
  disabled,
}: {
  label: string;
  value: number;
  onStep: (delta: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <button
        type="button"
        onClick={() => onStep(-1)}
        disabled={disabled || value === 0}
        aria-label={t.log.decrease(label)}
        className="flex h-11 w-11 items-center justify-center rounded-[10px] border border-line-strong bg-surface disabled:opacity-35"
      >
        <Minus size={16} aria-hidden="true" />
      </button>
      <output
        aria-label={t.log.ticketsFor(label)}
        className="w-8 text-center text-lg font-extrabold tabular-nums"
      >
        {value}
      </output>
      <button
        type="button"
        onClick={() => onStep(1)}
        disabled={disabled || value >= MAX_TICKETS}
        aria-label={t.log.increase(label)}
        className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-ink text-white disabled:opacity-35"
      >
        <Plus size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
