"use client";

import { Download, Upload } from "lucide-react";
import Link from "next/link";
import { useId, useRef, useState } from "react";
import { useLog } from "@/components/LogProvider";
import { backupFileName, exportCsv, exportJson, parseBackup } from "@/lib/backup";
import { toUserLog } from "@/lib/guestStore";
import { conflictKey, isNoOp, planMerge, unresolved, type MergePlan, type Resolutions } from "@/lib/merge";
import { StorageFullError } from "@/lib/repository";
import { t } from "@/lib/strings";
import { roundLabel } from "@/lib/types";

function download(text: string, fileName: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function GuestBanner() {
  const { log, catalog } = useLog();
  const dialogRef = useRef<HTMLDialogElement>(null);
  if (!log) return null;

  const exportBackup = () =>
    download(exportJson({ version: 1, ...log }), backupFileName("json", new Date()), "application/json");
  const exportSheet = () =>
    download(exportCsv(log.entries, log.notes, catalog), backupFileName("csv", new Date()), "text/csv");

  const secondary =
    "inline-flex min-h-11 items-center gap-1.5 rounded-[10px] border border-line-strong bg-surface px-3 text-sm font-bold hover:bg-ground";

  return (
    <section
      aria-label={t.guestBanner.title}
      className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4 md:flex-row md:items-center md:justify-between"
    >
      <p className="text-sm text-body-2">
        <strong className="text-ink">{t.guestBanner.title}</strong> {t.guestBanner.body}
      </p>
      <div className="flex shrink-0 flex-wrap gap-2">
        <button type="button" onClick={exportBackup} className={secondary}>
          <Download size={16} aria-hidden="true" />
          {t.guestBanner.export}
        </button>
        <button type="button" onClick={exportSheet} className={secondary}>
          {t.guestBanner.exportCsv}
        </button>
        <button type="button" onClick={() => dialogRef.current?.showModal()} className={secondary}>
          <Upload size={16} aria-hidden="true" />
          {t.guestBanner.import}
        </button>
        <Link
          href="/welcome"
          className="inline-flex min-h-11 items-center rounded-[10px] bg-ink px-3 text-sm font-bold text-white"
        >
          {t.guestBanner.signIn}
        </Link>
      </div>
      <ImportDialog dialogRef={dialogRef} />
    </section>
  );
}

function ImportDialog({ dialogRef }: { dialogRef: React.RefObject<HTMLDialogElement | null> }) {
  const { log, catalog, merge } = useLog();
  const fileId = useId();
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<MergePlan | null>(null);
  const [choices, setChoices] = useState<Resolutions>({});
  const [done, setDone] = useState(false);

  function reset() {
    setError(null);
    setPlan(null);
    setChoices({});
    setDone(false);
  }

  async function onFile(file: File | undefined) {
    reset();
    if (!file || !log) return;
    const parsed = parseBackup(await file.text());
    if (!parsed.ok) {
      setError(parsed.error === "json" ? t.backup.badJson : t.backup.badFormat);
      return;
    }
    setPlan(planMerge(toUserLog(parsed.store), log));
  }

  async function apply() {
    if (!plan) return;
    try {
      await merge(plan, choices);
      setPlan(null);
      setDone(true);
    } catch (e) {
      setError(e instanceof StorageFullError ? t.storage.full : String(e));
    }
  }

  const eventName = (id: string) => catalog.eventById.get(id)?.name ?? t.backup.unknownEvent;
  const roundName = (id: string) => {
    const hit = catalog.roundById.get(id);
    return hit ? roundLabel(hit.round) : t.backup.unknownRound;
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={reset}
      aria-labelledby={`${fileId}-title`}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-card border border-line bg-surface p-5 text-ink backdrop:bg-ink/50"
    >
      <h2 id={`${fileId}-title`} className="text-lg font-extrabold">
        {t.backup.importTitle}
      </h2>

      <label htmlFor={fileId} className="mt-4 block text-sm font-semibold">
        {t.backup.chooseFile}
      </label>
      <input
        key={done ? "done" : "pick"}
        id={fileId}
        type="file"
        accept="application/json,.json"
        onChange={(e) => onFile(e.target.files?.[0])}
        className="mt-2 block w-full text-sm file:mr-3 file:min-h-11 file:rounded-[10px] file:border-0 file:bg-ink file:px-3 file:font-bold file:text-white"
      />

      <div aria-live="polite" className="mt-4 text-sm">
        {error && (
          <p role="alert" className="text-[#B42318]">
            {error}
          </p>
        )}
        {done && <p className="font-semibold text-cgm-accent">{t.backup.done}</p>}
        {plan &&
          (isNoOp(plan) ? (
            <p>{t.backup.nothingNew}</p>
          ) : (
            <p>{t.backup.preview(plan.inserts.length, plan.unchanged, plan.conflicts.length)}</p>
          ))}
      </div>

      {plan && plan.conflicts.length > 0 && (
        <ul className="mt-3 grid max-h-72 gap-3 overflow-y-auto">
          {plan.conflicts.map((c) => {
            const key = conflictKey(c);
            const title =
              c.kind === "round"
                ? t.backup.conflictRound(eventName(c.eventId), roundName(c.roundId))
                : t.backup.conflictNote(eventName(c.eventId));
            const fmt = (v: string | number) => (typeof v === "number" ? t.sessions.tickets(v) : `“${v}”`);
            return (
              <li key={key}>
                <fieldset className="rounded-xl border border-line p-3">
                  <legend className="px-1 text-sm font-bold">{title}</legend>
                  {(["incoming", "existing"] as const).map((side) => (
                    <label key={side} className="flex min-h-11 items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name={key}
                        checked={choices[key] === side}
                        onChange={() => setChoices((prev) => ({ ...prev, [key]: side }))}
                        className="h-5 w-5 accent-ink"
                      />
                      {side === "incoming"
                        ? t.backup.keepFile(fmt(c.incoming))
                        : t.backup.keepDevice(fmt(c.existing))}
                    </label>
                  ))}
                </fieldset>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          className="min-h-11 rounded-[10px] border border-line-strong px-4 text-sm font-bold"
        >
          {t.backup.cancel}
        </button>
        <button
          type="button"
          onClick={apply}
          disabled={!plan || isNoOp(plan) || unresolved(plan, choices).length > 0}
          className="min-h-11 rounded-[10px] bg-ink px-4 text-sm font-bold text-white disabled:opacity-40"
        >
          {t.backup.apply}
        </button>
      </div>
    </dialog>
  );
}
