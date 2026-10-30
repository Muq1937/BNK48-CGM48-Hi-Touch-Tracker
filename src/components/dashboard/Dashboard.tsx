"use client";

import { useMemo } from "react";
import { useLog } from "@/components/LogProvider";
import { memberStandings, sessions, summarize } from "@/lib/stats";
import { t } from "@/lib/strings";
import { GuestBanner } from "./Backup";
import { LogPanel } from "./LogPanel";
import { MembersSection } from "./MembersSection";
import { RecentSessions } from "./RecentSessions";
import { SummaryCards } from "./SummaryCards";

export function Dashboard() {
  const { log, catalog, mode, health, storageFull, loadFailed } = useLog();

  const derived = useMemo(
    () =>
      log && {
        summary: summarize(log.entries, catalog),
        standings: memberStandings(log.entries, catalog),
        sessions: sessions(log, catalog),
      },
    [log, catalog],
  );

  if (!log || !derived) {
    return loadFailed ? (
      <p role="alert" className="rounded-card border border-admin bg-[#FFF6DD] p-4 text-sm text-ink">
        {t.storage.accountLoadFailed}
      </p>
    ) : (
      <p role="status" className="py-16 text-center text-sm text-muted">
        {t.storage.loading}
      </p>
    );
  }

  return (
    <div className="grid gap-6">
      {(health !== "ok" || storageFull) && (
        <p role="alert" className="rounded-card border border-admin bg-[#FFF6DD] p-4 text-sm text-ink">
          {storageFull
            ? t.storage.full
            : health === "unavailable"
              ? t.storage.unavailable
              : t.storage.recovered}
        </p>
      )}
      {mode === "guest" && <GuestBanner />}
      <SummaryCards summary={derived.summary} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="grid gap-8">
          <MembersSection standings={derived.standings} />
          <RecentSessions sessions={derived.sessions} />
        </div>
        {/* On mobile the log panel stacks under the content; the hero button jumps to it. */}
        <div className="lg:sticky lg:top-4">
          <LogPanel log={log} />
        </div>
      </div>
    </div>
  );
}
