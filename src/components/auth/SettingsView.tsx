"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useLog } from "@/components/LogProvider";
import { browserStorage } from "@/lib/guestStore";
import { LocalLogRepository } from "@/lib/repository";
import { summarize } from "@/lib/stats";
import { t } from "@/lib/strings";
import type { UserLog } from "@/lib/types";

export function SettingsView() {
  const router = useRouter();
  const { account, catalog, signOut } = useLog();
  const [guest, setGuest] = useState<{
    repo: LocalLogRepository;
    log: UserLog;
    mergedAt: string | null;
  } | null>(null);
  const [removed, setRemoved] = useState(false);

  useEffect(() => {
    const repo = new LocalLogRepository(browserStorage());
    void (async () => {
      const { log } = await repo.load();
      setGuest({ repo, log, mergedAt: await repo.mergedAt() });
    })();
  }, []);

  async function onSignOut() {
    await signOut();
    router.replace("/");
    router.refresh();
  }

  async function onRemove() {
    if (!guest || !window.confirm(t.settings.removeConfirm)) return;
    await guest.repo.clear();
    setGuest({ ...guest, log: { entries: [], notes: {}, oshi: [] }, mergedAt: null });
    setRemoved(true);
  }

  const s = guest ? summarize(guest.log.entries, catalog) : null;
  const hasGuest = !!guest && guest.log.entries.length > 0;
  const button = "inline-flex min-h-11 items-center rounded-[10px] px-4 text-sm font-bold";

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-extrabold tracking-tight">{t.settings.title}</h1>

      <section
        aria-labelledby="account-title"
        className="mt-6 rounded-card border border-line bg-surface p-4"
      >
        <h2 id="account-title" className="font-bold">
          {t.settings.account}
        </h2>
        {account ? (
          <>
            <p className="mt-1 text-sm text-body-2">
              {t.settings.signedInAs(account.displayName, account.email ?? "")}
            </p>
            <button type="button" onClick={onSignOut} className={`${button} mt-3 border border-line-strong`}>
              {t.settings.signOut}
            </button>
            <p className="mt-3 text-sm text-body-2">
              {t.settings.deleteAccount}{" "}
              <Link href="/privacy#your-data" className="font-bold underline underline-offset-2">
                {t.settings.deleteAccountLink}
              </Link>
            </p>
          </>
        ) : (
          <p className="mt-1 text-sm text-body-2">
            {t.settings.signInFirst}{" "}
            <Link href="/welcome" className="font-bold underline underline-offset-2">
              {t.header.signIn}
            </Link>
          </p>
        )}
      </section>

      <section aria-labelledby="guest-title" className="mt-4 rounded-card border border-line bg-surface p-4">
        <h2 id="guest-title" className="font-bold">
          {t.settings.guestLog}
        </h2>
        <p className="mt-1 text-sm text-body-2" role="status">
          {removed
            ? t.settings.removed
            : hasGuest && s
              ? t.settings.guestLogSummary(s.eventsAttended, s.ticketsUsed)
              : t.settings.guestLogEmpty}
        </p>
        {guest?.mergedAt && (
          <p className="mt-1 text-sm text-body-2">{t.settings.mergedAt(guest.mergedAt.slice(0, 10))}</p>
        )}
        {hasGuest && (
          <div className="mt-3 flex flex-wrap gap-2">
            {account && (
              <Link href="/welcome/merge" className={`${button} bg-ink text-white`}>
                {t.settings.addToAccount}
              </Link>
            )}
            <button type="button" onClick={onRemove} className={`${button} border border-line-strong`}>
              {t.settings.removeGuest}
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
