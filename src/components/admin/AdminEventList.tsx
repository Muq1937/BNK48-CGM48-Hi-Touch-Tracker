import { Plus } from "lucide-react";
import Link from "next/link";
import type { AdminEvent } from "@/lib/admin/data";
import { formatDate, t } from "@/lib/strings";

/** Sidebar: every event, drafts included, with how many fans logged it. */
export function AdminEventList({ events, currentId }: { events: AdminEvent[]; currentId: string | null }) {
  return (
    <nav aria-labelledby="admin-events-title" className="rounded-card border border-line bg-surface p-3">
      <div className="flex items-center justify-between gap-2 px-1">
        <h2 id="admin-events-title" className="font-extrabold">
          {t.admin.events.title}
        </h2>
        <Link
          href="/admin"
          aria-current={currentId === null ? "page" : undefined}
          className="inline-flex min-h-11 items-center gap-1 rounded-[10px] bg-ink px-3 text-sm font-bold text-white"
        >
          <Plus size={16} aria-hidden="true" />
          {t.admin.events.newEvent}
        </Link>
      </div>
      {events.length === 0 ? (
        <p className="mt-3 px-1 text-sm text-muted">{t.admin.events.empty}</p>
      ) : (
        <ul className="mt-3 grid gap-1">
          {events.map((event) => (
            <li key={event.id}>
              <Link
                href={`/admin/events/${event.id}`}
                aria-current={event.id === currentId ? "page" : undefined}
                className="block rounded-[10px] px-3 py-2.5 hover:bg-ground aria-[current=page]:bg-ground aria-[current=page]:ring-1 aria-[current=page]:ring-ink"
              >
                <span className="block text-sm font-bold">{event.name}</span>
                <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                  <span>{formatDate(event.date, "long")}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 font-bold ${
                      event.status === "published" ? "bg-cgm-tint text-cgm-accent" : "bg-track text-body-2"
                    }`}
                  >
                    {event.status === "published" ? t.admin.events.published : t.admin.events.draft}
                  </span>
                  <span>{t.admin.events.fans(event.fans)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}
