"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useLog } from "@/components/LogProvider";
import { groupClasses } from "@/lib/groups";
import { browserStorage } from "@/lib/guestStore";
import {
  conflictKey,
  isNoOp,
  planMerge,
  restrictToCatalog,
  unresolved,
  type MergePlan,
  type Resolutions,
} from "@/lib/merge";
import { LocalLogRepository } from "@/lib/repository";
import { memberStandings, summarize } from "@/lib/stats";
import { t } from "@/lib/strings";
import { roundLabel, type UserLog } from "@/lib/types";

type Phase = "choose" | "conflicts" | "working" | "done" | "error";

const hasData = (log: UserLog) =>
  log.entries.length > 0 || log.oshi.length > 0 || Object.keys(log.notes).length > 0;

export function MergeView() {
  const router = useRouter();
  const { account, log: accountLog, mode, catalog, merge } = useLog();
  const [guest, setGuest] = useState<{ repo: LocalLogRepository; log: UserLog } | null>(null);
  const [choice, setChoice] = useState<"merge" | "keep">("merge");
  const [phase, setPhase] = useState<Phase>("choose");
  const [plan, setPlan] = useState<MergePlan | null>(null);
  const [resolutions, setResolutions] = useState<Resolutions>({});

  useEffect(() => {
    const repo = new LocalLogRepository(browserStorage());
    // Only what the account can hold; anything else stays on the device untouched.
    void repo.load().then(({ log }) => setGuest({ repo, log: restrictToCatalog(log, catalog) }));
  }, [catalog]);

  // Nothing to ask? Move on.
  useEffect(() => {
    if (!guest || !accountLog || phase !== "choose") return;
    if (mode === "guest") router.replace("/welcome");
    else if (!hasData(guest.log) || isNoOp(planMerge(guest.log, accountLog))) router.replace("/");
  }, [guest, accountLog, mode, phase, router]);

  const summary = useMemo(() => {
    if (!guest) return null;
    const s = summarize(guest.log.entries, catalog);
    const met = memberStandings(guest.log.entries, catalog).filter((m) => m.timesMet > 0);
    return { ...s, top: met.slice(0, 3), more: Math.max(0, met.length - 3) };
  }, [guest, catalog]);

  async function apply(p: MergePlan, res: Resolutions) {
    if (!guest) return;
    setPhase("working");
    try {
      await merge(p, res);
      await guest.repo.markMerged();
      setPhase("done");
      router.replace("/");
    } catch {
      setPhase("error");
    }
  }

  function onContinue(e: React.FormEvent) {
    e.preventDefault();
    if (!guest || !accountLog) return;
    if (choice === "keep") {
      router.replace("/");
      return;
    }
    const p = planMerge(guest.log, accountLog);
    if (p.conflicts.length > 0) {
      setPlan(p);
      setPhase("conflicts");
    } else {
      void apply(p, {});
    }
  }

  if (!account || !guest || !accountLog || !summary) {
    return (
      <main className="mx-auto w-full max-w-md px-6 py-16 text-center text-sm text-muted" role="status">
        {t.storage.loading}
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-md px-6 pt-8 pb-10">
      <span
        aria-hidden="true"
        className="flex h-13 w-13 items-center justify-center rounded-full bg-bnk-tint text-xl font-extrabold text-bnk-accent"
      >
        {account.displayName.slice(0, 1).toUpperCase()}
      </span>
      <h1 className="mt-3 text-[28px] leading-tight font-extrabold tracking-tight">
        {t.merge.welcome(account.displayName)}
      </h1>
      <p className="mt-2 text-[15px] leading-relaxed text-body-2">{t.merge.found}</p>

      <section className="mt-5 rounded-card border border-line bg-surface p-4" aria-labelledby="on-device">
        <h2 id="on-device" className="text-xs font-bold tracking-wider text-muted uppercase">
          {t.merge.onDevice}
        </h2>
        <dl className="mt-3 grid grid-cols-3 gap-2">
          <Stat value={summary.eventsAttended} label={t.merge.events} />
          <Stat value={summary.ticketsUsed} label={t.merge.tickets} />
          <Stat value={summary.membersMet} label={t.merge.membersMet} />
        </dl>
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {summary.top.map(({ member, timesMet }) => (
            <li
              key={member.id}
              className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${groupClasses[member.group].tint} ${groupClasses[member.group].text}`}
            >
              {member.nickname} ×{timesMet}
            </li>
          ))}
          {summary.more > 0 && (
            <li className="rounded-full bg-track px-2.5 py-0.5 text-xs font-bold">
              {t.merge.more(summary.more)}
            </li>
          )}
        </ul>
      </section>

      {phase === "conflicts" && plan ? (
        <section className="mt-5" aria-labelledby="conflicts-title">
          <h2 id="conflicts-title" className="text-sm font-bold">
            {t.merge.conflictsTitle}
          </h2>
          <p className="mt-1 text-sm text-body-2">{t.merge.conflictsBody}</p>
          <ul className="mt-3 grid gap-3">
            {plan.conflicts.map((c) => {
              const key = conflictKey(c);
              const event = catalog.eventById.get(c.eventId);
              const round = c.kind === "round" ? catalog.roundById.get(c.roundId)?.round : undefined;
              const title =
                c.kind === "round"
                  ? `${event?.name ?? t.backup.unknownEvent} · ${round ? roundLabel(round) : t.backup.unknownRound}`
                  : t.backup.conflictNote(event?.name ?? t.backup.unknownEvent);
              const fmt = (v: string | number) => (typeof v === "number" ? t.sessions.tickets(v) : `“${v}”`);
              return (
                <li key={key}>
                  <fieldset className="rounded-[14px] border border-line bg-surface p-3">
                    <legend className="px-1 text-sm font-bold">{title}</legend>
                    {(["existing", "incoming"] as const).map((side) => (
                      <label key={side} className="flex min-h-11 items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name={key}
                          checked={resolutions[key] === side}
                          onChange={() => setResolutions((prev) => ({ ...prev, [key]: side }))}
                          className="h-5 w-5 accent-ink"
                        />
                        {side === "existing"
                          ? t.merge.keepAccount(fmt(c.existing))
                          : t.merge.keepDevice(fmt(c.incoming))}
                      </label>
                    ))}
                  </fieldset>
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            onClick={() => apply(plan, resolutions)}
            disabled={unresolved(plan, resolutions).length > 0}
            className="mt-4 min-h-[52px] w-full rounded-[14px] bg-ink text-[15px] font-bold text-white disabled:opacity-40"
          >
            {t.merge.continue}
          </button>
        </section>
      ) : (
        <form onSubmit={onContinue} className="mt-5">
          <fieldset className="grid gap-2.5">
            <legend className="mb-2.5 text-sm font-bold">{t.merge.question}</legend>
            <Option
              checked={choice === "merge"}
              onChange={() => setChoice("merge")}
              title={t.merge.add}
              badge={t.merge.recommended}
              body={t.merge.addBody}
            />
            <Option
              checked={choice === "keep"}
              onChange={() => setChoice("keep")}
              title={t.merge.notNow}
              body={t.merge.notNowBody}
            />
          </fieldset>
          <button
            type="submit"
            disabled={phase === "working" || phase === "done"}
            className="mt-5 min-h-[52px] w-full rounded-[14px] bg-ink text-[15px] font-bold text-white disabled:opacity-40"
          >
            {phase === "working" ? t.merge.working : t.merge.continue}
          </button>
        </form>
      )}

      <p
        role={phase === "error" ? "alert" : "status"}
        className={`mt-3 text-center text-sm ${phase === "error" ? "text-[#B42318]" : "text-muted"}`}
      >
        {phase === "error" ? t.merge.failed : phase === "done" ? t.merge.done : t.merge.keepNote}
      </p>
      {phase === "error" && (
        <p className="mt-2 text-center text-sm">
          <Link href="/settings" className="font-bold underline underline-offset-2">
            {t.settings.title}
          </Link>
        </p>
      )}
    </main>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col-reverse">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-2xl font-extrabold">{value.toLocaleString("en")}</dd>
    </div>
  );
}

function Option({
  checked,
  onChange,
  title,
  badge,
  body,
}: {
  checked: boolean;
  onChange: () => void;
  title: string;
  badge?: string;
  body: string;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-[14px] bg-surface p-3.5 ${checked ? "border-2 border-ink" : "border border-line"}`}
    >
      <input
        type="radio"
        name="merge-choice"
        checked={checked}
        onChange={onChange}
        className="mt-0.5 h-5 w-5 accent-ink"
      />
      <span className="grid gap-1">
        <span className="text-[15px] font-bold">
          {title}{" "}
          {badge && (
            <span className="rounded-full bg-ground px-1.5 py-0.5 text-[11px] font-bold">{badge}</span>
          )}
        </span>
        <span className="text-[13px] leading-snug text-body-2">{body}</span>
      </span>
    </label>
  );
}
