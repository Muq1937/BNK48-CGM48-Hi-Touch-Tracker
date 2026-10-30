"use client";

import type { Session } from "@supabase/supabase-js";
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
import { createClient } from "@/lib/supabase/client";
import { SupabaseLogRepository } from "@/lib/supabase/repository";
import type { PublicEvent, PublicMember, UserLog } from "@/lib/types";

export interface Account {
  userId: string;
  email: string | null;
  displayName: string;
}

interface LogContextValue {
  catalog: Catalog;
  mode: LogRepository["mode"];
  /** Set when signed in. */
  account: Account | null;
  /** Null until the log has been read on the client. */
  log: UserLog | null;
  health: StorageHealth;
  /** Set when the last write failed because storage is full. */
  storageFull: boolean;
  /** Set when the account log could not be loaded. */
  loadFailed: boolean;
  logEvent: LogRepository["logEvent"];
  editEvent: LogRepository["editEvent"];
  setOshi: LogRepository["setOshi"];
  merge: (plan: MergePlan, resolutions: Resolutions) => Promise<UserLog>;
  signOut: () => Promise<void>;
}

const LogContext = createContext<LogContextValue | null>(null);

function toAccount(session: Session | null): Account | null {
  const user = session?.user;
  if (!user) return null;
  const meta = user.user_metadata ?? {};
  const displayName =
    (typeof meta.full_name === "string" && meta.full_name) ||
    (typeof meta.name === "string" && meta.name) ||
    user.email?.split("@")[0] ||
    "Fan";
  return { userId: user.id, email: user.email ?? null, displayName };
}

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
  const [account, setAccount] = useState<Account | null>(null);
  const [log, setLog] = useState<UserLog | null>(null);
  const [health, setHealth] = useState<StorageHealth>("ok");
  const [storageFull, setStorageFull] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  // Storage and the session are only read after mount: client components are prerendered.
  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    const guestRepo = new LocalLogRepository(browserStorage());
    // "unset" until the first session check; then a user id, or null for guest.
    let current: string | null | "unset" = "unset";

    const switchTo = async (repo: LogRepository) => {
      repoRef.current = repo;
      try {
        const result = await repo.load();
        if (cancelled || repoRef.current !== repo) return;
        setLog(result.log);
        setHealth(result.health);
        setLoadFailed(false);
      } catch {
        if (!cancelled && repoRef.current === repo) setLoadFailed(true);
      }
    };

    const applySession = (session: Session | null) => {
      const next = toAccount(session);
      const id = next?.userId ?? null;
      if (id === current) return;
      current = id;
      setAccount(next);
      setLog(null);
      void switchTo(next && supabase ? new SupabaseLogRepository(supabase, next.userId) : guestRepo);
    };

    if (supabase) {
      void supabase.auth.getSession().then(({ data }) => !cancelled && applySession(data.session));
    } else {
      applySession(null);
    }
    // Defer: Supabase advises against awaiting its own calls inside this callback.
    const sub = supabase?.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => !cancelled && applySession(session), 0);
    });

    // Keep guest tabs in sync.
    const onStorage = (event: StorageEvent) => {
      if (event.key === GUEST_STORE_KEY && repoRef.current === guestRepo) void switchTo(guestRepo);
    };
    window.addEventListener("storage", onStorage);
    return () => {
      cancelled = true;
      sub?.data.subscription.unsubscribe();
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const run = useCallback(async (action: (repo: LogRepository) => Promise<UserLog>) => {
    const repo = repoRef.current;
    if (!repo) throw new Error("Log is not loaded yet");
    try {
      const next = await action(repo);
      if (repoRef.current === repo) setLog(next);
      setStorageFull(false);
      return next;
    } catch (error) {
      if (error instanceof StorageFullError) setStorageFull(true);
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    await createClient()?.auth.signOut();
  }, []);

  const value = useMemo<LogContextValue>(
    () => ({
      catalog,
      mode: account ? "account" : "guest",
      account,
      log,
      health,
      storageFull,
      loadFailed,
      logEvent: (eventId, rounds, note) => run((r) => r.logEvent(eventId, rounds, note)),
      editEvent: (eventId, rounds, note) => run((r) => r.editEvent(eventId, rounds, note)),
      setOshi: (memberId, on) => run((r) => r.setOshi(memberId, on)),
      merge: (plan, resolutions) => run((r) => r.merge(plan, resolutions)),
      signOut,
    }),
    [catalog, account, log, health, storageFull, loadFailed, run, signOut],
  );

  return <LogContext.Provider value={value}>{children}</LogContext.Provider>;
}

export function useLog(): LogContextValue {
  const value = useContext(LogContext);
  if (!value) throw new Error("useLog must be used inside <LogProvider>");
  return value;
}
