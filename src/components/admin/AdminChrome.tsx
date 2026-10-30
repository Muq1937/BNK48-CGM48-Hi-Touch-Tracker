"use client";

import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { t } from "@/lib/strings";

const FlashContext = createContext<(message: string) => void>(() => {});

/** Show a short success message that survives the navigation after a save. */
export const useFlash = () => useContext(FlashContext);

/** Admin heading, section tabs and the shared status line. Rendered only after the admin check. */
export function AdminChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [message, setMessage] = useState("");
  const flash = useCallback((next: string) => setMessage(next), []);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 6000);
    return () => clearTimeout(timer);
  }, [message]);

  const tabs = [
    {
      href: "/admin",
      label: t.admin.tabEvents,
      active: pathname === "/admin" || pathname.startsWith("/admin/events"),
    },
    { href: "/admin/members", label: t.admin.tabRoster, active: pathname.startsWith("/admin/members") },
  ];

  return (
    <FlashContext value={flash}>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-admin text-ink">
            <ShieldCheck size={18} aria-hidden="true" />
          </span>
          {t.admin.title}
        </h1>
        <nav aria-label={t.admin.tabsLabel}>
          <ul className="flex gap-1">
            {tabs.map((tab) => (
              <li key={tab.href}>
                <Link
                  href={tab.href}
                  aria-current={tab.active ? "page" : undefined}
                  className="inline-flex min-h-11 items-center rounded-[10px] px-4 text-sm font-bold text-body-2 hover:bg-surface aria-[current=page]:bg-ink aria-[current=page]:text-white"
                >
                  {tab.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <p role="status" className="text-sm font-semibold text-cgm-accent sm:ml-auto">
          {message}
        </p>
      </div>
      <div className="mt-5">{children}</div>
    </FlashContext>
  );
}
