import { notFound } from "next/navigation";
import { EventsWorkspace } from "@/components/admin/EventsWorkspace";
import { getAdminData } from "@/lib/admin/data";

export default async function AdminEventPage({ params }: PageProps<"/admin/events/[id]">) {
  const [{ id }, data] = await Promise.all([params, getAdminData()]);
  if (!data.events.some((e) => e.id === id)) notFound();
  return <EventsWorkspace data={data} eventId={id} />;
}
