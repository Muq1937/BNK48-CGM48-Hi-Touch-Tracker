import { ShieldCheck, Ticket } from "lucide-react";
import Link from "next/link";
import { t } from "@/lib/strings";

/** Who is looking. Only guests exist until M2; admin UI is never rendered for non-admins. */
export type Viewer = { kind: "guest" } | { kind: "user"; displayName: string; isAdmin: boolean };

const NAV = [
  { href: "/", label: t.nav.dashboard },
  { href: "/#members", label: t.nav.members },
  { href: "/#log", label: t.nav.events },
  { href: "/#history", label: t.nav.history },
];

export function SiteHeader({ viewer }: { viewer: Viewer }) {
  return (
    <header className="bg-ink text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/" className="flex min-h-11 items-center gap-2.5 rounded-lg">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-ink">
            <Ticket size={18} strokeWidth={2.25} aria-hidden="true" />
          </span>
          <span className="text-[15px] font-extrabold tracking-tight">{t.appName}</span>
          <span className="rounded-full border border-white/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/85">
            {t.fanmade}
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-3 md:order-last">
          {viewer.kind === "guest" ? (
            <>
              <span className="rounded-full bg-white/12 px-2.5 py-1 text-xs font-semibold text-white/90">
                {t.header.guest}
              </span>
              <Link
                href="/welcome"
                className="inline-flex min-h-11 items-center rounded-[10px] bg-white px-4 text-sm font-bold text-ink hover:bg-white/90"
              >
                {t.header.signIn}
              </Link>
            </>
          ) : (
            <>
              {viewer.isAdmin && (
                <Link
                  href="/admin"
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-[10px] bg-admin px-3 text-sm font-bold text-ink"
                >
                  <ShieldCheck size={16} aria-hidden="true" />
                  {t.header.admin}
                </Link>
              )}
              <span className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-sm font-bold">
                  {viewer.displayName.slice(0, 1).toUpperCase()}
                </span>
                <span className="leading-tight">
                  <span className="block text-sm font-semibold">{viewer.displayName}</span>
                  <span className="block text-[11px] text-white/75">
                    {viewer.isAdmin ? `${t.header.admin} · ${t.header.synced}` : t.header.synced}
                  </span>
                </span>
              </span>
            </>
          )}
        </div>

        <nav aria-label={t.nav.label} className="-mx-3 w-full overflow-x-auto md:mx-0 md:w-auto">
          <ul className="flex gap-1">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-white/85 hover:bg-white/10 hover:text-white"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      {/* Two-colour stripe: decorative, so the bright tints are allowed here. */}
      <div className="flex h-1" aria-hidden="true">
        <div className="flex-1 bg-bnk-bright" />
        <div className="flex-1 bg-cgm-bright" />
      </div>
    </header>
  );
}
