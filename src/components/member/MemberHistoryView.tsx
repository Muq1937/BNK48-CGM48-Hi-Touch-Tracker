"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { useLog } from "@/components/LogProvider";
import { GroupPill, MemberPhoto, OshiToggle, PhotoCredit, ProfileLink } from "@/components/ui";
import { groupClasses } from "@/lib/groups";
import { memberHistory, monthlyCounts } from "@/lib/stats";
import { formatDate, formatMonth, t } from "@/lib/strings";
import { roundLabel, type PublicMember } from "@/lib/types";

export function MemberHistoryView({ memberId }: { memberId: string }) {
  const { catalog, log, setOshi } = useLog();
  const member = catalog.memberById.get(memberId)!;
  const c = groupClasses[member.group];

  const data = useMemo(
    () =>
      log && {
        history: memberHistory(memberId, log, catalog)!,
        months: monthlyCounts(memberId, log.entries, catalog),
      },
    [memberId, log, catalog],
  );

  return (
    <main className="mx-auto w-full max-w-xl">
      <div className={`${c.bg} text-white`}>
        <div className="flex items-center justify-between px-2 py-2">
          <Link
            href="/"
            aria-label={t.memberPage.back}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/15"
          >
            <ChevronLeft size={22} aria-hidden="true" />
          </Link>
          <p className="text-sm font-bold">{member.nickname}</p>
          <span className="inline-flex h-11 w-11 items-center justify-center">
            <OshiToggle
              member={member}
              on={log?.oshi.includes(member.id) ?? false}
              onChange={(on) => setOshi(member.id, on).catch(() => {})}
              disabled={!log}
              tone="dark"
            />
          </span>
        </div>
      </div>

      <div className="px-4">
        <div className="flex items-end gap-4 pt-5">
          <MemberPhoto member={member} width={84} height={104} />
          <div className="min-w-0 pb-1">
            <h1 className="truncate text-2xl font-extrabold tracking-tight">{member.nickname}</h1>
            {member.fullNameTh && <p className="text-sm text-muted">{member.fullNameTh}</p>}
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <GroupPill group={member.group} />
              <ProfileLink member={member} className={c.text} />
            </div>
            <PhotoCredit member={member} />
          </div>
        </div>

        {!data ? (
          <p role="status" className="py-16 text-center text-sm text-muted">
            {t.storage.loading}
          </p>
        ) : (
          <>
            <dl className="mt-5 grid grid-cols-3 divide-x divide-track rounded-card border border-line bg-surface py-3 text-center">
              <Stat label={t.memberPage.timesMet} value={String(data.history.timesMet)} />
              <Stat label={t.memberPage.events} value={String(data.history.events)} />
              <Stat
                label={t.memberPage.rank}
                value={data.history.rank ? `#${data.history.rank}` : t.memberPage.noRank}
              />
            </dl>

            <MonthChart member={member} months={data.months} />

            <section aria-labelledby="rounds-title" className="mt-6">
              <h2 id="rounds-title" className="text-base font-extrabold tracking-tight">
                {t.memberPage.everyRound(member.nickname)}
              </h2>
              {data.history.rounds.length === 0 ? (
                <p className="mt-3 rounded-card border border-dashed border-line-strong p-5 text-center text-sm text-muted">
                  {t.memberPage.none(member.nickname)}
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-track rounded-card border border-line bg-surface">
                  {data.history.rounds.map((r) => (
                    <li key={r.round.id} className="flex gap-3 p-4">
                      <time dateTime={r.event.date} className="w-14 shrink-0 text-xs font-bold text-muted">
                        {formatDate(r.event.date)}
                      </time>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold">
                          {r.event.name} · {roundLabel(r.round)}
                        </p>
                        <p className="text-xs text-muted">
                          {[
                            r.event.city,
                            r.others.length
                              ? t.memberPage.with(r.others.map((o) => o.nickname).join(", "))
                              : t.memberPage.solo,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                        {r.note && <p className="mt-1 text-xs text-body-2">{r.note}</p>}
                      </div>
                      <span className="shrink-0 text-base font-extrabold tabular-nums">
                        {t.memberPage.tickets(r.tickets)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>

      <div className="sticky bottom-0 mt-6 border-t border-line bg-ground/95 p-3 backdrop-blur">
        <div className="mx-auto max-w-xl">
          <Link
            href="/#log"
            className="flex min-h-12 w-full items-center justify-center rounded-xl bg-ink px-4 text-sm font-bold text-white"
          >
            {t.memberPage.cta(member.nickname)}
          </Link>
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col-reverse">
      <dt className="text-xs font-semibold text-muted">{label}</dt>
      <dd className="text-2xl font-extrabold tracking-tight">{value}</dd>
    </div>
  );
}

/** Single-series bar chart: one hue (the group accent), values labelled directly, table for screen readers. */
function MonthChart({
  member,
  months,
}: {
  member: PublicMember;
  months: { month: string; count: number }[];
}) {
  const max = Math.max(1, ...months.map((m) => m.count));
  const c = groupClasses[member.group];
  const caption = t.memberPage.byMonthLabel(member.nickname);
  return (
    <section aria-labelledby="by-month-title" className="mt-4 rounded-card border border-line bg-surface p-4">
      <h2 id="by-month-title" className="text-sm font-extrabold">
        {t.memberPage.byMonth}
      </h2>
      <div className="mt-3 flex h-32 items-end gap-3 border-b border-line-strong" aria-hidden="true">
        {months.map((m) => (
          <div key={m.month} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
            <span className="text-xs font-bold text-body-2 tabular-nums">{m.count > 0 ? m.count : ""}</span>
            <div
              className={`w-full max-w-10 rounded-t-[4px] ${c.bg}`}
              style={{ height: `${(m.count / max) * 80}%`, minHeight: m.count > 0 ? 4 : 0 }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-3" aria-hidden="true">
        {months.map((m) => (
          <span key={m.month} className="flex-1 text-center text-[11px] font-semibold text-muted">
            {formatMonth(m.month)}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{t.memberPage.month}</th>
            <th scope="col">{t.memberPage.timesMet}</th>
          </tr>
        </thead>
        <tbody>
          {months.map((m) => (
            <tr key={m.month}>
              <th scope="row">{formatMonth(m.month)}</th>
              <td>{m.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
