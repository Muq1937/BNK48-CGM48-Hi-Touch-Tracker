"use client";

import { GroupPill } from "@/components/ui";
import type { Summary } from "@/lib/stats";
import { t } from "@/lib/strings";

const n = (v: number) => v.toLocaleString("en");

export function SummaryCards({ summary }: { summary: Summary }) {
  const { BNK48: bnk, CGM48: cgm } = summary.meetingsByGroup;
  const total = bnk + cgm;
  return (
    <section aria-label={t.summary.label} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div className="rounded-card border border-line bg-surface p-4">
        <h2 className="text-xs font-semibold text-muted">{t.summary.memberMeetings}</h2>
        <p className="mt-1 text-3xl font-extrabold tracking-tight">{n(summary.memberMeetings)}</p>
        <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-track" aria-hidden="true">
          {total > 0 && (
            <>
              <div className="bg-bnk-accent" style={{ width: `${(bnk / total) * 100}%` }} />
              <div className="bg-cgm-accent" style={{ width: `${(cgm / total) * 100}%` }} />
            </>
          )}
        </div>
        <dl className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-semibold">
          <div className="flex gap-1 text-bnk-accent">
            <dt>BNK48</dt>
            <dd>{n(bnk)}</dd>
          </div>
          <div className="flex gap-1 text-cgm-accent">
            <dt>CGM48</dt>
            <dd>{n(cgm)}</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-card border border-line bg-surface p-4">
        <h2 className="text-xs font-semibold text-muted">{t.summary.ticketsUsed}</h2>
        <p className="mt-1 text-3xl font-extrabold tracking-tight">{n(summary.ticketsUsed)}</p>
        <p className="mt-2 text-xs text-muted">{t.summary.acrossEvents(summary.eventsAttended)}</p>
      </div>

      <div className="rounded-card border border-line bg-surface p-4">
        <h2 className="text-xs font-semibold text-muted">{t.summary.membersMet}</h2>
        <p className="mt-1 text-3xl font-extrabold tracking-tight">
          {n(summary.membersMet)}
          <span className="text-lg font-bold text-muted"> / {n(summary.rosterSize)}</span>
        </p>
        <p className="mt-2 text-xs text-muted">{t.summary.ofRoster(summary.rosterSize)}</p>
      </div>

      <div className="rounded-card bg-ink p-4 text-white">
        <h2 className="text-xs font-semibold text-white/75">{t.summary.mostMet}</h2>
        {summary.mostMet ? (
          <>
            <p className="mt-1 truncate text-2xl font-extrabold tracking-tight">
              {summary.mostMet.member.nickname}
            </p>
            <p className="mt-2 flex items-center gap-2 text-xs text-white/80">
              <GroupPill group={summary.mostMet.member.group} />
              {t.summary.mostMetTimes(summary.mostMet.timesMet)}
            </p>
          </>
        ) : (
          <>
            <p className="mt-1 text-2xl font-extrabold tracking-tight">{t.summary.nobodyYet}</p>
            <p className="mt-2 text-xs text-white/80">{t.summary.logToStart}</p>
          </>
        )}
      </div>
    </section>
  );
}
