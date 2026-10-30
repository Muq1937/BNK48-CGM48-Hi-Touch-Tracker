import type { AdminData } from "@/lib/admin/data";
import { AdminEventList } from "./AdminEventList";
import { EventBuilder } from "./EventBuilder";

/** Events sidebar plus the builder for one event (or a new one when `eventId` is null). */
export function EventsWorkspace({ data, eventId }: { data: AdminData; eventId: string | null }) {
  const event = eventId ? (data.events.find((e) => e.id === eventId) ?? null) : null;
  return (
    <div className="grid gap-5 lg:grid-cols-[17rem_minmax(0,1fr)] lg:items-start">
      <AdminEventList events={data.events} currentId={event?.id ?? null} />
      {/* Remount after each save (updatedAt changes) so saved round ids replace the drafts. */}
      <EventBuilder
        key={event ? `${event.id}:${event.updatedAt}` : "new"}
        event={event}
        members={data.members}
      />
    </div>
  );
}
