"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { GUEST_STORE_KEY, browserStorage } from "@/lib/guestStore";
import type { MergePlan, Resolutions } from "@/lib/merge";
import {
  LocalLogRepository,
  StorageFullError,
  type LogRepository,
  type StorageHealth,
} from "@/lib/repository";
import { buildCatalog, type Catalog } from "@/lib/stats";
import type { PublicEvent, PublicMember, UserLog } from "@/lib/types";

interface LogContextValue {
  catalog: Catalog;
  mode: LogRepository["mode"];
  /** Null until the log has been read on the client. */
  log: UserLog | null;
  health: StorageHealth;
  /** Set when the last write failed because storage is full. */
  storageFull: boolean;
  logEvent: LogRepository["logEvent"];
  setOshi: LogRepository["setOshi"];
  merge: (plan: MergePlan, resolutions: Resolutions) => Promise<UserLog>;
}

const LogContext = createContext<LogContextValue | null>(null);

export function LogProvider({
  events,
  members,
  children,
}: {
  events: PublicEvent[];
  members: PublicMember[];
  children: React.ReactNode;
}) {
  const catalog = useMemo(() => buildCatalog(events, members), [events, members]);
  const repoRef = useRef<LogRepository | null>(null);
  const [log, setLog] = useState<UserLog | null>(null);
  const [health, setHealth] = useState<StorageHealth>("ok");
  const [storageFull, setStorageFull] = useState(false);

  // localStorage is only read after mount: client components are prerendered.
  useEffect(() => {
    const repo = new LocalLogRepository(browserStorage());
    repoRef.current = repo;
    let cancelled = false;
    const reload = () =>
      repo.load().then((result) => {
        if (cancelled) return;
        setLog(result.log);
        setHealth(result.health);
      });
    reload();
    // Keep tabs in sync.
    const onStorage = (event: StorageEvent) => {
      if (event.key === GUEST_STORE_KEY) reload();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      cancelled = true;
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const run = useCallback(async (action: (repo: LogRepository) => Promise<UserLog>) => {
    const repo = repoRef.current;
    if (!repo) throw new Error("Log is not loaded yet");
    try {
      const next = await action(repo);
      setLog(next);
      setStorageFull(false);
      return next;
    } catch (error) {
      if (error instanceof StorageFullError) setStorageFull(true);
      throw error;
    }
  }, []);

  const value = useMemo<LogContextValue>(
    () => ({
      catalog,
      mode: "guest",
      log,
      health,
      storageFull,
      logEvent: (eventId, rounds, note) => run((r) => r.logEvent(eventId, rounds, note)),
      setOshi: (memberId, on) => run((r) => r.setOshi(memberId, on)),
      merge: (plan, resolutions) => run((r) => r.merge(plan, resolutions)),
    }),
    [catalog, log, health, storageFull, run],
  );

  return <LogContext.Provider value={value}>{children}</LogContext.Provider>;
}

export function useLog(): LogContextValue {
  const value = useContext(LogContext);
  if (!value) throw new Error("useLog must be used inside <LogProvider>");
  return value;
}
