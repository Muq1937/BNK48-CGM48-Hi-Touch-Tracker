"use client";

import { HardDrive } from "lucide-react";
import Link from "next/link";
import { t } from "@/lib/strings";
import { useLog } from "./LogProvider";

export function SiteFooter() {
  const { mode } = useLog();
  return (
    <footer className="mt-auto border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="max-w-2xl">
          {t.footer.disclaimer}{" "}
          <Link href="/privacy" className="font-semibold text-body-2 underline underline-offset-2">
            {t.footer.privacy}
          </Link>
        </p>
        <p className="flex shrink-0 items-center gap-1.5 font-semibold text-body-2">
          <HardDrive size={14} aria-hidden="true" />
          {mode === "guest" ? t.footer.guestStorage : t.footer.syncedStorage}
        </p>
      </div>
    </footer>
  );
}
