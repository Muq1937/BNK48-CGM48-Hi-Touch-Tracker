"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";
import { useLog } from "@/components/LogProvider";
import { GroupPill, MemberPhoto, OshiToggle, PhotoCredit, ProfileLink, ProgressBar } from "@/components/ui";
import { groupClasses } from "@/lib/groups";
import type { MemberStanding } from "@/lib/stats";
import { formatDate, t } from "@/lib/strings";
import { GROUPS, type GroupCode } from "@/lib/types";

type Filter = "all" | GroupCode;

export function MembersSection({ standings }: { standings: MemberStanding[] }) {
  const { log, setOshi } = useLog();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const searchId = useId();

  const q = query.trim().toLowerCase();
  const visible = standings.filter(
    ({ member }) =>
      (filter === "all" || member.group === filter) &&
      (!q || member.nickname.toLowerCase().includes(q) || member.fullNameTh?.toLowerCase().includes(q)),
  );
  const top = standings[0]?.timesMet ?? 0;
  const oshi = new Set(log?.oshi ?? []);
  const countFor = (f: Filter) =>
    f === "all" ? standings.length : standings.filter((s) => s.member.group === f).length;

  return (
    <section id="members" aria-labelledby="members-title" className="scroll-mt-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="members-title" className="text-lg font-extrabold tracking-tight">
          {t.members.title}
        </h2>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <div role="group" aria-label={t.members.filterLabel} className="flex rounded-xl bg-track p-1">
            {(["all", ...GROUPS] as Filter[]).map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={filter === f}
                onClick={() => setFilter(f)}
                className="min-h-11 rounded-[10px] px-3 text-sm font-semibold text-body-2 aria-pressed:bg-surface aria-pressed:text-ink aria-pressed:shadow-sm"
              >
                {f === "all" ? t.members.all : f}{" "}
                <span className="font-medium text-muted">{countFor(f)}</span>
              </button>
            ))}
          </div>
          <div className="relative min-w-0 flex-1 sm:w-52 sm:flex-none">
            <label htmlFor={searchId} className="sr-only">
              {t.members.searchLabel}
            </label>
            <Search
              size={16}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
              aria-hidden="true"
            />
            <input
              id={searchId}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.members.searchPlaceholder}
              className="min-h-11 w-full rounded-[10px] border border-line-strong bg-surface pr-3 pl-9 text-sm placeholder:text-muted"
            />
          </div>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="mt-4 rounded-card border border-dashed border-line-strong p-6 text-center text-sm text-muted">
          {t.members.noMatch}
        </p>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {visible.map((s) => (
            <li key={s.member.id}>
              <MemberCard
                standing={s}
                top={top}
                oshi={oshi.has(s.member.id)}
                onOshi={(on) => setOshi(s.member.id, on).catch(() => {})}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function MemberCard({
  standing: { member, timesMet, lastMet },
  top,
  oshi,
  onOshi,
}: {
  standing: MemberStanding;
  top: number;
  oshi: boolean;
  onOshi: (on: boolean) => void;
}) {
  const c = groupClasses[member.group];
  return (
    <article className="flex h-full flex-col rounded-card border border-line bg-surface p-4">
      <div className="flex gap-3">
        <MemberPhoto member={member} width={64} height={80} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-base font-extrabold tracking-tight">{member.nickname}</h3>
            <OshiToggle member={member} on={oshi} onChange={onOshi} />
          </div>
          {member.fullNameTh && <p className="truncate text-xs text-muted">{member.fullNameTh}</p>}
          <GroupPill group={member.group} className="mt-1" />
          <div>
            <ProfileLink member={member} className={c.text} />
          </div>
          <PhotoCredit member={member} />
        </div>
      </div>

      <div className="perforation my-4" aria-hidden="true" />

      <div className="mt-auto flex items-end justify-between gap-2">
        <p className="leading-none">
          <span className="text-3xl font-extrabold tracking-tight">{timesMet}</span>{" "}
          <span className="text-xs text-muted">
            {t.members.times(timesMet)} · {lastMet ? t.members.last(formatDate(lastMet)) : t.members.notYet}
          </span>
        </p>
        <Link
          href={`/members/${member.slug}`}
          aria-label={t.members.historyLabel(member.nickname)}
          className={`-my-2 inline-flex min-h-11 items-center text-sm font-bold ${c.text} underline-offset-2 hover:underline`}
        >
          {t.members.history}
        </Link>
      </div>
      <div className="mt-3">
        <ProgressBar
          value={timesMet}
          max={top}
          className={c.bg}
          label={t.members.progressLabel(member.nickname, timesMet)}
        />
      </div>
    </article>
  );
}
