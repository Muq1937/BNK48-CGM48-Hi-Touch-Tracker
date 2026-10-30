"use client";

import { groupClasses } from "@/lib/groups";
import type { Session } from "@/lib/stats";
import { formatDate, t } from "@/lib/strings";
import { roundLabel } from "@/lib/types";

export function RecentSessions({ sessions }: { sessions: Session[] }) {
  return (
    <section id="history" aria-labelledby="history-title" className="scroll-mt-4">
      <h2 id="history-title" className="text-lg font-extrabold tracking-tight">
        {t.sessions.title}
      </h2>
      {sessions.length === 0 ? (
        <p className="mt-4 rounded-card border border-dashed border-line-strong p-6 text-center text-sm text-muted">
          {t.sessions.empty}
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-track rounded-card border border-line bg-surface">
          {sessions.map((s) => (
            <SessionRow key={s.event.id} session={s} />
          ))}
        </ul>
      )}
    </section>
  );
}

function SessionRow({ session }: { session: Session }) {
  const [day, month] = formatDate(session.event.date).split(" ");
  const rounds = session.rounds.map((r) => `${roundLabel(r.round)} ×${r.tickets}`).join(" · ");
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
          <span className="text-sm font-semibold text-body-2">{t.sessions.tickets(session.tickets)}</span>
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
      </div>
    </li>
  );
}
